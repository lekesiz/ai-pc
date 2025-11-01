"""
Voice processing endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status, Form
from sqlalchemy.ext.asyncio import AsyncSession
import os
import logging
from typing import Any, Optional
from datetime import datetime

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.config import settings
from app.models import User, Message, MessageRole, MessageType, AISession
from app.schemas.voice import VoiceTranscriptionResponse, VoiceUploadResponse
from app.services.whisper_service import whisper_service
from app.services.ai_service import ai_router

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/transcribe", response_model=VoiceTranscriptionResponse)
async def transcribe_audio(
    audio: UploadFile = File(...),
    session_id: Optional[int] = Form(None),
    language: Optional[str] = Form(None),
    prompt: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Transcribe audio file to text using Whisper API"""
    
    try:
        # Transcribe audio
        result = await whisper_service.transcribe_audio(
            audio_file=audio.file,
            filename=audio.filename,
            language=language,
            prompt=prompt
        )
        
        # Calculate cost
        cost_dollars = whisper_service.estimate_cost(result['duration'])
        cost_cents = int(cost_dollars * 100)
        
        # Save message if session_id provided
        if session_id:
            # Verify session ownership
            session = await db.get(AISession, session_id)
            if not session or session.user_id != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Session not found"
                )
            
            # Save transcribed message
            message = Message(
                session_id=session_id,
                user_id=current_user.id,
                content=result['transcription'],
                role=MessageRole.USER,
                type=MessageType.VOICE,
                transcription=result['transcription'],
                metadata={
                    "duration": result['duration'],
                    "language": result['language'],
                    "model": result['model']
                },
                tokens_used=0,  # No tokens for transcription
                cost=cost_cents
            )
            db.add(message)
            
            # Update session stats
            session.total_messages += 1
            session.total_cost += cost_cents
            
            await db.commit()
            await db.refresh(message)
        
        return VoiceTranscriptionResponse(
            transcription=result['transcription'],
            duration=result['duration'],
            language=result['language'],
            cost=cost_dollars,
            segments=result.get('segments', [])
        )
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Transcription error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Transcription failed"
        )


@router.post("/process", response_model=VoiceUploadResponse)
async def process_voice_message(
    audio: UploadFile = File(...),
    session_id: Optional[int] = Form(None),
    language: Optional[str] = Form(None),
    auto_respond: bool = Form(True),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """
    Process voice message: transcribe and optionally get AI response
    """
    try:
        # First transcribe the audio
        transcription_result = await whisper_service.transcribe_audio(
            audio_file=audio.file,
            filename=audio.filename,
            language=language
        )
        
        transcribed_text = transcription_result['transcription']
        
        # If no session_id, create a new session
        if not session_id:
            session = AISession(
                user_id=current_user.id,
                title=transcribed_text[:50] + "..." if len(transcribed_text) > 50 else transcribed_text,
                ai_model=current_user.preferred_ai_model,
                temperature=7,  # 0.7 * 10
                max_tokens=2000
            )
            db.add(session)
            await db.flush()
            session_id = session.id
        else:
            # Verify session ownership
            session = await db.get(AISession, session_id)
            if not session or session.user_id != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Session not found"
                )
        
        # Calculate transcription cost
        transcription_cost = int(whisper_service.estimate_cost(transcription_result['duration']) * 100)
        
        # Save voice message
        voice_message = Message(
            session_id=session_id,
            user_id=current_user.id,
            content=transcribed_text,
            role=MessageRole.USER,
            type=MessageType.VOICE,
            transcription=transcribed_text,
            metadata={
                "duration": transcription_result['duration'],
                "language": transcription_result['language']
            },
            cost=transcription_cost
        )
        db.add(voice_message)
        
        ai_response = None
        if auto_respond and transcribed_text.strip():
            # Get AI response
            messages = [{
                "role": "user",
                "content": transcribed_text
            }]
            
            ai_result = await ai_router.generate_completion(
                messages=messages,
                temperature=0.7,
                task_type="voice_response"
            )
            
            # Calculate AI cost
            ai_cost = ai_router.calculate_cost(
                model=ai_result["model"],
                usage=ai_result["usage"]
            )
            
            # Save AI response
            ai_message = Message(
                session_id=session_id,
                user_id=current_user.id,
                content=ai_result["content"],
                role=MessageRole.ASSISTANT,
                type=MessageType.TEXT,
                ai_model=ai_result["model"],
                tokens_used=ai_result["usage"]["total_tokens"],
                cost=ai_cost
            )
            db.add(ai_message)
            
            ai_response = {
                "content": ai_result["content"],
                "model": ai_result["model"],
                "tokens": ai_result["usage"]["total_tokens"]
            }
            
            # Update session stats
            session.total_messages += 2
            session.total_tokens_used += ai_result["usage"]["total_tokens"]
            session.total_cost += transcription_cost + ai_cost
        else:
            session.total_messages += 1
            session.total_cost += transcription_cost
        
        await db.commit()
        
        return VoiceUploadResponse(
            session_id=session_id,
            transcription=transcription_result,
            ai_response=ai_response,
            total_cost=(transcription_cost + (ai_cost if ai_response else 0)) / 100
        )
        
    except Exception as e:
        logger.error(f"Voice processing error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Voice processing failed: {str(e)}"
        )