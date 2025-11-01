"""
Voice processing endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.ext.asyncio import AsyncSession
import aiofiles
import os
import tempfile
import logging
from typing import Any, Optional

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.config import settings
from app.models import User, Message, MessageRole, MessageType
from app.schemas.voice import VoiceTranscriptionResponse

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/transcribe", response_model=VoiceTranscriptionResponse)
async def transcribe_audio(
    audio: UploadFile = File(...),
    session_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Transcribe audio file to text using Whisper API"""
    
    # Validate file size
    if audio.size > settings.AUDIO_MAX_SIZE_MB * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Audio file too large. Maximum size is {settings.AUDIO_MAX_SIZE_MB}MB"
        )
    
    # Validate file type
    allowed_types = ["audio/mpeg", "audio/wav", "audio/webm", "audio/ogg", "audio/m4a"]
    if audio.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Unsupported audio format. Allowed types: {', '.join(allowed_types)}"
        )
    
    try:
        # Save audio temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(audio.filename)[1]) as tmp_file:
            content = await audio.read()
            await aiofiles.write(tmp_file.name, content)
            tmp_path = tmp_file.name
        
        # TODO: Implement actual Whisper API call
        # For now, return a mock response
        transcription = f"[Mock transcription of {audio.filename}]"
        
        # Clean up
        os.unlink(tmp_path)
        
        # Save message if session_id provided
        if session_id:
            message = Message(
                session_id=session_id,
                user_id=current_user.id,
                content=transcription,
                role=MessageRole.USER,
                type=MessageType.VOICE,
                transcription=transcription,
                # audio_url would be set if we store the audio
            )
            db.add(message)
            await db.commit()
            await db.refresh(message)
        
        return VoiceTranscriptionResponse(
            transcription=transcription,
            duration=0.0,  # Would be calculated from actual audio
            language="en"   # Would be detected by Whisper
        )
        
    except Exception as e:
        logger.error(f"Transcription error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Transcription failed: {str(e)}"
        )