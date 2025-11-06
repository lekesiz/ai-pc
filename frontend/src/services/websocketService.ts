import { useAuthStore } from '@/stores/authStore'

export type WebSocketMessage = {
  type: string
  [key: string]: any
}

type MessageHandler = (data: WebSocketMessage) => void

class WebSocketService {
  private ws: WebSocket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null
  private pingInterval: ReturnType<typeof setInterval> | null = null
  private messageHandlers: Map<string, Set<MessageHandler>> = new Map()
  private currentSessionId: number | null = null

  connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return
    }

    const token = useAuthStore.getState().token
    if (!token) {
      console.error('No auth token available for WebSocket')
      return
    }

    // Use ws:// for local dev, wss:// for production
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = import.meta.env.VITE_API_URL
      ? new URL(import.meta.env.VITE_API_URL).host
      : window.location.host

    const wsUrl = `${protocol}//${host}/api/ws/connect?token=${encodeURIComponent(token)}`

    try {
      this.ws = new WebSocket(wsUrl)
      this.setupEventListeners()
    } catch (error) {
      console.error('WebSocket connection error:', error)
      this.scheduleReconnect()
    }
  }

  private setupEventListeners() {
    if (!this.ws) return

    this.ws.onopen = () => {
      console.log('✅ WebSocket connected')
      this.reconnectAttempts = 0
      this.startPingInterval()
      this.notifyHandlers('connected', { type: 'connected' })

      // Rejoin current session if exists
      if (this.currentSessionId) {
        this.joinSession(this.currentSessionId)
      }
    }

    this.ws.onclose = (event) => {
      console.log('❌ WebSocket disconnected:', event.code, event.reason)
      this.cleanup()
      this.notifyHandlers('disconnected', { type: 'disconnected' })

      // Attempt reconnection if not a normal closure
      if (event.code !== 1000) {
        this.scheduleReconnect()
      }
    }

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error)
      this.notifyHandlers('error', { type: 'error', error })
    }

    this.ws.onmessage = (event) => {
      try {
        const data: WebSocketMessage = JSON.parse(event.data)
        this.handleMessage(data)
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error)
      }
    }
  }

  private handleMessage(data: WebSocketMessage) {
    console.log('📨 WebSocket message:', data.type, data)

    // Notify type-specific handlers
    this.notifyHandlers(data.type, data)

    // Notify global handlers
    this.notifyHandlers('*', data)
  }

  private notifyHandlers(type: string, data: WebSocketMessage) {
    const handlers = this.messageHandlers.get(type)
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data)
        } catch (error) {
          console.error(`Error in WebSocket handler for ${type}:`, error)
        }
      })
    }
  }

  private startPingInterval() {
    this.stopPingInterval()
    this.pingInterval = setInterval(() => {
      this.send({ type: 'ping' })
    }, 30000) // Ping every 30 seconds
  }

  private stopPingInterval() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval)
      this.pingInterval = null
    }
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached')
      this.notifyHandlers('max_reconnect_attempts', { type: 'max_reconnect_attempts' })
      return
    }

    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts)
    console.log(`Reconnecting in ${delay}ms... (attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`)

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectAttempts++
      this.connect()
    }, delay)
  }

  private cleanup() {
    this.stopPingInterval()
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }
  }

  send(data: any) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('WebSocket not connected, cannot send:', data)
      return false
    }

    try {
      this.ws.send(JSON.stringify(data))
      return true
    } catch (error) {
      console.error('Failed to send WebSocket message:', error)
      return false
    }
  }

  joinSession(sessionId: number) {
    this.currentSessionId = sessionId
    this.send({
      type: 'join_session',
      session_id: sessionId
    })
  }

  sendMessage(content: string) {
    return this.send({
      type: 'send_message',
      content
    })
  }

  sendTyping() {
    this.send({
      type: 'typing'
    })
  }

  disconnect() {
    this.cleanup()
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect')
      this.ws = null
    }
    this.currentSessionId = null
  }

  on(type: string, handler: MessageHandler) {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, new Set())
    }
    this.messageHandlers.get(type)!.add(handler)
  }

  off(type: string, handler?: MessageHandler) {
    if (!handler) {
      this.messageHandlers.delete(type)
    } else {
      const handlers = this.messageHandlers.get(type)
      if (handlers) {
        handlers.delete(handler)
      }
    }
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }

  get connectionState(): 'connecting' | 'open' | 'closing' | 'closed' {
    if (!this.ws) return 'closed'

    switch (this.ws.readyState) {
      case WebSocket.CONNECTING: return 'connecting'
      case WebSocket.OPEN: return 'open'
      case WebSocket.CLOSING: return 'closing'
      case WebSocket.CLOSED: return 'closed'
      default: return 'closed'
    }
  }
}

export const wsService = new WebSocketService()