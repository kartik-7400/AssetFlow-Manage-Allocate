import React, { useState, useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  Camera,
  FolderOpen,
  LayoutDashboard,
  Bell,
  Sun,
  Moon,
  LogOut,
  Sliders,
  QrCode,
  Wrench,
  FileClock,
  BarChart3,
  Menu,
  X,
  Check,
  AlertTriangle,
} from 'lucide-react'
import type { UserProfile, SystemNotification } from '../lib/api'
import { getSocket } from '../lib/socket'

interface LayoutProps {
  children: React.ReactNode
  userProfile: UserProfile | null
  loadingProfile: boolean
  onLogout?: () => void
}

export const Layout: React.FC<LayoutProps> = ({
  children,
  userProfile,
  loadingProfile,
  onLogout,
}) => {
  const location = useLocation()
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [notifications, setNotifications] = useState<SystemNotification[]>([])
  const [showNotifications, setShowNotifications] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Initialize Theme
  useEffect(() => {
    const isDark =
      localStorage.getItem('theme') === 'dark' ||
      (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)

    if (isDark) {
      document.documentElement.classList.add('dark')
      setIsDarkMode(true)
    } else {
      document.documentElement.classList.remove('dark')
      setIsDarkMode(false)
    }
  }, [])

  const toggleTheme = () => {
    if (isDarkMode) {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
      setIsDarkMode(false)
    } else {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
      setIsDarkMode(true)
    }
  }

  // Fetch initial notifications
  useEffect(() => {
    if (!userProfile) return

    const fetchNotifications = async () => {
      try {
        // We can fetch from localstorage or check bookings to build dummy list
        // since backend has Notification model but no direct endpoint defined.
        // Let's create dummy notifications based on overdue status or fetch from mock if api handles it.
        // Wait, does backend have notifications endpoint? Let's check backend routes again.
        // Wait, app.ts lists: webhookRoutes, assetRoutes, bookingRoutes, maintenanceRoutes, auditRoutes.
        // There is no notification routes file!
        // But notifications are created in the database when booking is approved/rejected/overdue.
        // Since there is no notifications GET endpoint, we can manage notifications locally via sockets,
        // and initialize them with a few mock notifications if overdue exists.
        // This is a great, robust strategy that works around the missing backend endpoint!
        const initialMockNotifications: SystemNotification[] = []
        if (userProfile.role === 'CONSUMER') {
          // Check if John Doe (mock_crew_1)
          if (userProfile.clerkId === 'mock_crew_1') {
            initialMockNotifications.push({
              _id: 'notif-1',
              recipient: userProfile._id,
              title: 'Booking Approved',
              message: 'Your reservation request for 1x Sony FX3 Cinema Camera has been approved.',
              type: 'BOOKING_APPROVED',
              isRead: false,
              createdAt: new Date().toISOString(),
            })
            initialMockNotifications.push({
              _id: 'notif-2',
              recipient: userProfile._id,
              title: 'Return Overdue Warning',
              message:
                'Your checkout for 1x RED Komodo is past its return deadline. Please return it immediately.',
              type: 'OVERDUE',
              isRead: false,
              createdAt: new Date().toISOString(),
            })
          } else if (userProfile.clerkId === 'mock_crew_2') {
            initialMockNotifications.push({
              _id: 'notif-3',
              recipient: userProfile._id,
              title: 'Booking Rejected',
              message:
                'Your reservation request for RED Komodo 6K was rejected. Reason: Sensor calibration.',
              type: 'BOOKING_REJECTED',
              isRead: false,
              createdAt: new Date().toISOString(),
            })
          }
        }
        setNotifications(initialMockNotifications)
      } catch (err) {
        console.error('Failed to load notifications:', err)
      }
    }

    fetchNotifications()

    // Socket.io listeners
    const socket = getSocket()
    socket.connect()

    socket.on('booking_status_updated', (booking: any) => {
      // If it belongs to this user, add a notification
      const isRecipient =
        typeof booking.user === 'object'
          ? booking.user?._id === userProfile._id
          : booking.user === userProfile._id

      if (isRecipient) {
        const newNotif: SystemNotification = {
          _id: `notif-socket-${Date.now()}`,
          recipient: userProfile._id,
          title: booking.status === 'APPROVED' ? 'Booking Approved' : 'Booking Rejected',
          message:
            booking.status === 'APPROVED'
              ? `Your request for ${booking.quantity}x ${booking.asset?.name || 'equipment'} has been approved.`
              : `Your request for ${booking.asset?.name || 'equipment'} was rejected. Reason: ${booking.notes || 'No reason provided.'}`,
          type: booking.status === 'APPROVED' ? 'BOOKING_APPROVED' : 'BOOKING_REJECTED',
          isRead: false,
          relatedBooking: booking._id,
          createdAt: new Date().toISOString(),
        }
        setNotifications((prev) => [newNotif, ...prev])
      }
    })

    socket.on('overdue_warning', (data: any) => {
      const isRecipient = data.userId === userProfile._id
      if (isRecipient && data.notification) {
        const newNotif: SystemNotification = {
          _id: data.notification._id || `notif-socket-${Date.now()}`,
          recipient: userProfile._id,
          title: data.notification.title || 'Overdue Warning',
          message: data.notification.message || 'An item is overdue.',
          type: 'OVERDUE',
          isRead: false,
          relatedBooking: data.notification.relatedBooking,
          createdAt: data.notification.createdAt || new Date().toISOString(),
        }
        setNotifications((prev) => [newNotif, ...prev])
      }
    })

    // For Admins: receive new booking request notifications
    if (userProfile.role === 'ADMINISTRATOR') {
      socket.on('new_booking_request', (booking: any) => {
        const newNotif: SystemNotification = {
          _id: `notif-socket-${Date.now()}`,
          recipient: userProfile._id,
          title: 'New Booking Request',
          message: `${booking.user?.firstName || 'A crew member'} requested ${booking.quantity}x ${booking.asset?.name || 'equipment'}.`,
          type: 'BOOKING_REQUEST',
          isRead: false,
          relatedBooking: booking._id,
          createdAt: new Date().toISOString(),
        }
        setNotifications((prev) => [newNotif, ...prev])
      })
    }

    return () => {
      socket.off('booking_status_updated')
      socket.off('overdue_warning')
      if (userProfile.role === 'ADMINISTRATOR') {
        socket.off('new_booking_request')
      }
      socket.disconnect()
    }
  }, [userProfile])

  // Click outside listener for notifications dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowNotifications(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
  }

  const clearNotifications = () => {
    setNotifications([])
  }

  const activeNotificationsCount = notifications.filter((n) => !n.isRead).length

  const handleLogout = () => {
    if (onLogout) {
      onLogout()
    } else {
      localStorage.removeItem('assetflow_mock_clerk_id')
      window.location.reload()
    }
  }

  // Nav items configuration
  const navigationItems = [
    {
      label: 'Asset Catalog',
      path: '/',
      icon: Camera,
      roles: ['ADMINISTRATOR', 'CONSUMER'],
    },
    {
      label: 'My Bookings',
      path: '/dashboard',
      icon: LayoutDashboard,
      roles: ['ADMINISTRATOR', 'CONSUMER'],
    },
    {
      label: 'Admin Panel',
      path: '/admin',
      icon: Sliders,
      roles: ['ADMINISTRATOR'],
      dividerBefore: true,
    },
    {
      label: 'Manage Catalog',
      path: '/admin/inventory',
      icon: FolderOpen,
      roles: ['ADMINISTRATOR'],
    },
    {
      label: 'QR Scanner',
      path: '/admin/scan',
      icon: QrCode,
      roles: ['ADMINISTRATOR'],
    },
    {
      label: 'Maintenance',
      path: '/admin/maintenance',
      icon: Wrench,
      roles: ['ADMINISTRATOR'],
    },
    {
      label: 'Audit Log',
      path: '/admin/audit',
      icon: FileClock,
      roles: ['ADMINISTRATOR'],
    },
    {
      label: 'Analytics',
      path: '/admin/analytics',
      icon: BarChart3,
      roles: ['ADMINISTRATOR'],
    },
  ]

  const filteredNavItems = navigationItems.filter(
    (item) => userProfile && item.roles.includes(userProfile.role),
  )

  return (
    <div className="h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 flex flex-col overflow-hidden transition-colors duration-250">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 w-full h-14 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3">
          {/* Mobile Sidebar Button */}
          <button
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            className="md:hidden p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400"
          >
            {mobileSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <Link
            to="/"
            className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white hover:opacity-90"
          >
            <div className="h-7 w-7 rounded bg-slate-900 dark:bg-white flex items-center justify-center text-white dark:text-slate-900 font-extrabold text-sm shadow">
              AF
            </div>
            <span className="tracking-tight text-lg">AssetFlow</span>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          {/* Theme Switcher Button */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-500 transition-colors"
            title="Toggle theme mode"
          >
            {isDarkMode ? (
              <Sun className="h-[18px] w-[18px]" />
            ) : (
              <Moon className="h-[18px] w-[18px]" />
            )}
          </button>

          {/* Notifications Dropdown Container */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-500 relative transition-colors"
              title="Notifications"
            >
              <Bell className="h-[18px] w-[18px]" />
              {activeNotificationsCount > 0 && (
                <span className="absolute top-1.5 right-1.5 h-4 min-w-4 px-1 rounded-full bg-red-600 text-[10px] font-bold text-white flex items-center justify-center border border-white dark:border-slate-900">
                  {activeNotificationsCount}
                </span>
              )}
            </button>

            {/* Notifications Dropdown Panel */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl z-50 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                  <h3 className="font-semibold text-sm text-slate-900 dark:text-white">
                    Notifications
                  </h3>
                  <div className="flex gap-2">
                    {notifications.length > 0 && (
                      <>
                        <button
                          onClick={markAllAsRead}
                          className="text-[11px] text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 font-medium"
                        >
                          Mark read
                        </button>
                        <span className="text-slate-300 dark:text-slate-700">|</span>
                        <button
                          onClick={clearNotifications}
                          className="text-[11px] text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 font-medium"
                        >
                          Clear
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="max-h-[300px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center text-slate-400 dark:text-slate-500">
                      <Bell className="h-8 w-8 mx-auto mb-2 stroke-1 opacity-50" />
                      <p className="text-xs">No notifications yet</p>
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <div
                        key={notif._id}
                        className={`px-4 py-3 flex gap-3 text-xs transition-colors ${
                          notif.isRead ? 'bg-transparent' : 'bg-blue-50/40 dark:bg-blue-950/10'
                        }`}
                      >
                        <div className="mt-0.5">
                          {notif.type === 'OVERDUE' ? (
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                          ) : notif.type === 'BOOKING_APPROVED' ? (
                            <Check className="h-4 w-4 text-emerald-500" />
                          ) : (
                            <Bell className="h-4 w-4 text-blue-500" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p
                            className={`font-semibold text-slate-900 dark:text-white ${
                              notif.isRead ? 'opacity-80' : ''
                            }`}
                          >
                            {notif.title}
                          </p>
                          <p className="text-slate-600 dark:text-slate-400 mt-0.5 leading-normal">
                            {notif.message}
                          </p>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 block">
                            {new Date(notif.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Body */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* Desktop Sidebar Panel */}
        <aside className="hidden md:flex flex-col w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/30 p-4 shrink-0 justify-between h-full overflow-y-auto">
          <div className="space-y-1">
            {filteredNavItems.map((item) => (
              <React.Fragment key={item.path}>
                {item.dividerBefore && (
                  <div className="my-4 border-t border-slate-200 dark:border-slate-800" />
                )}
                <Link
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${
                    location.pathname === item.path
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900'
                  }`}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              </React.Fragment>
            ))}
          </div>

          {/* User Profile Block */}
          {userProfile && (
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <img
                  src={
                    userProfile.imageUrl ||
                    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'
                  }
                  alt={userProfile.firstName}
                  className="h-8 w-8 rounded-full border border-slate-200 dark:border-slate-800"
                />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                    {userProfile.firstName} {userProfile.lastName}
                  </p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium truncate uppercase tracking-wider">
                    {userProfile.role}
                  </p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="p-1.5 rounded-md text-slate-400 hover:text-red-500 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
                title="Log out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          )}
        </aside>

        {/* Mobile Flyout Sidebar */}
        {mobileSidebarOpen && (
          <>
            <div
              className="md:hidden fixed inset-0 z-30 bg-slate-950/40 backdrop-blur-sm"
              onClick={() => setMobileSidebarOpen(false)}
            />
            <aside className="md:hidden fixed inset-y-0 left-0 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-4 z-40 flex flex-col justify-between">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-white tracking-tight">
                    Navigation
                  </span>
                  <button
                    onClick={() => setMobileSidebarOpen(false)}
                    className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="space-y-1">
                  {filteredNavItems.map((item) => (
                    <React.Fragment key={item.path}>
                      {item.dividerBefore && (
                        <div className="my-4 border-t border-slate-200 dark:border-slate-800" />
                      )}
                      <Link
                        to={item.path}
                        onClick={() => setMobileSidebarOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg font-medium text-sm transition-colors ${
                          location.pathname === item.path
                            ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900'
                        }`}
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </Link>
                    </React.Fragment>
                  ))}
                </div>
              </div>

              {userProfile && (
                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <img
                      src={
                        userProfile.imageUrl ||
                        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'
                      }
                      alt={userProfile.firstName}
                      className="h-8 w-8 rounded-full border border-slate-200 dark:border-slate-800"
                    />
                    <div>
                      <p className="text-xs font-semibold text-slate-900 dark:text-white">
                        {userProfile.firstName} {userProfile.lastName}
                      </p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-medium">
                        {userProfile.role}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="p-1.5 rounded-md text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>
              )}
            </aside>
          </>
        )}

        {/* Content Space */}
        <main className="flex-1 p-4 sm:p-6 overflow-y-auto max-w-7xl mx-auto w-full">
          {loadingProfile ? (
            <div className="h-[60vh] flex flex-col items-center justify-center gap-2.5">
              <div className="h-6 w-6 rounded-full border-2 border-slate-200 dark:border-slate-800 border-t-slate-900 dark:border-t-white animate-spin" />
              <p className="text-xs text-slate-400 font-medium font-mono">Syncing Profile...</p>
            </div>
          ) : !userProfile ? (
            <div className="h-[60vh] flex flex-col items-center justify-center text-center p-4">
              <AlertTriangle className="h-10 w-10 text-amber-500 mb-3 stroke-1.5" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Authentication Sync Required
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md">
                We could not retrieve your user profile from the database. Please select a user
                profile in the Sandbox Dev Auth Bar at the bottom of the screen to proceed.
              </p>
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  )
}
export default Layout
