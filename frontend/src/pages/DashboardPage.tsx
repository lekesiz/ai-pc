import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { 
  ChatBubbleLeftRightIcon, 
  CpuChipIcon, 
  ClockIcon,
  CurrencyDollarIcon,
  PlusIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'
import { api } from '@/services/api'
import { useAuthStore } from '@/stores/authStore'
import { formatDistanceToNow } from 'date-fns'

export default function DashboardPage() {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)

  // Fetch user's recent sessions
  const { data: sessions, isLoading } = useQuery({
    queryKey: ['sessions', 'recent'],
    queryFn: async () => {
      const response = await api.get('/api/ai/sessions?limit=5')
      return response.data
    },
  })

  const stats = [
    {
      name: 'Total Sessions',
      value: sessions?.length || 0,
      icon: ChatBubbleLeftRightIcon,
      color: 'bg-blue-500',
    },
    {
      name: 'AI Model',
      value: user?.preferred_ai_model || 'GPT-4',
      icon: CpuChipIcon,
      color: 'bg-purple-500',
    },
    {
      name: 'Total Tokens',
      value: sessions?.reduce((acc: number, s: any) => acc + s.total_tokens_used, 0) || 0,
      icon: SparklesIcon,
      color: 'bg-green-500',
    },
    {
      name: 'Total Cost',
      value: `$${(sessions?.reduce((acc: number, s: any) => acc + s.total_cost, 0) || 0).toFixed(2)}`,
      icon: CurrencyDollarIcon,
      color: 'bg-yellow-500',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Welcome back, {user?.full_name || user?.username}!
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Here's what's happening with your AI assistant today.
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button
            onClick={() => navigate('/chat')}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
            New Chat
          </button>
        </div>
      </div>

      {/* Stats */}
      <dl className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.name}
            className="relative bg-white dark:bg-gray-800 pt-5 px-4 pb-12 sm:pt-6 sm:px-6 shadow rounded-lg overflow-hidden"
          >
            <dt>
              <div className={`absolute rounded-md p-3 ${stat.color}`}>
                <stat.icon className="h-6 w-6 text-white" aria-hidden="true" />
              </div>
              <p className="ml-16 text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                {stat.name}
              </p>
            </dt>
            <dd className="ml-16 pb-6 flex items-baseline sm:pb-7">
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {stat.value}
              </p>
            </dd>
          </div>
        ))}
      </dl>

      {/* Recent Sessions */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
            Recent Conversations
          </h3>
        </div>
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {isLoading ? (
            <div className="px-4 py-5 sm:px-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
              </div>
            </div>
          ) : sessions?.length > 0 ? (
            sessions.map((session: any) => (
              <div
                key={session.id}
                className="px-4 py-4 sm:px-6 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                onClick={() => navigate(`/chat/${session.id}`)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {session.title || 'Untitled Chat'}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {session.total_messages} messages • {session.ai_model}
                    </p>
                  </div>
                  <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                    <ClockIcon className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
                    {formatDistanceToNow(new Date(session.started_at), { addSuffix: true })}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="px-4 py-5 sm:px-6 text-center">
              <p className="text-gray-500 dark:text-gray-400">
                No conversations yet. Start a new chat to get started!
              </p>
            </div>
          )}
        </div>
        {sessions?.length > 0 && (
          <div className="bg-gray-50 dark:bg-gray-900 px-4 py-3 sm:px-6">
            <button
              onClick={() => navigate('/chat')}
              className="text-sm font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300"
            >
              View all conversations →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}