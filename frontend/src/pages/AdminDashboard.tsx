import React, { useState, useEffect } from 'react'
import { api } from '../lib/api'
import type { Booking } from '../lib/api'
import { TrendingUp, Clock, Wrench, AlertTriangle, Check, X, Send, AlertCircle } from 'lucide-react'

interface AdminDashboardProps {
  token?: string | null
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ token }) => {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [utilizationRate, setUtilizationRate] = useState(0)
  const [repairCount, setRepairCount] = useState(0)

  // Reject Action States
  const [rejectingBookingId, setRejectingBookingId] = useState<string | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [rejecting, setRejecting] = useState(false)

  // Warning Confirmation State
  const [overlapWarningBooking, setOverlapWarningBooking] = useState<Booking | null>(null)
  const [warningMsg, setWarningMsg] = useState('')
  const [forcing, setForcing] = useState(false)

  // Overdue Action Loading States
  const [alertingId, setAlertingId] = useState<string | null>(null)
  const [alertSuccessId, setAlertSuccessId] = useState<string | null>(null)

  const fetchData = async () => {
    setLoading(true)
    try {
      // Fetch bookings (all, since user is Admin)
      const bookingsData = await api.getBookings({}, token)
      setBookings(bookingsData)

      // Fetch assets to compute utilization and repair metrics
      const assetsData = await api.getAssets({}, token)

      let totalQty = 0
      let checkedOutQty = 0
      let inMaintenanceQty = 0

      assetsData.forEach((asset) => {
        totalQty += asset.quantityTotal
        inMaintenanceQty += asset.quantityInMaintenance
      })

      // Checked out qty comes from ISSUED bookings
      bookingsData.forEach((b) => {
        if (b.status === 'ISSUED') {
          checkedOutQty += b.quantity
        }
      })

      setRepairCount(inMaintenanceQty)

      if (totalQty > 0) {
        const rate = Math.round((checkedOutQty / totalQty) * 100)
        setUtilizationRate(rate)
      } else {
        setUtilizationRate(0)
      }
    } catch (err) {
      console.error('Error loading admin dashboard metrics:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [token])

  const pendingBookings = bookings.filter((b) => b.status === 'PENDING')
  const activeRentals = bookings.filter((b) => b.status === 'ISSUED')
  const overdueBookings = bookings.filter(
    (b) => b.status === 'ISSUED' && new Date(b.endDate) < new Date(),
  )

  // Metrics
  const activeRentalsCount = activeRentals.length
  const overdueCount = overdueBookings.length

  // Handle Approve booking
  const handleApprove = async (booking: Booking, forceApproval: boolean = false) => {
    if (forceApproval) setForcing(true)

    try {
      await api.updateBookingStatus(
        booking._id,
        {
          status: 'APPROVED',
          force: forceApproval,
        },
        token,
      )

      // Success
      setOverlapWarningBooking(null)
      fetchData()
    } catch (err: any) {
      if (err.code === 'INVENTORY_WARNING') {
        // Intercept inventory warning overlay
        setOverlapWarningBooking(booking)
        setWarningMsg(
          err.warning || 'Approved quantity exceeds current availability for the target dates.',
        )
      } else {
        alert(err.message || 'Approval failed.')
      }
    } finally {
      if (forceApproval) setForcing(false)
    }
  }

  // Handle Reject booking
  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!rejectingBookingId || !rejectionReason.trim()) return
    setRejecting(true)

    try {
      await api.updateBookingStatus(
        rejectingBookingId,
        {
          status: 'REJECTED',
          notes: rejectionReason,
        },
        token,
      )

      setRejectingBookingId(null)
      setRejectionReason('')
      fetchData()
    } catch (err: any) {
      alert(err.message || 'Rejection failed.')
    } finally {
      setRejecting(false)
    }
  }

  // Handle Send Overdue Alert reminder
  const handleSendOverdueAlert = async (booking: Booking) => {
    setAlertingId(booking._id)
    try {
      await api.sendOverdueAlert(booking._id, token)
      setAlertSuccessId(booking._id)
      setTimeout(() => setAlertSuccessId(null), 3000)
    } catch (err: any) {
      alert(err.message || 'Failed to dispatch alert.')
    } finally {
      setAlertingId(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col gap-1">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Storekeeper Console
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          Monitor system metrics, review reservation approvals, and send return warnings.
        </p>
      </div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Utilization */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">
              Gear Utilization
            </p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{utilizationRate}%</p>
          </div>
          <div className="p-2.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50">
            <TrendingUp className="h-5 w-5" />
          </div>
        </div>

        {/* Active checkouts */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">
              Active Checkouts
            </p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              {activeRentalsCount}
            </p>
          </div>
          <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50">
            <Clock className="h-5 w-5" />
          </div>
        </div>

        {/* Under Repair */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">
              In Maintenance
            </p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{repairCount}</p>
          </div>
          <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/50">
            <Wrench className="h-5 w-5" />
          </div>
        </div>

        {/* Overdue items */}
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
                ? 'bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border-red-150 dark:border-red-900'
                : 'bg-slate-50 dark:bg-slate-950 text-slate-400 border-slate-100 dark:border-slate-805'
            }`}
          >
            <AlertTriangle className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Main Grid: Pending approval requests & Overdue reminder actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Pending Requests Table (Left, 8-span) */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              Pending Booking Approvals
              <span className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-850 text-slate-700 dark:text-slate-300 text-[10px] font-bold">
                {pendingBookings.length}
              </span>
            </h3>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-8 text-center text-xs text-slate-400 font-mono">
                Loading data...
              </div>
            ) : pendingBookings.length === 0 ? (
              <div className="p-8 text-center text-slate-450 dark:text-slate-500 text-xs">
                No pending checkout request approvals listed.
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800/80 text-[10px] uppercase font-bold text-slate-450 tracking-wider">
                    <th className="px-5 py-3">Crew Member</th>
                    <th className="px-5 py-3">Asset</th>
                    <th className="px-5 py-3">Qty</th>
                    <th className="px-5 py-3">Dates</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-850 text-xs">
                  {pendingBookings.map((booking) => {
                    const user = typeof booking.user === 'object' ? booking.user : null
                    const asset = typeof booking.asset === 'object' ? booking.asset : null
                    if (!asset || !user) return null

                    return (
                      <tr
                        key={booking._id}
                        className="hover:bg-slate-50/50 dark:hover:bg-slate-850/20"
                      >
                        <td className="px-5 py-4 min-w-[120px]">
                          <div className="flex items-center gap-2">
                            <img
                              src={
                                user.imageUrl ||
                                'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&auto=format&fit=crop&q=80'
                              }
                              alt={user.firstName}
                              className="h-6 w-6 rounded-full border border-slate-250 dark:border-slate-800"
                            />
                            <div>
                              <p className="font-semibold text-slate-900 dark:text-white">
                                {user.firstName} {user.lastName}
                              </p>
                              <p className="text-[10px] text-slate-400 dark:text-slate-500">
                                {user.email}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 min-w-[150px]">
                          <p className="font-semibold text-slate-850 dark:text-slate-250 truncate max-w-[180px]">
                            {asset.name}
                          </p>
                          <span className="text-[9px] uppercase font-bold text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-950 px-1 py-0.5 rounded">
                            {asset.category}
                          </span>
                        </td>
                        <td className="px-5 py-4 font-bold text-slate-700 dark:text-slate-350">
                          {booking.quantity}x
                        </td>
                        <td className="px-5 py-4 font-mono text-slate-500 dark:text-slate-400 min-w-[110px]">
                          <p>{new Date(booking.startDate).toLocaleDateString()}</p>
                          <p className="text-[10px] text-slate-400">
                            to {new Date(booking.endDate).toLocaleDateString()}
                          </p>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleApprove(booking)}
                              className="p-1 rounded-md text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 hover:text-emerald-700 transition-colors"
                              title="Approve Booking"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setRejectingBookingId(booking._id)}
                              className="p-1 rounded-md text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-700 transition-colors"
                              title="Reject Booking"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Overdue Alert list panel (Right, 4-span) */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              Overdue Returns
              <span className="px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-950/40 text-red-750 dark:text-red-400 text-[10px] font-bold">
                {overdueBookings.length}
              </span>
            </h3>
          </div>

          <div className="p-4 space-y-4 overflow-y-auto max-h-[350px] divide-y divide-slate-100 dark:divide-slate-800/60">
            {loading ? (
              <div className="text-center text-xs text-slate-400 font-mono py-6">
                Loading alerts...
              </div>
            ) : overdueBookings.length === 0 ? (
              <div className="text-center text-slate-400 dark:text-slate-500 text-xs py-8">
                No active overdue items. Excellent!
              </div>
            ) : (
              overdueBookings.map((booking, idx) => {
                const user = typeof booking.user === 'object' ? booking.user : null
                const asset = typeof booking.asset === 'object' ? booking.asset : null
                if (!asset || !user) return null

                const daysOverdue = Math.floor(
                  (Date.now() - new Date(booking.endDate).getTime()) / (1000 * 60 * 60 * 24),
                )

                return (
                  <div key={booking._id} className={`pt-3 ${idx === 0 ? 'pt-0' : ''} space-y-2.5`}>
                    <div className="flex gap-2 min-w-0">
                      <img
                        src={
                          user.imageUrl ||
                          'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&auto=format&fit=crop&q=80'
                        }
                        alt={user.firstName}
                        className="h-6 w-6 rounded-full shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-xs text-slate-900 dark:text-white truncate">
                          {user.firstName} {user.lastName}
                        </p>
                        <p className="text-[10px] font-semibold text-slate-800 dark:text-slate-350 truncate">
                          {booking.quantity}x {asset.name}
                        </p>
                        <p className="text-[10px] text-red-500 font-medium">
                          {daysOverdue} days overdue (Due:{' '}
                          {new Date(booking.endDate).toLocaleDateString()})
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleSendOverdueAlert(booking)}
                      disabled={alertingId === booking._id || alertSuccessId === booking._id}
                      className={`w-full py-1.5 flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase rounded-lg border transition-all ${
                        alertSuccessId === booking._id
                          ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900'
                          : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600 dark:bg-slate-950 dark:hover:bg-slate-850 dark:border-slate-800 dark:text-slate-300'
                      }`}
                    >
                      <Send className="h-3 w-3" />
                      {alertSuccessId === booking._id
                        ? 'Sent reminder!'
                        : alertingId === booking._id
                          ? 'Sending alert...'
                          : 'Alert Crew Member'}
                    </button>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* Reject Reason Form Overlay Dialog */}
      {rejectingBookingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Reject Reservation Request
              </h3>
              <button
                onClick={() => setRejectingBookingId(null)}
                className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleRejectSubmit} className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">
                  Reason for Rejection <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Specify details, e.g. equipment scheduled for sensor calibration or repair..."
                  className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-500 placeholder:text-slate-400 dark:placeholder:text-slate-700"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setRejectingBookingId(null)}
                  className="px-4 py-1.5 rounded-lg border border-slate-200 dark:border-slate-805 text-slate-500 dark:text-slate-400 font-semibold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={rejecting}
                  className="px-4 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-750 font-semibold text-xs transition-colors"
                >
                  {rejecting ? 'Rejecting...' : 'Reject Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dynamic Overlap Warnings Warning Overlay Confirmation */}
      {overlapWarningBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-xl border border-red-200 dark:border-red-950/80 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-red-50/20 dark:bg-red-950/10 flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <AlertCircle className="h-5 w-5" />
              <h3 className="font-bold text-sm">Inventory Overlap Warning</h3>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-xs text-slate-650 dark:text-slate-400 leading-normal">
                {warningMsg}
              </p>
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs space-y-1">
                <p>
                  <span className="font-semibold text-slate-500">Asset:</span>{' '}
                  {(overlapWarningBooking.asset as any)?.name}
                </p>
                <p>
                  <span className="font-semibold text-slate-500">Dates:</span>{' '}
                  {new Date(overlapWarningBooking.startDate).toLocaleDateString()} to{' '}
                  {new Date(overlapWarningBooking.endDate).toLocaleDateString()}
                </p>
                <p>
                  <span className="font-semibold text-slate-500">Quantity:</span>{' '}
                  {overlapWarningBooking.quantity} units
                </p>
              </div>
              <p className="text-[10px] text-slate-450">
                Approving this will result in overbooking the asset inventory during these scheduled
                dates.
              </p>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => setOverlapWarningBooking(null)}
                  className="px-4 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 font-semibold text-xs text-slate-500"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleApprove(overlapWarningBooking, true)}
                  disabled={forcing}
                  className="px-4 py-1.5 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-950 hover:bg-slate-850 dark:hover:bg-slate-100 font-semibold text-xs transition-colors"
                >
                  {forcing ? 'Overriding...' : 'Force Approve'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
export default AdminDashboard
