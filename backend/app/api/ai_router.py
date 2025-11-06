"""
AI Router API endpoints
"""
from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from slowapi import Limiter
from slowapi.util import get_remote_address
import logging

from app.core.database import get_db
from app.core.security import get_current_user
from app.models import User, AISession, Message, MessageRole, MessageType
from app.services.ai_service import ai_router as ai_service, AIModel
from app.schemas.ai import (
    MessageCreate,
    MessageResponse,
    SessionCreate,
    SessionResponse,
    AICompletionRequest,
    AICompletionResponse
)

router = APIRouter()
logger = logging.getLogger(__name__)
limiter = Limiter(key_func=get_remote_address)


@router.post("/sessions", response_model=SessionResponse)
async def create_session(
    session_data: SessionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Create a new AI session"""
    session = AISession(
        user_id=current_user.id,
        title=session_data.title,
        description=session_data.description,
        ai_model=session_data.ai_model or current_user.preferred_ai_model,
        temperature=int(session_data.temperature * 10),
        max_tokens=session_data.max_tokens
    )
    
    db.add(session)
    await db.commit()
    await db.refresh(session)
    
    return session


@router.get("/sessions", response_model=List[SessionResponse])
async def get_sessions(
    skip: int = 0,
    limit: int = 20,
    active_only: bool = True,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Get user's AI sessions"""
    query = select(AISession).where(AISession.user_id == current_user.id)
    
    if active_only:
        query = query.where(AISession.is_active == True)
    
    query = query.order_by(AISession.started_at.desc()).offset(skip).limit(limit)
    
    result = await db.execute(query)
    sessions = result.scalars().all()
    
    return sessions


@router.get("/sessions/{session_id}", response_model=SessionResponse)
async def get_session(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Get a specific session"""
    session = await db.get(AISession, session_id)
    
    if not session or session.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    return session


@router.post("/process", response_model=AICompletionResponse)
@limiter.limit("10/minute")  # 10 AI requests per minute per user
async def process_message(
    http_request: Request,
    request: AICompletionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Process a message using AI router with proper transaction management"""
    try:
        # Get or create session
        session = None
        if request.session_id:
            session = await db.get(AISession, request.session_id)
            if not session or session.user_id != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Session not found"
                )
        else:
            # Create new session
            session = AISession(
                user_id=current_user.id,
                title=request.message[:50] + "..." if len(request.message) > 50 else request.message,
                ai_model=request.model or current_user.preferred_ai_model,
                temperature=int((request.temperature or 0.7) * 10),
                max_tokens=request.max_tokens or 2000
            )
            db.add(session)
            await db.flush()

        # Save user message
        user_message = Message(
            session_id=session.id,
            user_id=current_user.id,
            content=request.message,
            role=MessageRole.USER,
            type=MessageType.TEXT
        )
        db.add(user_message)
        await db.flush()
        # Get conversation history
        history_query = select(Message).where(
            Message.session_id == session.id
        ).order_by(Message.created_at)
        
        history_result = await db.execute(history_query)
        messages = history_result.scalars().all()
        
        # Prepare messages for AI
        ai_messages = []
        
        # Add system message if provided
        if request.system_prompt:
            ai_messages.append({
                "role": "system",
                "content": request.system_prompt
            })
        
        # Add conversation history
        for msg in messages[-10:]:  # Last 10 messages for context
            if msg.role in [MessageRole.USER, MessageRole.ASSISTANT]:
                ai_messages.append({
                    "role": msg.role.value,
                    "content": msg.content
                })
        
        # Generate AI response
        ai_response = await ai_service.generate_completion(
            messages=ai_messages,
            model=AIModel(request.model) if request.model else None,
            temperature=request.temperature or 0.7,
            max_tokens=request.max_tokens,
            task_type=request.task_type or "general"
        )
        
        # Calculate cost
        cost = ai_service.calculate_cost(
            AIModel(ai_response["model"]),
            ai_response["usage"]
        )
        
        # Save assistant message
        assistant_message = Message(
            session_id=session.id,
            user_id=current_user.id,
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
        
        return AICompletionResponse(
            content=ai_response["content"],
            model=ai_response["model"],
            provider=ai_response["provider"],
            usage=ai_response["usage"],
            cost=cost / 100,  # Convert back to dollars
            session_id=session.id
        )

    except HTTPException:
        # Re-raise HTTP exceptions without rollback
        await db.rollback()
        raise

    except Exception as e:
        # Rollback the transaction on error
        await db.rollback()

        logger.error(f"AI processing error: {str(e)}", extra={
            "user_id": current_user.id,
            "session_id": session.id if session else None,
            "error": str(e)
        })

        # Try to save error message in a separate transaction
        try:
            error_message = Message(
                session_id=session.id,
                user_id=current_user.id,
                content=f"Error: {str(e)}",
                role=MessageRole.ERROR,
                type=MessageType.TEXT
            )
            db.add(error_message)
            await db.commit()
        except Exception as save_error:
            logger.error(f"Failed to save error message: {save_error}")

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI processing failed: {str(e)}"
        )


@router.get("/sessions/{session_id}/messages", response_model=List[MessageResponse])
async def get_messages(
    session_id: int,
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Get messages for a session"""
    # Verify session ownership
    session = await db.get(AISession, session_id)
    if not session or session.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    query = select(Message).where(
        Message.session_id == session_id
    ).order_by(Message.created_at).offset(skip).limit(limit)
    
    result = await db.execute(query)
    messages = result.scalars().all()
    
    return messages


@router.delete("/sessions/{session_id}")
async def delete_session(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Delete a session and all its messages"""
    session = await db.get(AISession, session_id)
    
    if not session or session.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    await db.delete(session)
    await db.commit()
    
    return {"message": "Session deleted successfully"}