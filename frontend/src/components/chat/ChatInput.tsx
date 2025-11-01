import { useState, useRef, KeyboardEvent } from 'react'
import { 
  PaperAirplaneIcon, 
  MicrophoneIcon, 
  StopIcon,
  DocumentIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline'
import clsx from 'clsx'

interface ChatInputProps {
  onSendMessage: (message: string) => void
  onVoiceRecord?: () => void
  isDisabled?: boolean
  isRecording?: boolean
}

export default function ChatInput({ 
  onSendMessage, 
  onVoiceRecord, 
  isDisabled,
  isRecording 
}: ChatInputProps) {
  const [message, setMessage] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSubmit = () => {
    if (message.trim() && !isDisabled) {
      onSendMessage(message)
      setMessage('')
      
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value)
    
    // Auto-resize textarea
    const textarea = e.target
    textarea.style.height = 'auto'
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
  }

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
      <div className="flex items-end gap-3">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            disabled={isDisabled}
            rows={1}
            className={clsx(
              'w-full resize-none rounded-lg border border-gray-300 dark:border-gray-600',
              'bg-white dark:bg-gray-700 text-gray-900 dark:text-white',
              'px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-primary-500',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'scrollbar-thin'
            )}
          />
          
          <div className="absolute bottom-2 right-2 flex items-center gap-1">
            <button
              type="button"
              className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-500 dark:text-gray-400"
              title="Attach file"
            >
              <DocumentIcon className="w-5 h-5" />
            </button>
            
            <button
              type="button"
              className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-500 dark:text-gray-400"
              title="Settings"
            >
              <Cog6ToothIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Voice button */}
        {onVoiceRecord && (
          <button
            type="button"
            onClick={onVoiceRecord}
            disabled={isDisabled}
            className={clsx(
              'p-3 rounded-lg transition-colors',
              isRecording 
                ? 'bg-red-600 hover:bg-red-700 text-white' 
                : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
            title={isRecording ? 'Stop recording' : 'Start voice recording'}
          >
            {isRecording ? (
              <StopIcon className="w-5 h-5" />
            ) : (
              <MicrophoneIcon className="w-5 h-5" />
            )}
          </button>
        )}

        {/* Send button */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isDisabled || !message.trim()}
          className={clsx(
            'p-3 rounded-lg bg-primary-600 text-white transition-colors',
            'hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
          title="Send message"
        >
          <PaperAirplaneIcon className="w-5 h-5" />
        </button>
      </div>

      {/* Character count */}
      <div className="mt-2 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <span>
          Press Enter to send, Shift+Enter for new line
        </span>
        <span className={clsx(
          message.length > 4000 && 'text-red-500 dark:text-red-400'
        )}>
          {message.length}/4000
        </span>
      </div>
    </div>
  )
}