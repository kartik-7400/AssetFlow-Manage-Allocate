import React, { useState, useEffect } from 'react'

interface MockUser {
  clerkId: string
  name: string
  email: string
  role: 'ADMINISTRATOR' | 'CONSUMER'
  avatar: string
}

const MOCK_USERS: MockUser[] = [
  {
    clerkId: 'mock_admin',
    name: 'Sarah Connor (Admin)',
    email: 'admin@assetflow.com',
    role: 'ADMINISTRATOR',
    avatar:
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  },
  {
    clerkId: 'mock_crew_1',
    name: 'John Doe (Crew)',
    email: 'john@assetflow.com',
    role: 'CONSUMER',
    avatar:
      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
  },
  {
    clerkId: 'mock_crew_2',
    name: 'Jane Smith (Crew)',
    email: 'jane@assetflow.com',
    role: 'CONSUMER',
    avatar:
      'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
  },
]

interface DevAuthBarProps {
  onUserChange?: () => void
}

export const DevAuthBar: React.FC<DevAuthBarProps> = ({ onUserChange }) => {
  const [activeId, setActiveId] = useState<string>('')
  const [isOpen, setIsOpen] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem('assetflow_mock_clerk_id')
    if (stored) {
      setActiveId(stored)
    } else {
      // Default to admin on first load
      localStorage.setItem('assetflow_mock_clerk_id', MOCK_USERS[0].clerkId)
      setActiveId(MOCK_USERS[0].clerkId)
    }
  }, [])

  const handleSelectUser = (clerkId: string) => {
    localStorage.setItem('assetflow_mock_clerk_id', clerkId)
    setActiveId(clerkId)
    if (onUserChange) {
      onUserChange()
    } else {
      window.location.reload()
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-50 flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 border border-slate-700 text-slate-400 hover:text-white shadow-lg transition-all"
        title="Open Dev Sandbox Auth Toolbar"
      >
        🛠️
      </button>
    )
  }

  const currentUser = MOCK_USERS.find((u) => u.clerkId === activeId) || MOCK_USERS[0]

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 px-4 py-2.5 rounded-full bg-slate-950/90 backdrop-blur-md border border-slate-800 shadow-2xl text-xs text-slate-300 font-medium">
      <div className="flex items-center gap-2">
        <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-slate-400 font-mono">Sandbox:</span>
        <img
          src={currentUser.avatar}
          alt={currentUser.name}
          className="h-5 w-5 rounded-full border border-slate-700"
        />
        <span className="text-slate-200">{currentUser.name}</span>
        <span
          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
            currentUser.role === 'ADMINISTRATOR'
              ? 'bg-purple-950 text-purple-300 border border-purple-800'
              : 'bg-blue-950 text-blue-300 border border-blue-800'
          }`}
        >
          {currentUser.role}
        </span>
      </div>

      <div className="h-4 w-px bg-slate-800" />

      <div className="flex items-center gap-2">
        <span className="text-slate-400">Switch user:</span>
        <div className="flex gap-1">
          {MOCK_USERS.map((user) => (
            <button
              key={user.clerkId}
              onClick={() => handleSelectUser(user.clerkId)}
              className={`px-2 py-1 rounded transition-all ${
                activeId === user.clerkId
                  ? 'bg-slate-800 text-white border border-slate-700 font-semibold'
                  : 'bg-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
              }`}
            >
              {user.name.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>

      <div className="h-4 w-px bg-slate-800" />

      <button
        onClick={() => setIsOpen(false)}
        className="text-slate-500 hover:text-slate-300 transition-colors"
        title="Hide Dev Auth Bar"
      >
        ✕
      </button>
    </div>
  )
}
export default DevAuthBar
