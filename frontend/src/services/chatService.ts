import { api } from './api'
import type { Session, Message, CreateSessionData, SendMessageData, AICompletionResponse } from '@/types/chat'

export const chatService = {
  // Sessions
  async getSessions(limit = 20, activeOnly = true): Promise<Session[]> {
    const { data } = await api.get('/api/ai/sessions', {
      params: { limit, active_only: activeOnly }
    })
    return data
  },

  async getSession(sessionId: number): Promise<Session> {
    const { data } = await api.get(`/api/ai/sessions/${sessionId}`)
    return data
  },

  async createSession(data: CreateSessionData): Promise<Session> {
    const { data: session } = await api.post('/api/ai/sessions', data)
    return session
  },

  async deleteSession(sessionId: number): Promise<void> {
    await api.delete(`/api/ai/sessions/${sessionId}`)
  },

  // Messages
  async getMessages(sessionId: number, limit = 50): Promise<Message[]> {
    const { data } = await api.get(`/api/ai/sessions/${sessionId}/messages`, {
      params: { limit }
    })
    return data
  },

  async sendMessage(data: SendMessageData): Promise<AICompletionResponse> {
    const { data: response } = await api.post('/api/ai/process', data)
    return response
  },

  // Helpers
  formatMessage(content: string): string {
    // Basic markdown formatting
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br />')
  },

  calculateSessionCost(messages: Message[]): number {
    return messages.reduce((total, msg) => total + msg.cost, 0)
  },

  getAIModelInfo(model: string) {
    const models: Record<string, { name: string; provider: string; color: string }> = {
      'gpt-4-turbo-preview': { name: 'GPT-4 Turbo', provider: 'OpenAI', color: 'text-green-600' },
      'gpt-4': { name: 'GPT-4', provider: 'OpenAI', color: 'text-green-600' },
      'gpt-3.5-turbo': { name: 'GPT-3.5 Turbo', provider: 'OpenAI', color: 'text-green-600' },
      'claude-3-opus-20240229': { name: 'Claude 3 Opus', provider: 'Anthropic', color: 'text-orange-600' },
      'claude-3-sonnet-20240229': { name: 'Claude 3 Sonnet', provider: 'Anthropic', color: 'text-orange-600' },
      'gemini-pro': { name: 'Gemini Pro', provider: 'Google', color: 'text-blue-600' },
    }
    return models[model] || { name: model, provider: 'Unknown', color: 'text-gray-600' }
  }
}