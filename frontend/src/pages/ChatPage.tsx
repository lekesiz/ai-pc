import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Bars3Icon } from '@heroicons/react/24/outline'
import { useChatStore } from '@/stores/chatStore'
import { wsService } from '@/services/websocketService'
import ChatSidebar from '@/components/chat/ChatSidebar'
import ChatInput from '@/components/chat/ChatInput'
import MessageList from '@/components/chat/MessageList'
import toast from 'react-hot-toast'

export default function ChatPage() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isRecording, setIsRecording] = useState(false)

  const {
    sessions,
    currentSession,
    messages,
    isLoading,
    isSending,
    error,
    loadSessions,
    loadSession,
    createSession,
    deleteSession,
    sendMessage,
    clearError
  } = useChatStore()

  // Load sessions on mount
  useEffect(() => {
    loadSessions()
    wsService.connect()

    return () => {
      // Cleanup
    }
  }, [])

  // Load session when sessionId changes
  useEffect(() => {
    if (sessionId) {
      loadSession(parseInt(sessionId))
    } else {
      // Clear current session if no sessionId
      useChatStore.setState({ currentSession: null, messages: [] })
    }
  }, [sessionId])

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
      }
      
      await sendMessage(message)
    } catch (error: any) {
      toast.error('Failed to send message')
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
    setIsRecording(!isRecording)
    // TODO: Implement voice recording
    toast.info('Voice recording coming soon!')
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

          {/* Model selector */}
          <select
            className="rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
            defaultValue={currentSession?.ai_model || 'gpt-4-turbo-preview'}
          >
            <option value="gpt-4-turbo-preview">GPT-4 Turbo</option>
            <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
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
          isRecording={isRecording}
        />
      </div>
    </div>
  )
}