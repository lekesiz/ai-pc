import { create } from 'zustand'
import { chatService } from '@/services/chatService'
import type { Session, Message } from '@/types/chat'

interface ChatState {
  sessions: Session[]
  currentSession: Session | null
  messages: Message[]
  isLoading: boolean
  isSending: boolean
  error: string | null

  // Actions
  loadSessions: () => Promise<void>
  loadSession: (sessionId: number) => Promise<void>
  createSession: (title?: string) => Promise<Session>
  deleteSession: (sessionId: number) => Promise<void>
  sendMessage: (content: string) => Promise<void>
  clearError: () => void
  reset: () => void
}

export const useChatStore = create<ChatState>((set, get) => ({
  sessions: [],
  currentSession: null,
  messages: [],
  isLoading: false,
  isSending: false,
  error: null,

  loadSessions: async () => {
    set({ isLoading: true, error: null })
    try {
      const sessions = await chatService.getSessions()
      set({ sessions, isLoading: false })
    } catch (error: any) {
      set({ error: error.message, isLoading: false })
    }
  },

  loadSession: async (sessionId: number) => {
    set({ isLoading: true, error: null })
    try {
      const [session, messages] = await Promise.all([
        chatService.getSession(sessionId),
        chatService.getMessages(sessionId)
      ])
      set({ 
        currentSession: session, 
        messages, 
        isLoading: false 
      })
    } catch (error: any) {
      set({ error: error.message, isLoading: false })
    }
  },

  createSession: async (title?: string) => {
    set({ isLoading: true, error: null })
    try {
      const session = await chatService.createSession({ title })
      set((state) => ({
        sessions: [session, ...state.sessions],
        currentSession: session,
        messages: [],
        isLoading: false
      }))
      return session
    } catch (error: any) {
      set({ error: error.message, isLoading: false })
      throw error
    }
  },

  deleteSession: async (sessionId: number) => {
    try {
      await chatService.deleteSession(sessionId)
      set((state) => ({
        sessions: state.sessions.filter(s => s.id !== sessionId),
        currentSession: state.currentSession?.id === sessionId ? null : state.currentSession,
        messages: state.currentSession?.id === sessionId ? [] : state.messages
      }))
    } catch (error: any) {
      set({ error: error.message })
    }
  },

  sendMessage: async (content: string) => {
    const { currentSession } = get()
    if (!content.trim()) return

    set({ isSending: true, error: null })

    // Add user message optimistically
    const tempUserMessage: Partial<Message> = {
      content,
      role: 'user',
      type: 'text',
      created_at: new Date().toISOString(),
      tokens_used: 0,
      cost: 0
    }

    set((state) => ({
      messages: [...state.messages, tempUserMessage as Message]
    }))

    try {
      const response = await chatService.sendMessage({
        message: content,
        session_id: currentSession?.id
      })

      // If new session was created, update current session
      if (!currentSession && response.session_id) {
        const newSession = await chatService.getSession(response.session_id)
        set({ currentSession: newSession })
      }

      // Reload messages to get the actual saved messages with IDs
      if (response.session_id) {
        const messages = await chatService.getMessages(response.session_id)
        set({ messages, isSending: false })

        // Update session in the list
        if (currentSession) {
          set((state) => ({
            sessions: state.sessions.map(s => 
              s.id === currentSession.id 
                ? { 
                    ...s, 
                    total_messages: s.total_messages + 2,
                    total_tokens_used: s.total_tokens_used + response.usage.total_tokens,
                    total_cost: s.total_cost + response.cost
                  }
                : s
            )
          }))
        }
      }
    } catch (error: any) {
      // Remove optimistic message on error
      set((state) => ({
        messages: state.messages.slice(0, -1),
        error: error.message,
        isSending: false
      }))
    }
  },

  clearError: () => set({ error: null }),

  reset: () => set({
    sessions: [],
    currentSession: null,
    messages: [],
    isLoading: false,
    isSending: false,
    error: null
  })
}))