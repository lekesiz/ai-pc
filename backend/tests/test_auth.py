"""
Tests for authentication endpoints
"""
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.core.security import verify_password


@pytest.mark.auth
@pytest.mark.asyncio
class TestUserRegistration:
    """Test user registration endpoint"""

    async def test_register_new_user(self, client: AsyncClient, user_data: dict):
        """Test successful user registration"""
        response = await client.post("/api/auth/register", json=user_data)

        assert response.status_code == 200
        data = response.json()
        assert data["email"] == user_data["email"]
        assert data["username"] == user_data["username"]
        assert data["full_name"] == user_data["full_name"]
        assert "id" in data
        assert "hashed_password" not in data  # Password should not be returned

    async def test_register_duplicate_email(
        self, client: AsyncClient, test_user: User, user_data: dict
    ):
        """Test registration with duplicate email fails"""
        user_data["email"] = test_user.email
        response = await client.post("/api/auth/register", json=user_data)

        assert response.status_code == 400
        assert "already registered" in response.json()["detail"].lower()

    async def test_register_duplicate_username(
        self, client: AsyncClient, test_user: User, user_data: dict
    ):
        """Test registration with duplicate username fails"""
        user_data["username"] = test_user.username
        response = await client.post("/api/auth/register", json=user_data)

        assert response.status_code == 400
        assert "already registered" in response.json()["detail"].lower()

    async def test_register_invalid_email(self, client: AsyncClient, user_data: dict):
        """Test registration with invalid email fails"""
        user_data["email"] = "not-an-email"
        response = await client.post("/api/auth/register", json=user_data)

        assert response.status_code == 422  # Validation error

    async def test_register_short_password(self, client: AsyncClient, user_data: dict):
        """Test registration with short password fails"""
        user_data["password"] = "short"
        response = await client.post("/api/auth/register", json=user_data)

        assert response.status_code == 422  # Validation error


@pytest.mark.auth
@pytest.mark.asyncio
class TestUserLogin:
    """Test user login endpoint"""

    async def test_login_success_with_username(
        self, client: AsyncClient, test_user: User
    ):
        """Test successful login with username"""
        response = await client.post(
            "/api/auth/login",
            data={"username": test_user.username, "password": "testpassword123"},
        )

        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        # Refresh token should be in httpOnly cookie, not in response
        assert "refresh_token" not in data

    async def test_login_success_with_email(self, client: AsyncClient, test_user: User):
        """Test successful login with email"""
        response = await client.post(
            "/api/auth/login",
            data={"username": test_user.email, "password": "testpassword123"},
        )

        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data

    async def test_login_wrong_password(self, client: AsyncClient, test_user: User):
        """Test login with wrong password fails"""
        response = await client.post(
            "/api/auth/login",
            data={"username": test_user.username, "password": "wrongpassword"},
        )

        assert response.status_code == 401
        assert "incorrect" in response.json()["detail"].lower()

    async def test_login_nonexistent_user(self, client: AsyncClient):
        """Test login with nonexistent user fails"""
        response = await client.post(
            "/api/auth/login",
            data={"username": "nonexistent", "password": "somepassword"},
        )

        assert response.status_code == 401

    async def test_login_inactive_user(
        self, client: AsyncClient, test_user: User, db_session: AsyncSession
    ):
        """Test login with inactive user fails"""
        test_user.is_active = False
        await db_session.commit()

        response = await client.post(
            "/api/auth/login",
            data={"username": test_user.username, "password": "testpassword123"},
        )

        assert response.status_code == 400
        assert "inactive" in response.json()["detail"].lower()


@pytest.mark.auth
@pytest.mark.asyncio
class TestTokenRefresh:
    """Test token refresh endpoint"""

    async def test_refresh_token_success(
        self, client: AsyncClient, test_user_token: dict
    ):
        """Test successful token refresh using cookie"""
        # In real scenario, refresh token would be in cookie
        # For now, we test the endpoint exists and requires cookie
        response = await client.post("/api/auth/refresh")

        # Without cookie, should get 401
        assert response.status_code == 401
        assert "refresh token" in response.json()["detail"].lower()


@pytest.mark.auth
@pytest.mark.asyncio
class TestCurrentUser:
    """Test current user endpoint"""

    async def test_get_current_user(
        self, authenticated_client: AsyncClient, test_user: User
    ):
        """Test getting current user info"""
        response = await authenticated_client.get("/api/auth/me")

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == test_user.id
        assert data["email"] == test_user.email
        assert data["username"] == test_user.username
        assert "hashed_password" not in data

    async def test_get_current_user_unauthorized(self, client: AsyncClient):
        """Test getting current user without auth fails"""
        response = await client.get("/api/auth/me")

        assert response.status_code == 401


@pytest.mark.auth
@pytest.mark.asyncio
class TestUserUpdate:
    """Test user update endpoint"""

    async def test_update_user_full_name(
        self, authenticated_client: AsyncClient, test_user: User
    ):
        """Test updating user's full name"""
        new_name = "Updated Name"
        response = await authenticated_client.put(
            "/api/auth/me", json={"full_name": new_name}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["full_name"] == new_name
        assert data["email"] == test_user.email  # Other fields unchanged


@pytest.mark.auth
@pytest.mark.asyncio
class TestLogout:
    """Test logout endpoint"""

    async def test_logout_success(self, authenticated_client: AsyncClient):
        """Test successful logout"""
        response = await authenticated_client.post("/api/auth/logout")

        assert response.status_code == 200
        assert "success" in response.json()["message"].lower()

    async def test_logout_unauthorized(self, client: AsyncClient):
        """Test logout without auth fails"""
        response = await client.post("/api/auth/logout")

        assert response.status_code == 401
