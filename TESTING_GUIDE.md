# 🧪 Testing Guide - AI-PC System

This guide covers how to run and write tests for the AI-PC system.

## 📋 Table of Contents

- [Backend Testing](#backend-testing)
- [Frontend Testing](#frontend-testing)
- [Test Coverage](#test-coverage)
- [Writing New Tests](#writing-new-tests)
- [CI/CD Integration](#cicd-integration)

---

## 🐍 Backend Testing

### Prerequisites

```bash
cd backend
pip install -r requirements.txt
```

### Running Tests

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app --cov-report=html

# Run specific test file
pytest tests/test_auth.py

# Run specific test class
pytest tests/test_auth.py::TestUserRegistration

# Run specific test
pytest tests/test_auth.py::TestUserRegistration::test_register_new_user

# Run tests by marker
pytest -m auth
pytest -m ai
pytest -m slow
```

### Test Database Setup

Tests use a separate test database: `ai_pc_test_db`

Create the test database:
```bash
createdb ai_pc_test_db
```

Or using Docker:
```bash
docker exec -it ai-pc-postgres psql -U ai_user -c "CREATE DATABASE ai_pc_test_db;"
```

### Backend Test Structure

```
backend/tests/
├── __init__.py
├── conftest.py           # Fixtures and configuration
├── test_auth.py          # Authentication endpoint tests
└── test_ai_router.py     # AI router endpoint tests
```

### Available Fixtures

- `db_session`: Fresh database session (creates/drops tables)
- `client`: AsyncClient with overridden DB
- `test_user`: Pre-created test user
- `test_user_token`: Authentication token for test user
- `authenticated_client`: Client with Authorization header
- `user_data`: Random user data generator
- `message_data`: Random message data generator

### Example Backend Test

```python
@pytest.mark.auth
@pytest.mark.asyncio
async def test_login_success(client: AsyncClient, test_user: User):
    response = await client.post(
        "/api/auth/login",
        data={"username": test_user.username, "password": "testpassword123"}
    )

    assert response.status_code == 200
    assert "access_token" in response.json()
```

---

## ⚛️ Frontend Testing

### Prerequisites

```bash
cd frontend
npm install
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run with UI
npm run test:ui

# Run with coverage
npm run test:coverage

# Run specific test file
npm test ChatInput

# Update snapshots
npm test -- -u
```

### Frontend Test Structure

```
frontend/src/
├── test/
│   ├── setup.ts             # Test environment setup
│   └── test-utils.tsx       # Custom render utilities
├── components/__tests__/
│   └── ChatInput.test.tsx   # Component tests
└── stores/__tests__/
    └── authStore.test.ts    # Store tests
```

### Test Utilities

Custom render function with providers:

```typescript
import { render, screen } from '@/test/test-utils'

test('component renders correctly', () => {
  render(<MyComponent />)
  expect(screen.getByText('Hello')).toBeInTheDocument()
})
```

### Example Component Test

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@/test/test-utils'
import userEvent from '@testing-library/user-event'

describe('ChatInput', () => {
  it('sends message on button click', async () => {
    const mockSend = vi.fn()
    const user = userEvent.setup()

    render(<ChatInput onSendMessage={mockSend} />)

    const textarea = screen.getByPlaceholderText(/type your message/i)
    const sendButton = screen.getByTitle(/send message/i)

    await user.type(textarea, 'Hello AI')
    await user.click(sendButton)

    expect(mockSend).toHaveBeenCalledWith('Hello AI')
  })
})
```

### Example Store Test

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useAuthStore } from '../authStore'
import { api } from '@/services/api'

vi.mock('@/services/api')

describe('authStore', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, token: null })
    vi.clearAllMocks()
  })

  it('logs in successfully', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({
      data: { access_token: 'test-token' }
    })

    const { login } = useAuthStore.getState()
    await login({ username: 'test', password: 'pass' })

    expect(useAuthStore.getState().isAuthenticated).toBe(true)
  })
})
```

---

## 📊 Test Coverage

### Current Coverage Goals

| Component | Target | Current |
|-----------|--------|---------|
| Backend API | 80% | TBD |
| Frontend Components | 70% | TBD |
| Stores | 90% | TBD |
| Overall | 75% | TBD |

### Viewing Coverage Reports

**Backend:**
```bash
pytest --cov=app --cov-report=html
open htmlcov/index.html
```

**Frontend:**
```bash
npm run test:coverage
open coverage/index.html
```

---

## ✍️ Writing New Tests

### Backend Test Template

```python
import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
class TestFeature:
    """Test feature description"""

    async def test_success_case(
        self, authenticated_client: AsyncClient
    ):
        """Test successful operation"""
        response = await authenticated_client.post(
            "/api/endpoint",
            json={"key": "value"}
        )

        assert response.status_code == 200
        assert response.json()["key"] == "expected"

    async def test_error_case(self, client: AsyncClient):
        """Test error handling"""
        response = await client.post(
            "/api/endpoint",
            json={"invalid": "data"}
        )

        assert response.status_code == 400
        assert "error" in response.json()["detail"].lower()
```

### Frontend Test Template

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@/test/test-utils'
import userEvent from '@testing-library/user-event'

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />)
    expect(screen.getByText('Expected Text')).toBeInTheDocument()
  })

  it('handles user interaction', async () => {
    const mockHandler = vi.fn()
    const user = userEvent.setup()

    render(<MyComponent onAction={mockHandler} />)

    await user.click(screen.getByRole('button'))

    expect(mockHandler).toHaveBeenCalled()
  })

  it('displays error state', () => {
    render(<MyComponent error="Something went wrong" />)
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument()
  })
})
```

---

## 🔄 CI/CD Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test_password
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: '3.11'

      - name: Install dependencies
        run: |
          cd backend
          pip install -r requirements.txt

      - name: Run tests
        run: |
          cd backend
          pytest --cov=app --cov-report=xml

      - name: Upload coverage
        uses: codecov/codecov-action@v3

  frontend-tests:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: |
          cd frontend
          npm ci

      - name: Run tests
        run: |
          cd frontend
          npm test -- --coverage
```

---

## 🎯 Best Practices

### DO ✅

- Write tests for all new features
- Test both success and error cases
- Use descriptive test names
- Mock external dependencies (AI APIs, etc.)
- Keep tests isolated and independent
- Use fixtures/utilities for common setup
- Test edge cases and boundary conditions

### DON'T ❌

- Don't test implementation details
- Don't make tests dependent on each other
- Don't skip cleanup (use fixtures)
- Don't hardcode sensitive data
- Don't ignore failing tests
- Don't write tests that depend on external services

---

## 📝 Test Markers (Backend)

- `@pytest.mark.unit` - Unit tests
- `@pytest.mark.integration` - Integration tests
- `@pytest.mark.auth` - Authentication tests
- `@pytest.mark.ai` - AI service tests
- `@pytest.mark.voice` - Voice/Whisper tests
- `@pytest.mark.slow` - Slow running tests
- `@pytest.mark.database` - Database tests

Usage:
```bash
pytest -m "auth and not slow"
pytest -m "unit or integration"
```

---

## 🐛 Debugging Tests

### Backend

```bash
# Run with verbose output
pytest -vv

# Show print statements
pytest -s

# Drop into debugger on failure
pytest --pdb

# Only run failed tests
pytest --lf
```

### Frontend

```bash
# Debug in browser
npm run test:ui

# Show console output
npm test -- --reporter=verbose

# Run single test
npm test -- -t "test name"
```

---

## 📚 Additional Resources

- [Pytest Documentation](https://docs.pytest.org/)
- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

---

**Last Updated:** January 6, 2025
