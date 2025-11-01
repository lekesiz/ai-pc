# 🤖 AI-PC System

A powerful AI-powered personal computer assistant that combines voice commands, multi-AI model support, and real-time chat capabilities.

![AI-PC Banner](https://img.shields.io/badge/AI--PC-System-blue?style=for-the-badge)
![Python](https://img.shields.io/badge/Python-3.11+-green?style=flat-square)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)

## 🌟 Features

### 🎯 Core Features
- **Multi-AI Support**: Seamlessly switch between GPT-4, Claude 3, and Gemini Pro
- **Voice Commands**: Record and transcribe voice messages using OpenAI Whisper
- **Real-time Chat**: WebSocket-powered instant messaging
- **Smart Routing**: Automatic AI model selection based on task type
- **Cost Tracking**: Monitor API usage and costs in real-time

### 🛠️ Technical Features
- **Modern Stack**: FastAPI + React + TypeScript
- **Secure Auth**: JWT-based authentication system
- **Real-time Updates**: WebSocket integration
- **Dark Mode**: Built-in dark theme support
- **Responsive Design**: Works on desktop and mobile

## 📋 Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL 15+
- Redis 7+
- Docker & Docker Compose (optional)

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/lekesiz/ai-pc.git
cd ai-pc
```

### 2. Set Up Backend

```bash
# Navigate to backend
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Edit .env and add your API keys:
# - OPENAI_API_KEY
# - ANTHROPIC_API_KEY
# - GOOGLE_AI_API_KEY
```

### 3. Set Up Database

```bash
# Using Docker (recommended)
docker-compose up -d

# Run migrations
alembic upgrade head
```

### 4. Set Up Frontend

```bash
# In a new terminal, navigate to frontend
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

### 5. Start the Backend Server

```bash
# In the backend directory
python -m app.main
```

Visit `http://localhost:3000` to access the application.

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the backend directory:

```env
# Database
DATABASE_URL=postgresql+asyncpg://ai_user:ai_password@localhost/ai_pc_db

# Redis
REDIS_URL=redis://localhost:6379/0

# Security
SECRET_KEY=your-secret-key-here  # Generate with: openssl rand -hex 32

# AI APIs
OPENAI_API_KEY=your-openai-api-key
ANTHROPIC_API_KEY=your-anthropic-api-key
GOOGLE_AI_API_KEY=your-google-ai-api-key

# Optional
WHISPER_MODEL=whisper-1
AUDIO_MAX_SIZE_MB=25
```

### Available AI Models

| Provider | Model | Best For |
|----------|-------|----------|
| OpenAI | GPT-4 Turbo | General purpose, coding |
| OpenAI | GPT-3.5 Turbo | Fast responses, lower cost |
| Anthropic | Claude 3 Opus | Complex analysis, creative writing |
| Google | Gemini Pro | Multilingual, fast responses |

## 📱 Usage

### Creating an Account
1. Click "Create Account" on the login page
2. Fill in your details
3. Start chatting!

### Voice Commands
1. Click the microphone button in the chat interface
2. Record your message (max 60 seconds)
3. Choose to transcribe first or send directly
4. The AI will respond to your transcribed message

### Switching AI Models
Use the dropdown in the chat header to switch between available AI models.

## 🏗️ Architecture

```
ai-pc/
├── backend/              # FastAPI backend
│   ├── app/
│   │   ├── api/         # API endpoints
│   │   ├── core/        # Core utilities
│   │   ├── models/      # Database models
│   │   ├── schemas/     # Pydantic schemas
│   │   └── services/    # Business logic
│   └── alembic/         # Database migrations
│
├── frontend/            # React frontend
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── pages/       # Page components
│   │   ├── services/    # API services
│   │   ├── stores/      # State management
│   │   └── hooks/       # Custom hooks
│   └── public/          # Static assets
│
└── docker-compose.yml   # Docker configuration
```

## 🧪 Development

### Running Tests

```bash
# Backend tests
cd backend
pytest

# Frontend tests
cd frontend
npm test
```

### Code Quality

```bash
# Backend
black app
flake8 app
mypy app

# Frontend
npm run lint
```

### Making Changes

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make your changes
3. Run tests and linting
4. Commit: `git commit -m "feat: your feature description"`
5. Push: `git push origin feature/your-feature`
6. Create a pull request

## 🚢 Deployment

### Using Docker

```bash
# Build and run all services
docker-compose up --build

# Run in background
docker-compose up -d
```

### Manual Deployment

See [DEPLOYMENT.md](docs/DEPLOYMENT.md) for detailed deployment instructions.

## 📊 API Documentation

When running in development mode, API documentation is available at:
- Swagger UI: `http://localhost:8000/api/docs`
- ReDoc: `http://localhost:8000/api/redoc`

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## 📄 License

This project is licensed under the MIT License - see [LICENSE](LICENSE) for details.

## 🙏 Acknowledgments

- OpenAI for GPT models and Whisper
- Anthropic for Claude models
- Google for Gemini models
- The FastAPI and React communities

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/lekesiz/ai-pc/issues)
- **Discussions**: [GitHub Discussions](https://github.com/lekesiz/ai-pc/discussions)

---

Built with ❤️ by [lekesiz](https://github.com/lekesiz)