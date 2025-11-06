"""
AI-related schemas
"""
from typing import Optional, Dict, Any, List
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict, field_serializer
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
    content: str


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
    message: str
    session_id: Optional[int] = None
    model: Optional[str] = None
    temperature: Optional[float] = Field(default=0.7, ge=0, le=1)
    max_tokens: Optional[int] = Field(default=None, ge=100, le=8000)
    system_prompt: Optional[str] = None
    task_type: Optional[str] = Field(default="general", description="Task type for model selection")


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