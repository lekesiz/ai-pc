export interface Session {
  id: number
  user_id: number
  title?: string
  description?: string
  started_at: string
  ended_at?: string
  is_active: boolean
  ai_model: string
  temperature: number
  max_tokens: number
  total_messages: number
  total_tokens_used: number
  total_cost: number
}

export interface Message {
  id: number
  session_id: number
  user_id: number
  content: string
  role: 'user' | 'assistant' | 'system' | 'error'
  type: 'text' | 'voice' | 'command' | 'file'
  audio_url?: string
  transcription?: string
  ai_model?: string
  tokens_used: number
  cost: number
  created_at: string
}

export interface CreateSessionData {
  title?: string
  description?: string
  ai_model?: string
  temperature?: number
  max_tokens?: number
}

export interface SendMessageData {
  message: string
  session_id?: number
  model?: string
  temperature?: number
  max_tokens?: number
  system_prompt?: string
  task_type?: string
}

export interface AICompletionResponse {
  content: string
  model: string
  provider: string
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
  cost: number
  session_id: number
}