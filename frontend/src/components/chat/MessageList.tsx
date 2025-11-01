import { useEffect, useRef } from 'react'
import { format } from 'date-fns'
import clsx from 'clsx'
import { UserCircleIcon, CpuChipIcon, ExclamationCircleIcon } from '@heroicons/react/24/solid'
import { chatService } from '@/services/chatService'
import type { Message } from '@/types/chat'

interface MessageListProps {
  messages: Message[]
  isLoading?: boolean
}

export default function MessageList({ messages, isLoading }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const renderMessage = (message: Message) => {
    const isUser = message.role === 'user'
    const isError = message.role === 'error'
    const modelInfo = message.ai_model ? chatService.getAIModelInfo(message.ai_model) : null

    return (
      <div
        key={message.id || `temp-${Date.now()}`}
        className={clsx(
          'flex gap-3 p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50',
          isUser && 'bg-gray-50 dark:bg-gray-800/30'
        )}
      >
        <div className="flex-shrink-0">
          {isUser ? (
            <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center">
              <UserCircleIcon className="w-5 h-5 text-white" />
            </div>
          ) : isError ? (
            <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center">
              <ExclamationCircleIcon className="w-5 h-5 text-white" />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center">
              <CpuChipIcon className="w-5 h-5 text-white" />
            </div>
          )}
        </div>

        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {isUser ? 'You' : isError ? 'Error' : 'AI Assistant'}
            </span>
            {modelInfo && (
              <span className={clsx('text-xs', modelInfo.color)}>
                {modelInfo.name}
              </span>
            )}
            <span className="text-gray-500 dark:text-gray-400 text-xs">
              {format(new Date(message.created_at), 'HH:mm')}
            </span>
          </div>

          <div
            className={clsx(
              'prose prose-sm max-w-none dark:prose-invert',
              isError && 'text-red-600 dark:text-red-400'
            )}
            dangerouslySetInnerHTML={{
              __html: chatService.formatMessage(message.content)
            }}
          />

          {message.type === 'voice' && message.transcription && (
            <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-sm text-blue-700 dark:text-blue-300">
              <span className="font-medium">Transcribed:</span> {message.transcription}
            </div>
          )}

          {message.tokens_used > 0 && (
            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
              <span>Tokens: {message.tokens_used}</span>
              {message.cost > 0 && <span>Cost: ${message.cost.toFixed(4)}</span>}
            </div>
          )}
        </div>
      </div>
    )
  }

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <CpuChipIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">
            No messages yet
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Start a conversation by typing a message below.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {messages.map(renderMessage)}
        
        {isLoading && (
          <div className="flex gap-3 p-4">
            <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center">
              <CpuChipIcon className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  AI Assistant
                </span>
                <span className="text-gray-500 dark:text-gray-400 text-sm">
                  is thinking...
                </span>
              </div>
              <div className="mt-2 flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}
      </div>
      <div ref={messagesEndRef} />
    </div>
  )
}