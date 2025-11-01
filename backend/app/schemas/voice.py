"""
Voice-related schemas
"""
from typing import Optional
from pydantic import BaseModel, Field


class VoiceTranscriptionRequest(BaseModel):
    session_id: Optional[int] = None


class VoiceTranscriptionResponse(BaseModel):
    transcription: str
    duration: float = Field(description="Audio duration in seconds")
    language: str = Field(description="Detected language code")


class TextToSpeechRequest(BaseModel):
    text: str
    voice: str = Field(default="alloy", description="Voice ID")
    speed: float = Field(default=1.0, ge=0.25, le=4.0)


class TextToSpeechResponse(BaseModel):
    audio_url: str
    duration: float