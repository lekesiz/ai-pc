"""
AI Service for managing multiple AI providers
"""
import asyncio
from typing import Dict, List, Optional, Any
from enum import Enum
import httpx
import json
import logging
from openai import AsyncOpenAI
import google.generativeai as genai
from anthropic import AsyncAnthropic

from app.core.config import settings

logger = logging.getLogger(__name__)


class AIProvider(str, Enum):
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    GOOGLE = "google"


class AIModel(str, Enum):
    # OpenAI models
    GPT_4_TURBO = "gpt-4-turbo-preview"
    GPT_4 = "gpt-4"
    GPT_35_TURBO = "gpt-3.5-turbo"
    
    # Anthropic models
    CLAUDE_3_OPUS = "claude-3-opus-20240229"
    CLAUDE_3_SONNET = "claude-3-sonnet-20240229"
    CLAUDE_3_HAIKU = "claude-3-haiku-20240307"
    
    # Google models
    GEMINI_PRO = "gemini-pro"
    GEMINI_PRO_VISION = "gemini-pro-vision"


class AIRouter:
    """
    Intelligent router for selecting the best AI model based on the task
    """
    
    def __init__(self):
        # Initialize AI clients
        self.openai_client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY) if settings.OPENAI_API_KEY else None
        self.anthropic_client = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY) if settings.ANTHROPIC_API_KEY else None
        
        # Configure Google AI
        if settings.GOOGLE_AI_API_KEY:
            genai.configure(api_key=settings.GOOGLE_AI_API_KEY)
            self.google_client = genai
        else:
            self.google_client = None
        
        # Model capabilities mapping
        self.model_capabilities = {
            AIModel.GPT_4_TURBO: {
                "provider": AIProvider.OPENAI,
                "strengths": ["coding", "analysis", "general"],
                "context_window": 128000,
                "cost_per_1k_input": 0.01,
                "cost_per_1k_output": 0.03
            },
            AIModel.CLAUDE_3_OPUS: {
                "provider": AIProvider.ANTHROPIC,
                "strengths": ["creative_writing", "analysis", "coding"],
                "context_window": 200000,
                "cost_per_1k_input": 0.015,
                "cost_per_1k_output": 0.075
            },
            AIModel.GEMINI_PRO: {
                "provider": AIProvider.GOOGLE,
                "strengths": ["general", "multilingual", "fast"],
                "context_window": 32768,
                "cost_per_1k_input": 0.0005,
                "cost_per_1k_output": 0.0015
            }
        }
    
    def select_best_model(self, task_type: str, context_length: int = 0) -> AIModel:
        """
        Select the best model based on task type and context requirements
        """
        # Task type to model mapping
        task_model_map = {
            "coding": [AIModel.GPT_4_TURBO, AIModel.CLAUDE_3_OPUS],
            "creative_writing": [AIModel.CLAUDE_3_OPUS, AIModel.GPT_4_TURBO],
            "analysis": [AIModel.CLAUDE_3_OPUS, AIModel.GPT_4_TURBO],
            "general": [AIModel.GEMINI_PRO, AIModel.GPT_35_TURBO],
            "translation": [AIModel.GEMINI_PRO, AIModel.GPT_4_TURBO],
            "quick_response": [AIModel.GEMINI_PRO, AIModel.GPT_35_TURBO]
        }
        
        preferred_models = task_model_map.get(task_type, [AIModel.GPT_4_TURBO])
        
        # Filter by context window size
        suitable_models = []
        for model in preferred_models:
            if model in self.model_capabilities:
                cap = self.model_capabilities[model]
                if context_length <= cap["context_window"]:
                    # Check if the provider is available
                    if self._is_provider_available(cap["provider"]):
                        suitable_models.append(model)
        
        # Return the first suitable model or default
        return suitable_models[0] if suitable_models else AIModel.GPT_4_TURBO
    
    def _is_provider_available(self, provider: AIProvider) -> bool:
        """Check if a provider is configured and available"""
        if provider == AIProvider.OPENAI:
            return self.openai_client is not None
        elif provider == AIProvider.ANTHROPIC:
            return self.anthropic_client is not None
        elif provider == AIProvider.GOOGLE:
            return self.google_client is not None
        return False
    
    async def generate_completion(
        self,
        messages: List[Dict[str, str]],
        model: Optional[AIModel] = None,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        task_type: str = "general"
    ) -> Dict[str, Any]:
        """
        Generate completion using the selected or best AI model
        """
        # Calculate context length (rough estimate)
        context_length = sum(len(msg.get("content", "")) for msg in messages)
        
        # Select model if not specified
        if not model:
            model = self.select_best_model(task_type, context_length)
        
        # Get model capabilities
        capabilities = self.model_capabilities.get(model)
        if not capabilities:
            raise ValueError(f"Unknown model: {model}")
        
        provider = capabilities["provider"]
        
        try:
            if provider == AIProvider.OPENAI:
                return await self._openai_completion(messages, model, temperature, max_tokens)
            elif provider == AIProvider.ANTHROPIC:
                return await self._anthropic_completion(messages, model, temperature, max_tokens)
            elif provider == AIProvider.GOOGLE:
                return await self._google_completion(messages, model, temperature, max_tokens)
            else:
                raise ValueError(f"Unsupported provider: {provider}")
        except Exception as e:
            logger.error(f"Error with {provider}: {str(e)}")
            # Try fallback model
            fallback_model = AIModel.GPT_35_TURBO if model != AIModel.GPT_35_TURBO else AIModel.GEMINI_PRO
            if fallback_model != model and self._is_provider_available(self.model_capabilities[fallback_model]["provider"]):
                logger.info(f"Falling back to {fallback_model}")
                return await self.generate_completion(messages, fallback_model, temperature, max_tokens, task_type)
            raise
    
    async def _openai_completion(
        self,
        messages: List[Dict[str, str]],
        model: AIModel,
        temperature: float,
        max_tokens: Optional[int]
    ) -> Dict[str, Any]:
        """Generate completion using OpenAI"""
        if not self.openai_client:
            raise ValueError("OpenAI client not configured")
        
        response = await self.openai_client.chat.completions.create(
            model=model.value,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens or settings.AI_MAX_TOKENS
        )
        
        return {
            "content": response.choices[0].message.content,
            "model": model.value,
            "provider": AIProvider.OPENAI,
            "usage": {
                "prompt_tokens": response.usage.prompt_tokens,
                "completion_tokens": response.usage.completion_tokens,
                "total_tokens": response.usage.total_tokens
            }
        }
    
    async def _anthropic_completion(
        self,
        messages: List[Dict[str, str]],
        model: AIModel,
        temperature: float,
        max_tokens: Optional[int]
    ) -> Dict[str, Any]:
        """Generate completion using Anthropic"""
        if not self.anthropic_client:
            raise ValueError("Anthropic client not configured")
        
        # Convert messages format
        system_message = None
        claude_messages = []
        
        for msg in messages:
            if msg["role"] == "system":
                system_message = msg["content"]
            else:
                claude_messages.append({
                    "role": msg["role"],
                    "content": msg["content"]
                })
        
        response = await self.anthropic_client.messages.create(
            model=model.value,
            messages=claude_messages,
            system=system_message,
            temperature=temperature,
            max_tokens=max_tokens or settings.AI_MAX_TOKENS
        )
        
        return {
            "content": response.content[0].text,
            "model": model.value,
            "provider": AIProvider.ANTHROPIC,
            "usage": {
                "prompt_tokens": response.usage.input_tokens,
                "completion_tokens": response.usage.output_tokens,
                "total_tokens": response.usage.input_tokens + response.usage.output_tokens
            }
        }
    
    async def _google_completion(
        self,
        messages: List[Dict[str, str]],
        model: AIModel,
        temperature: float,
        max_tokens: Optional[int]
    ) -> Dict[str, Any]:
        """Generate completion using Google Gemini"""
        if not self.google_client:
            raise ValueError("Google client not configured")
        
        # Convert messages to Gemini format
        gemini_model = genai.GenerativeModel(model.value)
        
        # Combine messages into a single prompt
        prompt_parts = []
        for msg in messages:
            role = "User" if msg["role"] == "user" else "Assistant"
            prompt_parts.append(f"{role}: {msg['content']}")
        
        prompt = "\n\n".join(prompt_parts)
        
        # Generate response
        response = await asyncio.to_thread(
            gemini_model.generate_content,
            prompt,
            generation_config=genai.types.GenerationConfig(
                temperature=temperature,
                max_output_tokens=max_tokens or settings.AI_MAX_TOKENS
            )
        )
        
        return {
            "content": response.text,
            "model": model.value,
            "provider": AIProvider.GOOGLE,
            "usage": {
                "prompt_tokens": response.usage_metadata.prompt_token_count,
                "completion_tokens": response.usage_metadata.candidates_token_count,
                "total_tokens": response.usage_metadata.total_token_count
            }
        }
    
    def calculate_cost(self, model: AIModel, usage: Dict[str, int]) -> float:
        """Calculate the cost of an AI request in cents"""
        capabilities = self.model_capabilities.get(model)
        if not capabilities:
            return 0
        
        input_cost = (usage["prompt_tokens"] / 1000) * capabilities["cost_per_1k_input"]
        output_cost = (usage["completion_tokens"] / 1000) * capabilities["cost_per_1k_output"]
        
        return round((input_cost + output_cost) * 100, 2)  # Convert to cents


# Singleton instance
ai_router = AIRouter()