"""
WebSocket endpoints for real-time communication
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Dict, Set, Optional
import json
import logging
import asyncio

from app.core.database import get_db
from app.core.security import decode_token
from app.models.user import User
from app.models.ai_session import AISession
from app.models.message import Message, MessageRole, MessageType
from app.services.ai_service import ai_router as ai_service, AIModel
from app.services.cache_service import cache

logger = logging.getLogger(__name__)

router = APIRouter()


class ConnectionManager:
    def __init__(self):
        # Maps user_id to their WebSocket connections
        self.user_connections: Dict[int, Set[WebSocket]] = {}
        # Maps session_id to set of user_ids (for room-based messaging)
        self.session_rooms: Dict[int, Set[int]] = {}

    async def connect(self, websocket: WebSocket, user_id: int):
        """Connect a user's WebSocket"""
        await websocket.accept()
        if user_id not in self.user_connections:
            self.user_connections[user_id] = set()
        self.user_connections[user_id].add(websocket)
        logger.info(f"User {user_id} connected via WebSocket")

    def disconnect(self, websocket: WebSocket, user_id: int):
        """Disconnect a user's WebSocket"""
        if user_id in self.user_connections:
            self.user_connections[user_id].discard(websocket)
            if not self.user_connections[user_id]:
                del self.user_connections[user_id]
        logger.info(f"User {user_id} disconnected from WebSocket")

    async def join_session(self, user_id: int, session_id: int):
        """Join a user to a session room"""
        if session_id not in self.session_rooms:
            self.session_rooms[session_id] = set()
        self.session_rooms[session_id].add(user_id)
        logger.info(f"User {user_id} joined session {session_id}")

    async def leave_session(self, user_id: int, session_id: int):
        """Remove user from session room"""
        if session_id in self.session_rooms:
            self.session_rooms[session_id].discard(user_id)
            if not self.session_rooms[session_id]:
                del self.session_rooms[session_id]

    async def send_to_user(self, message: dict, user_id: int):
        """Send message to a specific user's all connections"""
        if user_id in self.user_connections:
            message_text = json.dumps(message)
            for connection in self.user_connections[user_id]:
                try:
                    await connection.send_text(message_text)
                except Exception as e:
                    logger.error(f"Error sending to user {user_id}: {e}")

    async def send_to_session(self, message: dict, session_id: int):
        """Send message to all users in a session"""
        if session_id in self.session_rooms:
            message_text = json.dumps(message)
            for user_id in self.session_rooms[session_id]:
                if user_id in self.user_connections:
                    for connection in self.user_connections[user_id]:
                        try:
                            await connection.send_text(message_text)
                        except Exception as e:
                            logger.error(f"Error sending to session {session_id}: {e}")


manager = ConnectionManager()


async def get_current_user_ws(
    websocket: WebSocket,
    token: str = Query(...),
    db: AsyncSession = Depends(get_db)
) -> Optional[User]:
    """Get current user from WebSocket token"""
    try:
        payload = decode_token(token)
        if not payload:
            return None

        user_id = payload.get("sub")
        if not user_id:
            return None

        user = await db.get(User, int(user_id))
        if not user or not user.is_active:
            return None

        return user
    except Exception as e:
        logger.error(f"WebSocket auth error: {e}")
        return None


