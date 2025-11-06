"""
Tests for AI router endpoints
"""
import pytest
from httpx import AsyncClient
from unittest.mock import AsyncMock, patch
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.models.ai_session import AISession
from app.models.message import Message, MessageRole


@pytest.mark.ai
@pytest.mark.asyncio
class TestSessionCreation:
    """Test AI session creation"""

    async def test_create_session(
        self, authenticated_client: AsyncClient, test_user: User
    ):
        """Test creating a new AI session"""
        session_data = {
            "title": "Test Session",
            "description": "Test description",
            "ai_model": "gpt-3.5-turbo",
            "temperature": 0.8,
            "max_tokens": 1500
        }

        response = await authenticated_client.post(
            "/api/ai/sessions", json=session_data
        )

        assert response.status_code == 200
        data = response.json()
        assert data["title"] == session_data["title"]
        assert data["description"] == session_data["description"]
        assert data["ai_model"] == session_data["ai_model"]
        assert data["is_active"] is True
        assert data["user_id"] == test_user.id

    async def test_create_session_unauthorized(self, client: AsyncClient):
        """Test creating session without auth fails"""
        response = await client.post("/api/ai/sessions", json={"title": "Test"})

        assert response.status_code == 401


@pytest.mark.ai
@pytest.mark.asyncio
class TestSessionRetrieval:
    """Test AI session retrieval"""

    @pytest.fixture
    async def test_session(
        self, db_session: AsyncSession, test_user: User
    ) -> AISession:
        """Create a test session"""
        session = AISession(
            user_id=test_user.id,
            title="Test Session",
            ai_model="gpt-3.5-turbo",
            temperature=7,
            max_tokens=2000
        )
        db_session.add(session)
        await db_session.commit()
        await db_session.refresh(session)
        return session

    async def test_get_sessions(
        self, authenticated_client: AsyncClient, test_session: AISession
    ):
        """Test getting user's sessions"""
        response = await authenticated_client.get("/api/ai/sessions")

        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1
        assert data[0]["id"] == test_session.id
        assert data[0]["title"] == test_session.title

    async def test_get_specific_session(
        self, authenticated_client: AsyncClient, test_session: AISession
    ):
        """Test getting a specific session"""
        response = await authenticated_client.get(f"/api/ai/sessions/{test_session.id}")

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == test_session.id
        assert data["title"] == test_session.title

    async def test_get_nonexistent_session(self, authenticated_client: AsyncClient):
        """Test getting nonexistent session fails"""
        response = await authenticated_client.get("/api/ai/sessions/99999")

        assert response.status_code == 404

    async def test_get_sessions_unauthorized(self, client: AsyncClient):
        """Test getting sessions without auth fails"""
        response = await client.get("/api/ai/sessions")

        assert response.status_code == 401


