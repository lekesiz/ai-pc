"""
Whisper service for audio transcription
"""
import os
import tempfile
import logging
from typing import Optional, BinaryIO
import aiofiles
from openai import AsyncOpenAI
import soundfile as sf
import numpy as np

from app.core.config import settings

logger = logging.getLogger(__name__)


class WhisperService:
    """Service for handling audio transcription using OpenAI's Whisper API"""

    def __init__(self):
        """Initialize Whisper service. Service will be unavailable if no API key is configured."""
        self.available = False
        self.client = None

        if settings.OPENAI_API_KEY:
            try:
                self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
                self.available = True
                logger.info("Whisper service initialized successfully")
            except Exception as e:
                logger.warning(f"Failed to initialize Whisper service: {e}")
        else:
            logger.warning("Whisper service unavailable: No OpenAI API key configured")

        self.supported_formats = ['.mp3', '.mp4', '.mpeg', '.mpga', '.m4a', '.wav', '.webm', '.ogg']
        self.max_file_size = settings.AUDIO_MAX_SIZE_MB * 1024 * 1024  # Convert to bytes
    
    async def transcribe_audio(
        self,
        audio_file: BinaryIO,
        filename: str,
        language: Optional[str] = None,
        prompt: Optional[str] = None
    ) -> dict:
        """
        Transcribe audio file using Whisper API

        Args:
            audio_file: Audio file binary data
            filename: Original filename
            language: Optional language code (e.g., 'en', 'fr')
            prompt: Optional prompt to guide the transcription

        Returns:
            Dict containing transcription and metadata

        Raises:
            ValueError: If the Whisper service is not available
        """
        if not self.available or not self.client:
            raise ValueError("Whisper service is not available. Please configure OPENAI_API_KEY.")

        try:
            # Validate file extension
            file_ext = os.path.splitext(filename)[1].lower()
            if file_ext not in self.supported_formats:
                raise ValueError(f"Unsupported audio format: {file_ext}")
            
            # Create temporary file
            with tempfile.NamedTemporaryFile(suffix=file_ext, delete=False) as tmp_file:
                # Write audio data to temporary file
                content = await audio_file.read()
                
                # Check file size
                if len(content) > self.max_file_size:
                    raise ValueError(f"Audio file too large. Maximum size is {settings.AUDIO_MAX_SIZE_MB}MB")
                
                await aiofiles.write(tmp_file.name, content, mode='wb')
                tmp_path = tmp_file.name
            
            try:
                # Get audio duration
                duration = await self._get_audio_duration(tmp_path)
                
                # Transcribe using Whisper API
                with open(tmp_path, 'rb') as audio:
                    transcription = await self.client.audio.transcriptions.create(
                        model=settings.WHISPER_MODEL,
                        file=audio,
                        language=language,
                        prompt=prompt,
                        response_format="verbose_json"  # Get detailed response
                    )
                
                # Process response
                result = {
                    "transcription": transcription.text,
                    "language": transcription.language or language or "unknown",
                    "duration": duration,
                    "segments": getattr(transcription, 'segments', []),
                    "model": settings.WHISPER_MODEL
                }
                
                logger.info(f"Successfully transcribed audio: {duration:.2f}s, {len(result['transcription'])} chars")
                return result
                
            finally:
                # Clean up temporary file
                os.unlink(tmp_path)
                
        except Exception as e:
            logger.error(f"Transcription error: {str(e)}")
            raise
    
    async def _get_audio_duration(self, audio_path: str) -> float:
        """Get audio duration in seconds"""
        try:
            data, samplerate = sf.read(audio_path)
            duration = len(data) / samplerate
            return duration
        except Exception as e:
            logger.warning(f"Could not determine audio duration: {e}")
            return 0.0
    
    def estimate_cost(self, duration_seconds: float) -> float:
        """
        Estimate transcription cost in dollars
        Whisper API pricing: $0.006 per minute
        """
        minutes = duration_seconds / 60
        cost = minutes * 0.006
        return round(cost, 4)
    
    async def transcribe_streaming(self, audio_stream: BinaryIO) -> str:
        """
        Transcribe audio from a streaming source (future implementation)
        """
        # TODO: Implement streaming transcription when available
        raise NotImplementedError("Streaming transcription not yet implemented")


# Singleton instance
whisper_service = WhisperService()