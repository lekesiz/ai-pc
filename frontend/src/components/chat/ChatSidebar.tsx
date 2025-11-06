import { Fragment, useState } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import {
  XMarkIcon,
  PlusIcon,
  ChatBubbleLeftRightIcon,
  TrashIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline'
import clsx from 'clsx'
import type { Session } from '@/types/chat'

interface ChatSidebarProps {
  sessions: Session[]
  currentSessionId?: number
  isOpen: boolean
  onClose: () => void
  onSelectSession: (sessionId: number) => void
  onNewChat: () => void
  onDeleteSession: (sessionId: number) => void
}

export default function ChatSidebar({
  sessions,
  currentSessionId,
  isOpen,
  onClose,
  onSelectSession,
  onNewChat,
  onDeleteSession
}: ChatSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('')

  const filteredSessions = sessions.filter(session =>
    session.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    session.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const groupSessionsByDate = (sessions: Session[]) => {
    const groups: Record<string, Session[]> = {
      today: [],
      yesterday: [],
      week: [],
      older: []
    }

    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)

    sessions.forEach(session => {
      const sessionDate = new Date(session.started_at)
      
      if (sessionDate >= today) {
        groups.today.push(session)
      } else if (sessionDate >= yesterday) {
        groups.yesterday.push(session)
      } else if (sessionDate >= weekAgo) {
        groups.week.push(session)
      } else {
        groups.older.push(session)
      }
    })

    return groups
  }

  const groupedSessions = groupSessionsByDate(filteredSessions)

  return (
    <>
      <Transition.Root show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50 lg:hidden" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="transition-opacity ease-linear duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="transition-opacity ease-linear duration-300"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-900/80" />
        </Transition.Child>

        <div className="fixed inset-0 flex">
          <Transition.Child
            as={Fragment}
            enter="transition ease-in-out duration-300 transform"
            enterFrom="-translate-x-full"
            enterTo="translate-x-0"
            leave="transition ease-in-out duration-300 transform"
            leaveFrom="translate-x-0"
            leaveTo="-translate-x-full"
          >
            <Dialog.Panel className="relative mr-16 flex w-full max-w-xs flex-1">
              <Transition.Child
                as={Fragment}
                enter="ease-in-out duration-300"
                enterFrom="opacity-0"
                enterTo="opacity-100"
                leave="ease-in-out duration-300"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
              >
                <div className="absolute left-full top-0 flex w-16 justify-center pt-5">
                  <button
                    type="button"
                    className="-m-2.5 p-2.5"
                    onClick={onClose}
                  >
                    <span className="sr-only">Close sidebar</span>
                    <XMarkIcon className="h-6 w-6 text-white" aria-hidden="true" />
                  </button>
                </div>
              </Transition.Child>
              <SidebarContent
                groupedSessions={groupedSessions}
                currentSessionId={currentSessionId}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                onSelectSession={onSelectSession}
                onNewChat={onNewChat}
                onDeleteSession={onDeleteSession}
              />
            </Dialog.Panel>
          </Transition.Child>
        </div>
        </Dialog>
      </Transition.Root>

      {/* Static sidebar for desktop */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-80 lg:flex-col">
        <SidebarContent
          groupedSessions={groupedSessions}
          currentSessionId={currentSessionId}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onSelectSession={onSelectSession}
          onNewChat={onNewChat}
          onDeleteSession={onDeleteSession}
        />
      </div>
    </>
  )
}

function SidebarContent({
  groupedSessions,
  currentSessionId,
  searchQuery,
  setSearchQuery,
  onSelectSession,
  onNewChat,
  onDeleteSession
}: any) {
  return (
    <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white dark:bg-gray-900 px-6 pb-4 ring-1 ring-gray-200 dark:ring-gray-800">
      <div className="flex h-16 shrink-0 items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Conversations
        </h2>
        <button
          onClick={onNewChat}
          className="p-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700"
        >
          <PlusIcon className="h-5 w-5" />
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search conversations..."
          className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      {/* Sessions list */}
      <nav className="flex flex-1 flex-col">
        <ul role="list" className="flex flex-1 flex-col gap-y-7">
          {(Object.entries(groupedSessions) as [string, Session[]][]).map(([group, sessions]) => {
            if (sessions.length === 0) return null

            const groupLabels: Record<string, string> = {
              today: 'Today',
              yesterday: 'Yesterday',
              week: 'This Week',
              older: 'Older'
            }

            return (
              <li key={group}>
                <div className="text-xs font-semibold leading-6 text-gray-500 dark:text-gray-400">
                  {groupLabels[group]}
                </div>
                <ul role="list" className="mt-2 space-y-1">
                  {sessions.map((session) => (
                    <li key={session.id}>
                      <div
                        className={clsx(
                          currentSessionId === session.id
                            ? 'bg-gray-100 dark:bg-gray-800'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-800',
                          'group flex items-center justify-between gap-x-3 rounded-md p-2 text-sm leading-6 cursor-pointer'
                        )}
                        onClick={() => onSelectSession(session.id)}
                      >
                        <div className="flex items-center gap-x-3 flex-1 min-w-0">
                          <ChatBubbleLeftRightIcon className="h-5 w-5 shrink-0 text-gray-400" />
                          <span className="truncate text-gray-700 dark:text-gray-300">
                            {session.title || 'New conversation'}
                          </span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onDeleteSession(session.id)
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                        >
                          <TrashIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </li>
            )
          })}
        </ul>
      </nav>
    </div>
  )
}