import { useAuthStore } from '@/stores/authStore'

export default function SettingsPage() {
  const user = useAuthStore((state) => state.user)

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
            User Settings
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage your account settings and preferences
          </p>
        </div>

        <div className="px-4 py-5 sm:p-6 space-y-6">
          {/* Profile Information */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
              Profile Information
            </h4>
            <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Username
                </dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                  {user?.username}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Email
                </dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                  {user?.email}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Full Name
                </dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                  {user?.full_name || 'Not set'}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Preferred AI Model
                </dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                  {user?.preferred_ai_model}
                </dd>
              </div>
            </dl>
          </div>

          {/* Preferences */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
              Preferences
            </h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-900 dark:text-white">
                  Voice Commands
                </span>
                <button
                  type="button"
                  className={`${
                    user?.voice_enabled ? 'bg-primary-600' : 'bg-gray-200'
                  } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2`}
                >
                  <span
                    className={`${
                      user?.voice_enabled ? 'translate-x-5' : 'translate-x-0'
                    } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}