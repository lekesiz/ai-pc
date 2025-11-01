import { useState } from 'react'
import { useParams } from 'react-router-dom'

export default function ChatPage() {
  const { sessionId } = useParams()
  const [message, setMessage] = useState('')

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)]">
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">
            {sessionId ? `Chat Session #${sessionId}` : 'New Conversation'}
          </h2>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="text-center text-gray-500 dark:text-gray-400">
            Start a conversation with your AI assistant
          </div>
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-4">
          <div className="flex space-x-4">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500"
            />
            <button
              type="button"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}