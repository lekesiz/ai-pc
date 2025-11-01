import { io, Socket } from 'socket.io-client'
import { useAuthStore } from '@/stores/authStore'

class WebSocketService {
  private socket: Socket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000

  connect() {
    if (this.socket?.connected) return

    const token = useAuthStore.getState().token
    if (!token) return

    this.socket = io('/', {
      path: '/ws',
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: this.reconnectDelay,
      reconnectionAttempts: this.maxReconnectAttempts,
    })

    this.setupEventListeners()
  }

  private setupEventListeners() {
    if (!this.socket) return

    this.socket.on('connect', () => {
      console.log('WebSocket connected')
      this.reconnectAttempts = 0
    })

    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason)
    })

    this.socket.on('error', (error) => {
      console.error('WebSocket error:', error)
    })

    this.socket.on('message', (data) => {
      // Handle incoming messages
      this.handleMessage(data)
    })

    this.socket.on('ai_progress', (data) => {
      // Handle AI processing progress
      this.handleAIProgress(data)
    })
  }

  private handleMessage(data: any) {
    // Handle different message types
    switch (data.type) {
      case 'chat_update':
        // Update chat in real-time
        break
      case 'notification':
        // Show notification
        break
      default:
        console.log('Received message:', data)
    }
  }

  private handleAIProgress(data: any) {
    // Update UI with AI processing progress
    console.log('AI Progress:', data)
  }

  sendMessage(event: string, data: any) {
    if (!this.socket?.connected) {
      console.error('WebSocket not connected')
      return
    }

    this.socket.emit(event, data)
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
  }

  on(event: string, callback: (data: any) => void) {
    if (!this.socket) return
    this.socket.on(event, callback)
  }

  off(event: string, callback?: (data: any) => void) {
    if (!this.socket) return
    if (callback) {
      this.socket.off(event, callback)
    } else {
      this.socket.off(event)
    }
  }

  get isConnected() {
    return this.socket?.connected || false
  }
}

export const wsService = new WebSocketService()