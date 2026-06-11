import React, { useState, useEffect } from 'react'
import { api } from '../lib/api'
import type { Booking, UserProfile } from '../lib/api'
import { Calendar, Clock, AlertTriangle, FileText } from 'lucide-react'

interface ConsumerDashboardProps {
  userProfile: UserProfile | null
  token?: string | null
}

export const ConsumerDashboard: React.FC<ConsumerDashboardProps> = ({ userProfile, token }) => {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'active' | 'pending' | 'history'>('active')

  const fetchBookings = async () => {
    setLoading(true)
    try {
      const data = await api.getBookings({}, token)
      setBookings(data)
    } catch (err) {
      console.error('Error fetching bookings:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBookings()
  }, [token])

  const activeBookings = bookings.filter((b) => b.status === 'ISSUED' || b.status === 'APPROVED')
  const pendingRequests = bookings.filter((b) => b.status === 'PENDING')
  const pastHistory = bookings.filter((b) =>
    ['RETURNED', 'REJECTED', 'CANCELLED'].includes(b.status),
  )

  // Compute metrics
  const activeCount = bookings.filter((b) => b.status === 'ISSUED').length
  const pendingCount = pendingRequests.length
  const overdueCount = bookings.filter(
    (b) => b.status === 'ISSUED' && new Date(b.endDate) < new Date(),
  ).length

  const getStatusBadgeClass = (status: string, endDateStr?: string) => {
    switch (status) {
      case 'APPROVED':
        return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900'
      case 'PENDING':
        return 'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400 border-amber-200 dark:border-amber-900'
      case 'ISSUED':
        // Check if overdue
        if (endDateStr && new Date(endDateStr) < new Date()) {
          return 'bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400 border-red-200 dark:border-red-900 animate-pulse'
        }
        return 'bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400 border-blue-200 dark:border-blue-900'
      case 'RETURNED':
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-350 border-slate-200 dark:border-slate-800'
      case 'REJECTED':
        return 'bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400 border-red-100 dark:border-red-950'
      default:
        return 'bg-slate-50 text-slate-500 border-slate-200'
    }
  }

  const getStatusLabel = (status: string, endDateStr?: string) => {
    if (status === 'ISSUED') {
      if (endDateStr && new Date(endDateStr) < new Date()) {
        return 'OVERDUE'
      }
      return 'CHECKED OUT'
    }
    return status
  }

  const tabs = [
    { id: 'active', label: 'Active Rentals', count: activeBookings.length },
    { id: 'pending', label: 'Pending Requests', count: pendingCount },
    { id: 'history', label: 'Past History', count: pastHistory.length },
  ]

  const getFilteredBookings = () => {
    if (activeTab === 'active') return activeBookings
    if (activeTab === 'pending') return pendingRequests
    return pastHistory
  }

  return (
    <div className="space-y-6">
      {/* Welcome & User Details Profile Banner */}
      {userProfile && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row items-center gap-4 sm:gap-6 shadow-sm">
          <img
            src={
              userProfile.imageUrl ||
              'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'
            }
            alt={userProfile.firstName}
            className="h-14 w-14 rounded-full border border-slate-200 dark:border-slate-800"
          />
          <div className="text-center sm:text-left flex-1 space-y-0.5">
            <h1 className="text-lg font-bold text-slate-900 dark:text-white">
              Hello, {userProfile.firstName}!
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Welcome to your personal dashboard. Here you can track checked-out gear, reservations,
              and history.
            </p>
          </div>
          <div className="text-xs text-slate-400 dark:text-slate-500 font-mono">
            Role:{' '}
            <span className="font-semibold text-slate-800 dark:text-slate-350">
              {userProfile.role}
            </span>
          </div>
        </div>
      )}

      {/* Overview Cards / Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Active Rentals */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">
              Active Rentals
            </p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{activeCount}</p>
          </div>
          <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50">
            <Clock className="h-5 w-5" />
          </div>
        </div>

        {/* Overdue Items */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">
              Overdue Returns
            </p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{overdueCount}</p>
          </div>
          <div
            className={`p-2.5 rounded-lg border ${
              overdueCount > 0
                ? 'bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border-red-100 dark:border-red-900/50'
                : 'bg-slate-50 dark:bg-slate-950 text-slate-400 border-slate-100 dark:border-slate-800'
            }`}
          >
            <AlertTriangle className="h-5 w-5" />
          </div>
        </div>

        {/* Pending Approval */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">
              Pending Requests
            </p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{pendingCount}</p>
          </div>
          <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/50">
            <FileText className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Tabs list */}
      <div className="flex border-b border-slate-200 dark:border-slate-850">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all relative ${
              activeTab === tab.id
                ? 'border-slate-900 text-slate-900 dark:border-white dark:text-white font-bold'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <span className="flex items-center gap-1.5">
              {tab.label}
              <span
                className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
                  activeTab === tab.id
                    ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white'
                    : 'bg-slate-50 text-slate-400 dark:bg-slate-950 dark:text-slate-600'
                }`}
              >
                {tab.count}
              </span>
            </span>
          </button>
        ))}
      </div>

      {/* Booking List Container */}
      {loading ? (
        <div className="h-[30vh] flex flex-col items-center justify-center gap-2">
          <div className="h-5 w-5 rounded-full border-2 border-slate-200 dark:border-slate-800 border-t-slate-900 dark:border-t-white animate-spin" />
          <p className="text-[10px] text-slate-400 font-mono">Loading bookings...</p>
        </div>
      ) : getFilteredBookings().length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-8 text-center text-slate-400 dark:text-slate-500">
          <FileText className="h-8 w-8 mx-auto mb-2 stroke-1.25 opacity-60" />
          <h3 className="font-semibold text-sm text-slate-800 dark:text-slate-350">
            No reservations here
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-450 mt-1 max-w-sm mx-auto">
            You don't have any bookings listed in this category. Navigate to the Asset Catalog to
            book equipment.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {getFilteredBookings().map((booking) => {
            const asset = typeof booking.asset === 'object' ? booking.asset : null
            if (!asset) return null

            const isOverdue = booking.status === 'ISSUED' && new Date(booking.endDate) < new Date()

            return (
              <div
                key={booking._id}
                className={`bg-white dark:bg-slate-900 border rounded-xl p-4 shadow-sm flex flex-col sm:flex-row justify-between gap-4 transition-all duration-200 ${
                  isOverdue
                    ? 'border-red-200 dark:border-red-950/60 bg-red-50/10 dark:bg-red-950/5'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                {/* Visual Gear & Text description */}
                <div className="flex gap-4 min-w-0">
                  <img
                    src={
                      asset.imageUrl ||
                      'https://images.unsplash.com/photo-1619597455322-4fbbd820250a?w=150&auto=format&fit=crop&q=80'
                    }
                    alt={asset.name}
                    className="h-16 w-16 rounded object-cover border border-slate-200 dark:border-slate-800 shrink-0"
                  />
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[9px] uppercase font-bold tracking-wider text-slate-450 dark:text-slate-500 bg-slate-100 dark:bg-slate-950 px-1.5 py-0.5 rounded">
                        {asset.category}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${getStatusBadgeClass(booking.status, booking.endDate)}`}
                      >
                        {getStatusLabel(booking.status, booking.endDate)}
                      </span>
                    </div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                      {asset.name}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      Quantity:{' '}
                      <span className="font-semibold text-slate-750 dark:text-slate-250">
                        {booking.quantity}x
                      </span>
                    </p>
                  </div>
                </div>

                {/* Dates & Details */}
                <div className="flex flex-row sm:flex-col justify-between sm:text-right border-t sm:border-t-0 border-slate-100 dark:border-slate-800/50 pt-3 sm:pt-0 gap-2 font-medium">
                  {/* Date Range block */}
                  <div className="space-y-0.5">
                    <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block">
                      Booking Window
                    </span>
                    <span className="text-xs text-slate-700 dark:text-slate-300 flex items-center sm:justify-end gap-1 font-mono">
                      <Calendar className="h-3 w-3" />
                      {new Date(booking.startDate).toLocaleDateString()} -{' '}
                      {new Date(booking.endDate).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Dynamic Status message depending on booking state */}
                  <div className="space-y-0.5 text-right">
                    {booking.status === 'ISSUED' && (
                      <>
                        <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block">
                          Checkout details
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 block font-mono">
                          Checked out:{' '}
                          {booking.issuedAt
                            ? new Date(booking.issuedAt).toLocaleDateString()
                            : 'N/A'}
                        </span>
                      </>
                    )}

                    {booking.status === 'RETURNED' && (
                      <>
                        <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block">
                          Return details
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 block font-mono">
                          Returned:{' '}
                          {booking.returnedAt
                            ? new Date(booking.returnedAt).toLocaleDateString()
                            : 'N/A'}
                        </span>
                      </>
                    )}

                    {booking.status === 'REJECTED' && (
                      <div className="max-w-[200px] text-left sm:text-right">
                        <span className="text-[10px] uppercase font-bold text-red-500 dark:text-red-400 block">
                          Rejection Reason
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 leading-tight block">
                          {booking.notes || 'Equipment needed for maintenance'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
export default ConsumerDashboard
