"""
AI Session model for tracking conversations
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, JSON, func
from sqlalchemy.orm import relationship

from app.core.database import Base


class AISession(Base):
    __tablename__ = "ai_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    title = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    
    # Session metadata
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    ended_at = Column(DateTime(timezone=True), nullable=True)
    is_active = Column(Boolean, default=True)
    
    # AI configuration for this session
    ai_model = Column(String, nullable=False)
    temperature = Column(Integer, default=7)  # 0.7 * 10 for integer storage
    max_tokens = Column(Integer, default=2000)
    
    # Session statistics
    total_messages = Column(Integer, default=0)
    total_tokens_used = Column(Integer, default=0)
    total_cost = Column(Integer, default=0)  # In cents
    
    # Context and settings
    context = Column(JSON, nullable=True)  # Store session-specific context
    settings = Column(JSON, nullable=True)  # Store session-specific settings
    
    # Relationships
    user = relationship("User", back_populates="sessions")
    messages = relationship("Message", back_populates="session", cascade="all, delete-orphan")