export interface User {
  id: number
  email: string
  username: string
  full_name?: string
  is_active: boolean
  is_verified: boolean
  created_at: string
  last_login?: string
  preferred_ai_model: string
  voice_enabled: boolean
  language: string
}

export interface LoginCredentials {
  username: string
  password: string
}

export interface RegisterData {
  email: string
  username: string
  password: string
  full_name?: string
}

export interface Token {
  access_token: string
  refresh_token: string
  token_type: string
}