@pytest.mark.ai
@pytest.mark.asyncio
class TestMessageProcessing:
    """Test AI message processing"""

    @pytest.fixture
    async def test_session(
        self, db_session: AsyncSession, test_user: User
    ) -> AISession:
        """Create a test session"""
        session = AISession(
            user_id=test_user.id,
            title="Test Session",
            ai_model="gpt-3.5-turbo",
            temperature=7,
            max_tokens=2000
        )
        db_session.add(session)
        await db_session.commit()
        await db_session.refresh(session)
        return session

    @patch("app.services.ai_service.ai_router.generate_completion")
    async def test_process_message_with_existing_session(
        self,
        mock_generate: AsyncMock,
        authenticated_client: AsyncClient,
        test_session: AISession
    ):
        """Test processing a message in existing session"""
        # Mock AI response
        mock_generate.return_value = {
            "content": "This is a test AI response",
            "model": "gpt-3.5-turbo",
            "provider": "openai",
            "usage": {
                "prompt_tokens": 10,
                "completion_tokens": 20,
                "total_tokens": 30
            }
        }

        request_data = {
            "message": "Hello AI",
            "session_id": test_session.id,
            "task_type": "general"
        }

        response = await authenticated_client.post(
            "/api/ai/process", json=request_data
        )

        assert response.status_code == 200
        data = response.json()
        assert data["content"] == "This is a test AI response"
        assert data["model"] == "gpt-3.5-turbo"
        assert data["session_id"] == test_session.id
        assert "usage" in data
        assert "cost" in data

    @patch("app.services.ai_service.ai_router.generate_completion")
    async def test_process_message_create_new_session(
        self,
        mock_generate: AsyncMock,
        authenticated_client: AsyncClient,
        test_user: User
    ):
        """Test processing a message creates new session if none provided"""
        mock_generate.return_value = {
            "content": "Test response",
            "model": "gpt-3.5-turbo",
            "provider": "openai",
            "usage": {
                "prompt_tokens": 10,
                "completion_tokens": 20,
                "total_tokens": 30
            }
        }

        request_data = {
            "message": "Hello AI",
            "task_type": "general"
        }

        response = await authenticated_client.post(
            "/api/ai/process", json=request_data
        )

        assert response.status_code == 200
        data = response.json()
        assert "session_id" in data
        assert data["session_id"] is not None

    async def test_process_message_empty_content(
        self, authenticated_client: AsyncClient
    ):
        """Test processing empty message fails validation"""
        request_data = {
            "message": "",
            "task_type": "general"
        }

        response = await authenticated_client.post(
            "/api/ai/process", json=request_data
        )

        # Should fail validation
        assert response.status_code == 422

    async def test_process_message_unauthorized(self, client: AsyncClient):
        """Test processing message without auth fails"""
        response = await client.post(
            "/api/ai/process", json={"message": "test"}
        )

        assert response.status_code == 401


@pytest.mark.ai
@pytest.mark.asyncio
class TestMessageRetrieval:
    """Test message retrieval"""

    @pytest.fixture
    async def session_with_messages(
        self, db_session: AsyncSession, test_user: User
    ):
        """Create a session with messages"""
        session = AISession(
            user_id=test_user.id,
            title="Test Session",
            ai_model="gpt-3.5-turbo"
        )
        db_session.add(session)
        await db_session.flush()

        # Add messages
        messages = [
            Message(
                session_id=session.id,
                user_id=test_user.id,
                content="User message 1",
                role=MessageRole.USER
            ),
            Message(
                session_id=session.id,
                user_id=test_user.id,
                content="AI response 1",
                role=MessageRole.ASSISTANT
            )
        ]
        for msg in messages:
            db_session.add(msg)

        await db_session.commit()
        await db_session.refresh(session)
        return session

    async def test_get_session_messages(
        self, authenticated_client: AsyncClient, session_with_messages: AISession
    ):
        """Test getting messages from a session"""
        response = await authenticated_client.get(
            f"/api/ai/sessions/{session_with_messages.id}/messages"
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        assert data[0]["role"] == "user"
        assert data[1]["role"] == "assistant"


@pytest.mark.ai
@pytest.mark.asyncio
class TestSessionDeletion:
    """Test session deletion"""

    @pytest.fixture
    async def test_session(
        self, db_session: AsyncSession, test_user: User
    ) -> AISession:
        """Create a test session"""
        session = AISession(
            user_id=test_user.id,
            title="Test Session",
            ai_model="gpt-3.5-turbo"
        )
        db_session.add(session)
        await db_session.commit()
        await db_session.refresh(session)
        return session

    async def test_delete_session(
        self, authenticated_client: AsyncClient, test_session: AISession
    ):
        """Test deleting a session"""
        response = await authenticated_client.delete(
            f"/api/ai/sessions/{test_session.id}"
        )

        assert response.status_code == 200
        assert "success" in response.json()["message"].lower()

        # Verify session is deleted
        get_response = await authenticated_client.get(
            f"/api/ai/sessions/{test_session.id}"
        )
        assert get_response.status_code == 404

    async def test_delete_nonexistent_session(
        self, authenticated_client: AsyncClient
    ):
        """Test deleting nonexistent session fails"""
        response = await authenticated_client.delete("/api/ai/sessions/99999")

        assert response.status_code == 404
