"""
Pytest configuration and fixtures for AI-PC Backend tests
"""
import asyncio
import pytest
import pytest_asyncio
from typing import AsyncGenerator, Generator
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import NullPool
from faker import Faker

from app.main import app
from app.core.database import Base, get_db
from app.core.security import get_password_hash
from app.models.user import User
from app.core.config import settings

# Test database URL - use separate test database
TEST_DATABASE_URL = "postgresql+asyncpg://ai_user:ai_password@localhost/ai_pc_test_db"

# Create test engine
test_engine = create_async_engine(
    TEST_DATABASE_URL,
    poolclass=NullPool,  # Disable connection pooling for tests
    echo=False
)

# Create test session factory
TestSessionLocal = async_sessionmaker(
    test_engine,
    class_=AsyncSession,
    expire_on_commit=False
)

# Faker instance for generating test data
fake = Faker()


@pytest.fixture(scope="session")
def event_loop() -> Generator:
    """Create event loop for async tests"""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="function")
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """
    Create a fresh database session for each test.
    Creates all tables before test and drops them after.
    """
    # Create all tables
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Create session
    async with TestSessionLocal() as session:
        yield session

    # Drop all tables after test
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture(scope="function")
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """
    Create test client with overridden database dependency
    """
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    async with AsyncClient(app=app, base_url="http://test") as test_client:
        yield test_client

    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def test_user(db_session: AsyncSession) -> User:
    """
    Create a test user in the database
    """
    user = User(
        email=fake.email(),
        username=fake.user_name(),
        hashed_password=get_password_hash("testpassword123"),
        full_name=fake.name(),
        is_active=True,
        is_verified=True
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def test_user_token(client: AsyncClient, test_user: User) -> dict:
    """
    Get authentication token for test user
    """
    response = await client.post(
        "/api/auth/login",
        data={
            "username": test_user.username,
            "password": "testpassword123"
        }
    )
    assert response.status_code == 200
    data = response.json()
    return {
        "access_token": data["access_token"],
        "user": test_user
    }


@pytest_asyncio.fixture
async def authenticated_client(client: AsyncClient, test_user_token: dict) -> AsyncClient:
    """
    Create authenticated client with Authorization header
    """
    client.headers.update({
        "Authorization": f"Bearer {test_user_token['access_token']}"
    })
    return client


# Test data generators
@pytest.fixture
def user_data() -> dict:
    """Generate random user data for registration tests"""
    return {
        "email": fake.email(),
        "username": fake.user_name(),
        "password": "TestPass123!",
        "full_name": fake.name()
    }


@pytest.fixture
def message_data() -> dict:
    """Generate random message data for AI tests"""
    return {
        "message": fake.sentence(),
        "temperature": 0.7,
        "max_tokens": 1000,
        "task_type": "general"
    }
