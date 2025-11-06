"""
AI-related schemas
"""
from typing import Optional, Dict, Any, List
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict, field_serializer, field_validator
import bleach
from app.models.message import MessageRole, MessageType


class SessionBase(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None


class SessionCreate(SessionBase):
    ai_model: Optional[str] = None
    temperature: float = Field(default=0.7, ge=0, le=1)
    max_tokens: int = Field(default=2000, ge=100, le=8000)


class SessionResponse(SessionBase):
    id: int
    user_id: int
    started_at: datetime
    ended_at: Optional[datetime]
    is_active: bool
    ai_model: str
    temperature: float
    max_tokens: int
    total_messages: int
    total_tokens_used: int
    total_cost: float  # In dollars

    model_config = ConfigDict(from_attributes=True)

    @field_serializer('temperature')
    def serialize_temperature(self, value: int) -> float:
        """Convert integer (0-10) to float (0.0-1.0)"""
        if isinstance(value, int):
            return value / 10.0
        return value

    @field_serializer('total_cost')
    def serialize_total_cost(self, value: int) -> float:
        """Convert cents to dollars"""
        if isinstance(value, int):
            return value / 100.0
        return value


class MessageBase(BaseModel):
    content: str = Field(..., max_length=10000)

    @field_validator('content')
    @classmethod
    def sanitize_content(cls, v: str) -> str:
        """Sanitize message content to prevent XSS attacks"""
        if not v or not v.strip():
            raise ValueError("Content cannot be empty")
        # Remove all HTML tags and potentially dangerous content
        sanitized = bleach.clean(v, tags=[], strip=True)
        return sanitized.strip()


class MessageCreate(MessageBase):
    session_id: int
    type: MessageType = MessageType.TEXT


class MessageResponse(MessageBase):
    id: int
    session_id: int
    user_id: int
    role: MessageRole
    type: MessageType
    audio_url: Optional[str]
    transcription: Optional[str]
    ai_model: Optional[str]
    tokens_used: int
    cost: float  # In dollars
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

    @field_serializer('cost')
    def serialize_cost(self, value: int) -> float:
        """Convert cents to dollars"""
        if isinstance(value, int):
            return value / 100.0
        return value


class AICompletionRequest(BaseModel):
    message: str = Field(..., max_length=10000)
    session_id: Optional[int] = None
    model: Optional[str] = None
    temperature: Optional[float] = Field(default=0.7, ge=0, le=1)
    max_tokens: Optional[int] = Field(default=None, ge=100, le=8000)
    system_prompt: Optional[str] = Field(None, max_length=2000)
    task_type: Optional[str] = Field(default="general", description="Task type for model selection")

    @field_validator('message', 'system_prompt')
    @classmethod
    def sanitize_text_fields(cls, v: Optional[str]) -> Optional[str]:
        """Sanitize text inputs to prevent injection attacks"""
        if v is None:
            return None
        if not v.strip():
            raise ValueError("Text content cannot be empty")
        # Remove HTML tags and scripts
        sanitized = bleach.clean(v, tags=[], strip=True)
        return sanitized.strip()


class AICompletionResponse(BaseModel):
    content: str
    model: str
    provider: str
    usage: Dict[str, int]
    cost: float  # In dollars
    session_id: int


class AIModelInfo(BaseModel):
    name: str
    provider: str
    strengths: List[str]
    context_window: int
    cost_per_1k_input: float
    cost_per_1k_output: float
    available: bool