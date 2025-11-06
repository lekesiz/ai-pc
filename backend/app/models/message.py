"""
Message model for storing conversation history
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON, Enum, func, Index
from sqlalchemy.orm import relationship
import enum

from app.core.database import Base


class MessageRole(str, enum.Enum):
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"
    ERROR = "error"


class MessageType(str, enum.Enum):
    TEXT = "text"
    VOICE = "voice"
    COMMAND = "command"
    FILE = "file"


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("ai_sessions.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    # Message content
    content = Column(Text, nullable=False)
    role = Column(Enum(MessageRole), nullable=False)
    type = Column(Enum(MessageType), default=MessageType.TEXT)
    
    # For voice messages
    audio_url = Column(String, nullable=True)
    transcription = Column(Text, nullable=True)
    
    # AI specific data
    ai_model = Column(String, nullable=True)
    tokens_used = Column(Integer, default=0)
    cost = Column(Integer, default=0)  # In cents
    processing_time = Column(Integer, nullable=True)  # In milliseconds
    
    # Metadata
    metadata = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    session = relationship("AISession", back_populates="messages")
    user = relationship("User", back_populates="messages")

    # Composite indexes for common query patterns
    __table_args__ = (
        # Index for fetching messages in a session ordered by time
        Index('ix_message_session_created', 'session_id', 'created_at'),
        # Index for fetching user's messages ordered by time
        Index('ix_message_user_created', 'user_id', 'created_at'),
        # Index for filtering by role within a session
        Index('ix_message_session_role', 'session_id', 'role'),
    )