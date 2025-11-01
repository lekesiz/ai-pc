"""
Voice-related schemas
"""
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class VoiceTranscriptionRequest(BaseModel):
    session_id: Optional[int] = None
    language: Optional[str] = Field(None, description="Language code (e.g., 'en', 'fr')")
    prompt: Optional[str] = Field(None, description="Optional prompt to guide transcription")


class TranscriptionSegment(BaseModel):
    id: int
    seek: int
    start: float
    end: float
    text: str
    tokens: List[int]
    temperature: float
    avg_logprob: float
    compression_ratio: float
    no_speech_prob: float


class VoiceTranscriptionResponse(BaseModel):
    transcription: str
    duration: float = Field(description="Audio duration in seconds")
    language: str = Field(description="Detected or specified language code")
    cost: float = Field(description="Transcription cost in dollars")
    segments: List[TranscriptionSegment] = Field(default_factory=list)


class AIResponseData(BaseModel):
    content: str
    model: str
    tokens: int


class VoiceUploadResponse(BaseModel):
    session_id: int
    transcription: Dict[str, Any]
    ai_response: Optional[AIResponseData] = None
    total_cost: float = Field(description="Total cost in dollars")


class TextToSpeechRequest(BaseModel):
    text: str
    voice: str = Field(default="alloy", description="Voice ID")
    speed: float = Field(default=1.0, ge=0.25, le=4.0)
    session_id: Optional[int] = None


class TextToSpeechResponse(BaseModel):
    audio_url: str
    duration: float
    cost: float