@router.websocket("/connect")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(...),
    db: AsyncSession = Depends(get_db)
):
    """
    WebSocket endpoint for real-time communication
    Requires authentication token as query parameter
    """
    # Authenticate user
    user = await get_current_user_ws(websocket, token, db)
    if not user:
        await websocket.close(code=1008, reason="Unauthorized")
        return

    await manager.connect(websocket, user.id)
    current_session_id: Optional[int] = None

    try:
        while True:
            # Receive message from client
            data = await websocket.receive_text()

            try:
                message = json.loads(data)
                message_type = message.get("type")

                # Ping/Pong for keepalive
                if message_type == "ping":
                    await websocket.send_json({"type": "pong"})

                # Join a session room
                elif message_type == "join_session":
                    session_id = message.get("session_id")
                    if session_id:
                        # Verify session belongs to user
                        session = await db.get(AISession, session_id)
                        if session and session.user_id == user.id:
                            if current_session_id:
                                await manager.leave_session(user.id, current_session_id)
                            await manager.join_session(user.id, session_id)
                            current_session_id = session_id
                            await websocket.send_json({
                                "type": "joined_session",
                                "session_id": session_id
                            })
                        else:
                            await websocket.send_json({
                                "type": "error",
                                "message": "Session not found or unauthorized"
                            })

                # Send a message (with AI processing)
                elif message_type == "send_message":
                    if not current_session_id:
                        await websocket.send_json({
                            "type": "error",
                            "message": "No active session. Join a session first."
                        })
                        continue

                    content = message.get("content")
                    if not content or not content.strip():
                        await websocket.send_json({
                            "type": "error",
                            "message": "Message content cannot be empty"
                        })
                        continue

                    # Save user message
                    user_message = Message(
                        session_id=current_session_id,
                        user_id=user.id,
                        content=content,
                        role=MessageRole.USER,
                        type=MessageType.TEXT
                    )
                    db.add(user_message)
                    await db.flush()
                    await db.refresh(user_message)

                    # Send confirmation to user
                    await manager.send_to_user({
                        "type": "message_saved",
                        "message": {
                            "id": user_message.id,
                            "content": user_message.content,
                            "role": "user",
                            "created_at": user_message.created_at.isoformat()
                        }
                    }, user.id)

                    # Process AI response in background
                    asyncio.create_task(
                        process_ai_message_ws(
                            db, user, current_session_id, content
                        )
                    )

                # Typing indicator
                elif message_type == "typing":
                    if current_session_id:
                        await manager.send_to_session({
                            "type": "user_typing",
                            "user_id": user.id,
                            "username": user.username
                        }, current_session_id)

                else:
                    await websocket.send_json({
                        "type": "error",
                        "message": f"Unknown message type: {message_type}"
                    })

            except json.JSONDecodeError:
                await websocket.send_json({
                    "type": "error",
                    "message": "Invalid JSON format"
                })
            except Exception as e:
                logger.error(f"WebSocket message handling error: {e}")
                await websocket.send_json({
                    "type": "error",
                    "message": "Internal server error"
                })

    except WebSocketDisconnect:
        manager.disconnect(websocket, user.id)
        if current_session_id:
            await manager.leave_session(user.id, current_session_id)
        logger.info(f"User {user.id} disconnected")


async def process_ai_message_ws(
    db: AsyncSession,
    user: User,
    session_id: int,
    user_message_content: str
):
    """
    Process AI message and send response via WebSocket
    """
    try:
        # Get session
        session = await db.get(AISession, session_id)
        if not session:
            return

        # Get conversation history
        history_query = select(Message).where(
            Message.session_id == session_id
        ).order_by(Message.created_at)

        history_result = await db.execute(history_query)
        messages = history_result.scalars().all()

        # Prepare messages for AI
        ai_messages = []
        for msg in messages[-10:]:  # Last 10 messages
            if msg.role in [MessageRole.USER, MessageRole.ASSISTANT]:
                ai_messages.append({
                    "role": msg.role.value,
                    "content": msg.content
                })

        # Send "AI is thinking" indicator
        await manager.send_to_user({
            "type": "ai_thinking",
            "session_id": session_id
        }, user.id)

        # Generate AI response
        ai_response = await ai_service.generate_completion(
            messages=ai_messages,
            model=AIModel(session.ai_model) if session.ai_model else None,
            temperature=session.temperature / 10.0,
            max_tokens=session.max_tokens,
            task_type="general"
        )

        # Calculate cost
        cost = ai_service.calculate_cost(
            AIModel(ai_response["model"]),
            ai_response["usage"]
        )

        # Save assistant message
        assistant_message = Message(
            session_id=session_id,
            user_id=user.id,
            content=ai_response["content"],
            role=MessageRole.ASSISTANT,
            type=MessageType.TEXT,
            ai_model=ai_response["model"],
            tokens_used=ai_response["usage"]["total_tokens"],
            cost=cost
        )
        db.add(assistant_message)

        # Update session stats
        session.total_messages += 2
        session.total_tokens_used += ai_response["usage"]["total_tokens"]
        session.total_cost += cost

        await db.commit()
        await db.refresh(assistant_message)

        # Invalidate cache for this session and user
        await cache.clear_session_cache(session_id)
        await cache.clear_user_cache(user.id)

        # Send AI response via WebSocket
        await manager.send_to_user({
            "type": "ai_response",
            "message": {
                "id": assistant_message.id,
                "content": assistant_message.content,
                "role": "assistant",
                "ai_model": assistant_message.ai_model,
                "created_at": assistant_message.created_at.isoformat(),
                "cost": cost / 100  # Convert to dollars
            },
            "session_id": session_id
        }, user.id)

    except Exception as e:
        logger.error(f"AI processing error in WebSocket: {e}")
        # Send error to user
        await manager.send_to_user({
            "type": "error",
            "message": f"AI processing failed: {str(e)}",
            "session_id": session_id
        }, user.id)

        # Rollback transaction
        await db.rollback()