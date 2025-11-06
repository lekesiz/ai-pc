import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Bars3Icon, SignalIcon, SignalSlashIcon } from '@heroicons/react/24/outline'
import { useChatStore } from '@/stores/chatStore'
import { wsService, type WebSocketMessage } from '@/services/websocketService'
import type { Message } from '@/types/chat'
import ChatSidebar from '@/components/chat/ChatSidebar'
import ChatInput from '@/components/chat/ChatInput'
import MessageList from '@/components/chat/MessageList'
import VoiceRecordingModal from '@/components/voice/VoiceRecordingModal'
import toast from 'react-hot-toast'

export default function ChatPage() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showVoiceModal, setShowVoiceModal] = useState(false)
  const [wsConnected, setWsConnected] = useState(false)
  const [isAiThinking, setIsAiThinking] = useState(false)

  const {
    sessions,
    currentSession,
    messages,
    isSending,
    error,
    loadSessions,
    loadSession,
    createSession,
    deleteSession,
    sendMessage,
    addMessage,
    setIsSending,
    clearError
  } = useChatStore()

  // Setup WebSocket handlers
  useEffect(() => {
    const handleConnected = () => {
      setWsConnected(true)
      console.log('WebSocket connected')
    }

    const handleDisconnected = () => {
      setWsConnected(false)
      console.log('WebSocket disconnected')
    }

    const handleError = (data: WebSocketMessage) => {
      toast.error(data.message || 'WebSocket error')
      setIsAiThinking(false)
      setIsSending(false)
    }

    const handleMessageSaved = (data: WebSocketMessage) => {
      // User message was saved
      if (data.message) {
        addMessage(data.message as Message)
      }
    }

    const handleAiThinking = () => {
      setIsAiThinking(true)
    }

    const handleAiResponse = (data: WebSocketMessage) => {
      setIsAiThinking(false)
      setIsSending(false)

      // Add AI response message
      if (data.message) {
        addMessage(data.message as Message)
      }

      // Update session stats in the list
      if (currentSession && data.session_id === currentSession.id) {
        const updatedSession = {
          ...currentSession,
          total_messages: currentSession.total_messages + 2,
          total_tokens_used: currentSession.total_tokens_used + (data.message.tokens_used || 0),
          total_cost: currentSession.total_cost + (data.message.cost || 0)
        }
        useChatStore.setState({ currentSession: updatedSession })
      }
    }

    // Register event handlers
    wsService.on('connected', handleConnected)
    wsService.on('disconnected', handleDisconnected)
    wsService.on('error', handleError)
    wsService.on('message_saved', handleMessageSaved)
    wsService.on('ai_thinking', handleAiThinking)
    wsService.on('ai_response', handleAiResponse)

    // Connect WebSocket
    wsService.connect()

    // Cleanup
    return () => {
      wsService.off('connected', handleConnected)
      wsService.off('disconnected', handleDisconnected)
      wsService.off('error', handleError)
      wsService.off('message_saved', handleMessageSaved)
      wsService.off('ai_thinking', handleAiThinking)
      wsService.off('ai_response', handleAiResponse)
      wsService.disconnect()
    }
  }, [currentSession, addMessage, setIsSending])

  // Load sessions on mount
  useEffect(() => {
    loadSessions()
  }, [loadSessions])

  // Load session and join WebSocket room when sessionId changes
  useEffect(() => {
    if (sessionId) {
      const id = parseInt(sessionId)
      loadSession(id)

      // Join WebSocket session room
      if (wsService.isConnected) {
        wsService.joinSession(id)
      } else {
        // Wait for connection then join
        const joinWhenReady = () => {
          wsService.joinSession(id)
          wsService.off('connected', joinWhenReady)
        }
        wsService.on('connected', joinWhenReady)
      }
    } else {
      // Clear current session if no sessionId
      useChatStore.setState({ currentSession: null, messages: [] })
    }
  }, [sessionId, loadSession])

  // Handle errors
  useEffect(() => {
    if (error) {
      toast.error(error)
      clearError()
    }
  }, [error, clearError])

  const handleSendMessage = async (message: string) => {
    try {
      // If no current session, create one first
      if (!currentSession && !sessionId) {
        const newSession = await createSession(message.substring(0, 50))
        navigate(`/chat/${newSession.id}`)
        // Wait for session to be set and then send via WebSocket
        return
      }

      // Use WebSocket if connected, otherwise fallback to HTTP
      if (wsConnected && currentSession) {
        setIsSending(true)

        // Add user message optimistically
        const tempUserMessage: Partial<Message> = {
          content: message,
          role: 'user',
          type: 'text',
          created_at: new Date().toISOString(),
          tokens_used: 0,
          cost: 0
        }
        addMessage(tempUserMessage as Message)

        // Send via WebSocket
        const success = wsService.sendMessage(message)
        if (!success) {
          toast.error('Failed to send message - WebSocket not ready')
          setIsSending(false)
        }
      } else {
        // Fallback to HTTP
        await sendMessage(message)
      }
    } catch (error: any) {
      toast.error('Failed to send message')
      setIsSending(false)
    }
  }

  const handleNewChat = () => {
    navigate('/chat')
  }

  const handleSelectSession = (sessionId: number) => {
    navigate(`/chat/${sessionId}`)
    setSidebarOpen(false)
  }

  const handleDeleteSession = async (sessionId: number) => {
    if (window.confirm('Are you sure you want to delete this conversation?')) {
      await deleteSession(sessionId)
      if (currentSession?.id === sessionId) {
        navigate('/chat')
      }
      toast.success('Conversation deleted')
    }
  }

  const handleVoiceRecord = () => {
    setShowVoiceModal(true)
  }

  const handleVoiceTranscription = (transcription: string) => {
    handleSendMessage(transcription)
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] -m-4 sm:-m-6 lg:-m-8">
      <ChatSidebar
        sessions={sessions}
        currentSessionId={currentSession?.id}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onSelectSession={handleSelectSession}
        onNewChat={handleNewChat}
        onDeleteSession={handleDeleteSession}
      />

      {/* Main chat area */}
      <div className="flex flex-1 flex-col lg:pl-80">
        {/* Header */}
        <div className="sticky top-0 z-40 flex items-center gap-x-6 bg-white dark:bg-gray-900 px-4 py-4 shadow-sm sm:px-6">
          <button
            type="button"
            className="-m-2.5 p-2.5 text-gray-700 dark:text-gray-300 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <span className="sr-only">Open sidebar</span>
            <Bars3Icon className="h-6 w-6" aria-hidden="true" />
          </button>

          <div className="flex-1 text-sm leading-6">
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
              {currentSession?.title || 'New Conversation'}
            </h1>
            {currentSession && (
              <p className="text-gray-500 dark:text-gray-400">
                {messages.length} messages • {currentSession.ai_model}
              </p>
            )}
          </div>

          {/* Connection Status Indicator */}
          <div className="flex items-center gap-2">
            {wsConnected ? (
              <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                <SignalIcon className="h-5 w-5" />
                <span className="text-xs font-medium hidden sm:inline">Connected</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-gray-400 dark:text-gray-500">
                <SignalSlashIcon className="h-5 w-5" />
                <span className="text-xs font-medium hidden sm:inline">Offline</span>
              </div>
            )}

            {isAiThinking && (
              <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                <span className="text-xs font-medium hidden sm:inline">AI is thinking...</span>
              </div>
            )}
          </div>

          {/* Model selector */}
          <select
            className="rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
            defaultValue={currentSession?.ai_model || 'gpt-3.5-turbo'}
          >
            <option value="gpt-3.5-turbo">GPT-3.5 Turbo (Recommended)</option>
            <option value="gpt-4-turbo-preview">GPT-4 Turbo</option>
            <option value="claude-3-opus-20240229">Claude 3 Opus</option>
            <option value="gemini-pro">Gemini Pro</option>
          </select>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-hidden bg-white dark:bg-gray-900">
          <MessageList 
            messages={messages} 
            isLoading={isSending}
          />
        </div>

        {/* Input */}
        <ChatInput
          onSendMessage={handleSendMessage}
          onVoiceRecord={handleVoiceRecord}
          isDisabled={isSending}
        />
      </div>

      {/* Voice Recording Modal */}
      <VoiceRecordingModal
        isOpen={showVoiceModal}
        onClose={() => setShowVoiceModal(false)}
        onSendTranscription={handleVoiceTranscription}
        sessionId={currentSession?.id}
      />
    </div>
  )
}