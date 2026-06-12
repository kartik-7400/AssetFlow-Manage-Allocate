import React, { useState, useEffect, useMemo } from 'react'
import { api } from '../lib/api'
import type { Asset, Booking, MaintenanceTicket } from '../lib/api'
import {
  BarChart3,
  TrendingUp,
  Package,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Box,
  RefreshCw,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'

// ─── Types ───────────────────────────────────────────────────────────
interface AnalyticsDashboardProps {
  token?: string | null
}

interface CategoryMetric {
  category: string
  totalQty: number
  checkedOut: number
  available: number
  inMaintenance: number
  utilizationRate: number
}

interface AssetUtilization {
  name: string
  category: string
  bookingCount: number
  totalCheckedOut: number
  utilizationRate: number
}

// ─── Palette ─────────────────────────────────────────────────────────
const CHART_COLORS = [
  '#6366f1', // indigo-500
  '#8b5cf6', // violet-500
  '#a78bfa', // violet-400
  '#c084fc', // purple-400
  '#818cf8', // indigo-400
  '#7c3aed', // violet-600
  '#4f46e5', // indigo-600
  '#a855f7', // purple-500
]

const UTILIZATION_GRADIENT = (rate: number) => {
  if (rate >= 75) return '#ef4444' // red — high demand
  if (rate >= 50) return '#f59e0b' // amber — moderate
  if (rate >= 25) return '#6366f1' // indigo — normal
  return '#22c55e' // green — low usage
}

// ─── Custom Tooltip ──────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-lg px-3 py-2 text-xs">
      <p className="font-bold text-slate-900 dark:text-white mb-1">{label}</p>
      {payload.map((entry: any, idx: number) => (
        <p key={idx} className="text-slate-600 dark:text-slate-400">
          <span
            className="inline-block h-2 w-2 rounded-full mr-1.5"
            style={{ backgroundColor: entry.color || entry.fill }}
          />
          {entry.name}:{' '}
          <span className="font-semibold text-slate-900 dark:text-white">
            {entry.value}
            {entry.name.includes('Rate') ? '%' : ''}
          </span>
        </p>
      ))}
    </div>
  )
}

// ─── Component ───────────────────────────────────────────────────────
export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ token }) => {
  const [assets, setAssets] = useState<Asset[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [maintenance, setMaintenance] = useState<MaintenanceTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchAll = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)

    try {
      const [assetsData, bookingsData, maintenanceData] = await Promise.all([
        api.getAssets({}, token),
        api.getBookings({}, token),
        api.getMaintenanceTickets(token),
      ])
      setAssets(assetsData)
      setBookings(bookingsData)
      setMaintenance(maintenanceData)
    } catch (err) {
      console.error('Analytics data fetch failed:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchAll()
  }, [token])

  // ─── Computed Metrics ──────────────────────────────────────────────

  const now = new Date()

  // Active bookings = ISSUED status
  const activeBookings = useMemo(() => bookings.filter((b) => b.status === 'ISSUED'), [bookings])

  // Overdue = ISSUED + past endDate
  const overdueBookings = useMemo(
    () => activeBookings.filter((b) => new Date(b.endDate) < now),
    [activeBookings],
  )

  // Pending bookings
  const pendingBookings = useMemo(() => bookings.filter((b) => b.status === 'PENDING'), [bookings])

  // Total inventory
  const totalInventory = useMemo(
    () => assets.reduce((sum, a) => sum + a.quantityTotal, 0),
    [assets],
  )

  const totalAvailable = useMemo(
    () => assets.reduce((sum, a) => sum + a.quantityAvailable, 0),
    [assets],
  )

  const totalCheckedOut = useMemo(
    () => activeBookings.reduce((sum, b) => sum + b.quantity, 0),
    [activeBookings],
  )

  const totalInMaintenance = useMemo(
    () => assets.reduce((sum, a) => sum + a.quantityInMaintenance, 0),
    [assets],
  )

  const overallUtilizationRate = useMemo(
    () => (totalInventory > 0 ? Math.round((totalCheckedOut / totalInventory) * 100) : 0),
    [totalCheckedOut, totalInventory],
  )

  // ─── Most Frequently Utilized Assets ──────────────────────────────
  const assetUtilization: AssetUtilization[] = useMemo(() => {
    const map = new Map<
      string,
      { name: string; category: string; count: number; qty: number; total: number }
    >()

    // Count bookings per asset (all statuses except CANCELLED/REJECTED)
    bookings.forEach((b) => {
      if (b.status === 'CANCELLED' || b.status === 'REJECTED') return
      const asset = typeof b.asset === 'object' ? b.asset : null
      if (!asset) return

      const existing = map.get(asset._id)
      if (existing) {
        existing.count++
        existing.qty += b.quantity
      } else {
        map.set(asset._id, {
          name: asset.name,
          category: asset.category,
          count: 1,
          qty: b.quantity,
          total: asset.quantityTotal,
        })
      }
    })

    return Array.from(map.values())
      .map((v) => ({
        name: v.name.length > 22 ? v.name.slice(0, 20) + '…' : v.name,
        category: v.category,
        bookingCount: v.count,
        totalCheckedOut: v.qty,
        utilizationRate: v.total > 0 ? Math.round((v.qty / v.total) * 100) : 0,
      }))
      .sort((a, b) => b.bookingCount - a.bookingCount)
      .slice(0, 8)
  }, [bookings])

  // ─── Category Breakdown ────────────────────────────────────────────
  const categoryMetrics: CategoryMetric[] = useMemo(() => {
    const catMap = new Map<
      string,
      { total: number; available: number; maintenance: number; checkedOut: number }
    >()

    assets.forEach((a) => {
      const existing = catMap.get(a.category)
      if (existing) {
        existing.total += a.quantityTotal
        existing.available += a.quantityAvailable
        existing.maintenance += a.quantityInMaintenance
      } else {
        catMap.set(a.category, {
          total: a.quantityTotal,
          available: a.quantityAvailable,
          maintenance: a.quantityInMaintenance,
          checkedOut: 0,
        })
      }
    })

    // Add checked out from active bookings
    activeBookings.forEach((b) => {
      const asset = typeof b.asset === 'object' ? b.asset : null
      if (!asset) return
      const cat = catMap.get(asset.category)
      if (cat) cat.checkedOut += b.quantity
    })

    return Array.from(catMap.entries())
      .map(([category, v]) => ({
        category,
        totalQty: v.total,
        checkedOut: v.checkedOut,
        available: v.available,
        inMaintenance: v.maintenance,
        utilizationRate: v.total > 0 ? Math.round((v.checkedOut / v.total) * 100) : 0,
      }))
      .sort((a, b) => b.totalQty - a.totalQty)
  }, [assets, activeBookings])

  // ─── Available Inventory (non-zero availability) ───────────────────
  const availableAssets = useMemo(
    () =>
      assets
        .filter((a) => a.quantityAvailable > 0 && a.status !== 'RETIRED')
        .sort((a, b) => b.quantityAvailable - a.quantityAvailable),
    [assets],
  )

  // ─── Open Maintenance Tickets ──────────────────────────────────────
  const openMaintenance = useMemo(
    () => maintenance.filter((t) => t.status !== 'RESOLVED'),
    [maintenance],
  )

  // ─── Loading Skeleton ──────────────────────────────────────────────
  if (loading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-6 w-6 text-indigo-500 animate-spin" />
        <p className="text-xs text-slate-400 font-mono">Loading analytics...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-8">
      {/* ─── Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-indigo-500" />
            Analytics Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Asset utilization insights, active bookings, inventory health, and overdue tracking.
          </p>
        </div>
        <button
          onClick={() => fetchAll(true)}
          disabled={refreshing}
          className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {/* ─── KPI Cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Utilization */}
        <KpiCard
          label="Utilization Rate"
          value={`${overallUtilizationRate}%`}
          icon={TrendingUp}
          color="indigo"
          trend={overallUtilizationRate > 50 ? 'up' : 'neutral'}
          subtitle={`${totalCheckedOut} / ${totalInventory} units`}
        />
        {/* Active Bookings */}
        <KpiCard
          label="Active Bookings"
          value={String(activeBookings.length)}
          icon={Clock}
          color="blue"
          subtitle={`${pendingBookings.length} pending`}
        />
        {/* Available Inventory */}
        <KpiCard
          label="Available Stock"
          value={String(totalAvailable)}
          icon={Package}
          color="emerald"
          subtitle={`of ${totalInventory} total`}
          trend={totalAvailable > totalInventory * 0.5 ? 'up' : 'down'}
        />
        {/* In Maintenance */}
        <KpiCard
          label="In Maintenance"
          value={String(totalInMaintenance)}
          icon={Activity}
          color="amber"
          subtitle={`${openMaintenance.length} open tickets`}
        />
        {/* Overdue Returns */}
        <KpiCard
          label="Overdue Returns"
          value={String(overdueBookings.length)}
          icon={AlertTriangle}
          color={overdueBookings.length > 0 ? 'red' : 'slate'}
          subtitle={overdueBookings.length > 0 ? 'Action needed' : 'All clear'}
          trend={overdueBookings.length > 0 ? 'down' : 'up'}
        />
      </div>

      {/* ─── Charts Row ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Most Frequently Utilized Assets */}
        <ChartCard title="Most Utilized Assets" subtitle="By booking frequency">
          {assetUtilization.length === 0 ? (
            <EmptyChart message="No booking data available yet" />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={assetUtilization}
                layout="vertical"
                margin={{ left: 10, right: 20, top: 5, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--chart-grid, #e2e8f0)"
                  opacity={0.4}
                />
                <XAxis
                  type="number"
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={130}
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  content={<CustomTooltip />}
                  cursor={{ fill: 'rgba(99, 102, 241, 0.06)' }}
                />
                <Bar dataKey="bookingCount" name="Bookings" radius={[0, 4, 4, 0]} maxBarSize={24}>
                  {assetUtilization.map((_, idx) => (
                    <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Category Utilization Rates */}
        <ChartCard title="Category Utilization" subtitle="Utilization rate by category">
          {categoryMetrics.length === 0 ? (
            <EmptyChart message="No asset categories found" />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={categoryMetrics} margin={{ left: 0, right: 20, top: 5, bottom: 5 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--chart-grid, #e2e8f0)"
                  opacity={0.4}
                />
                <XAxis
                  dataKey="category"
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                  domain={[0, 100]}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip
                  content={<CustomTooltip />}
                  cursor={{ fill: 'rgba(99, 102, 241, 0.06)' }}
                />
                <Bar
                  dataKey="utilizationRate"
                  name="Utilization Rate"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={48}
                >
                  {categoryMetrics.map((entry, idx) => (
                    <Cell key={idx} fill={UTILIZATION_GRADIENT(entry.utilizationRate)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* ─── Data Tables Row ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Active Bookings Table */}
        <div className="lg:col-span-7">
          <TableCard
            title="Active Bookings"
            badge={String(activeBookings.length)}
            badgeColor="blue"
          >
            {activeBookings.length === 0 ? (
              <EmptyTable message="No active bookings at the moment" icon={CheckCircle2} />
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800/80 text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">
                    <th className="px-4 py-3">Borrower</th>
                    <th className="px-4 py-3">Asset</th>
                    <th className="px-4 py-3">Qty</th>
                    <th className="px-4 py-3">Due Date</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 text-xs">
                  {activeBookings.slice(0, 8).map((booking) => {
                    const user = typeof booking.user === 'object' ? booking.user : null
                    const asset = typeof booking.asset === 'object' ? booking.asset : null
                    if (!user || !asset) return null

                    const isOverdue = new Date(booking.endDate) < now
                    const daysLeft = Math.ceil(
                      (new Date(booking.endDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
                    )

                    return (
                      <tr
                        key={booking._id}
                        className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <img
                              src={
                                user.imageUrl ||
                                'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&auto=format&fit=crop&q=80'
                              }
                              alt={user.firstName}
                              className="h-6 w-6 rounded-full border border-slate-200 dark:border-slate-800"
                            />
                            <span className="font-semibold text-slate-900 dark:text-white truncate max-w-[100px]">
                              {user.firstName} {user.lastName}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-medium text-slate-700 dark:text-slate-300 truncate max-w-[140px] block">
                            {asset.name}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-600 dark:text-slate-400">
                          {booking.quantity}×
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-500 dark:text-slate-400">
                          {new Date(booking.endDate).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          {isOverdue ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-400 text-[10px] font-bold">
                              <AlertTriangle className="h-3 w-3" />
                              {Math.abs(daysLeft)}d overdue
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold">
                              <Clock className="h-3 w-3" />
                              {daysLeft}d left
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </TableCard>
        </div>

        {/* Available Inventory + Overdue */}
        <div className="lg:col-span-5 space-y-4">
          {/* Available Inventory */}
          <TableCard
            title="Available Inventory"
            badge={String(availableAssets.length)}
            badgeColor="emerald"
          >
            {availableAssets.length === 0 ? (
              <EmptyTable message="All stock currently checked out" icon={Box} />
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800/50 max-h-[200px] overflow-y-auto">
                {availableAssets.slice(0, 10).map((asset) => {
                  const pct =
                    asset.quantityTotal > 0
                      ? Math.round((asset.quantityAvailable / asset.quantityTotal) * 100)
                      : 0

                  return (
                    <div
                      key={asset._id}
                      className="px-4 py-2.5 flex items-center justify-between text-xs hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors"
                    >
                      <div className="min-w-0 flex-1 mr-3">
                        <p className="font-semibold text-slate-900 dark:text-white truncate">
                          {asset.name}
                        </p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500">
                          {asset.category}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="w-16 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${pct}%`,
                              backgroundColor:
                                pct > 60 ? '#22c55e' : pct > 30 ? '#f59e0b' : '#ef4444',
                            }}
                          />
                        </div>
                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 w-14 text-right tabular-nums">
                          {asset.quantityAvailable}/{asset.quantityTotal}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </TableCard>

          {/* Overdue Returns */}
          <TableCard
            title="Overdue Returns"
            badge={String(overdueBookings.length)}
            badgeColor={overdueBookings.length > 0 ? 'red' : 'slate'}
          >
            {overdueBookings.length === 0 ? (
              <EmptyTable message="No overdue returns — great job!" icon={CheckCircle2} />
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800/50 max-h-[200px] overflow-y-auto">
                {overdueBookings.map((booking) => {
                  const user = typeof booking.user === 'object' ? booking.user : null
                  const asset = typeof booking.asset === 'object' ? booking.asset : null
                  if (!user || !asset) return null

                  const daysOverdue = Math.floor(
                    (now.getTime() - new Date(booking.endDate).getTime()) / (1000 * 60 * 60 * 24),
                  )

                  return (
                    <div
                      key={booking._id}
                      className="px-4 py-2.5 flex items-center gap-3 text-xs hover:bg-red-50/30 dark:hover:bg-red-950/10 transition-colors"
                    >
                      <img
                        src={
                          user.imageUrl ||
                          'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&auto=format&fit=crop&q=80'
                        }
                        alt={user.firstName}
                        className="h-6 w-6 rounded-full border border-slate-200 dark:border-slate-800 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-900 dark:text-white truncate">
                          {user.firstName} {user.lastName}
                        </p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                          {booking.quantity}× {asset.name}
                        </p>
                      </div>
                      <span className="shrink-0 px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-400 text-[10px] font-bold">
                        {daysOverdue}d late
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </TableCard>
        </div>
      </div>
    </div>
  )
}

// ─── Sub-components ──────────────────────────────────────────────────

interface KpiCardProps {
  label: string
  value: string
  icon: React.FC<{ className?: string }>
  color: 'indigo' | 'blue' | 'emerald' | 'amber' | 'red' | 'slate'
  subtitle?: string
  trend?: 'up' | 'down' | 'neutral'
}

const COLOR_MAP: Record<string, { bg: string; text: string; border: string; iconBg: string }> = {
  indigo: {
    bg: 'bg-indigo-50 dark:bg-indigo-950/20',
    text: 'text-indigo-600 dark:text-indigo-400',
    border: 'border-indigo-100 dark:border-indigo-900/50',
    iconBg: 'bg-indigo-500',
  },
  blue: {
    bg: 'bg-blue-50 dark:bg-blue-950/20',
    text: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-100 dark:border-blue-900/50',
    iconBg: 'bg-blue-500',
  },
  emerald: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/20',
    text: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-100 dark:border-emerald-900/50',
    iconBg: 'bg-emerald-500',
  },
  amber: {
    bg: 'bg-amber-50 dark:bg-amber-950/20',
    text: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-100 dark:border-amber-900/50',
    iconBg: 'bg-amber-500',
  },
  red: {
    bg: 'bg-red-50 dark:bg-red-950/20',
    text: 'text-red-600 dark:text-red-400',
    border: 'border-red-100 dark:border-red-900/50',
    iconBg: 'bg-red-500',
  },
  slate: {
    bg: 'bg-slate-50 dark:bg-slate-950',
    text: 'text-slate-500 dark:text-slate-400',
    border: 'border-slate-200 dark:border-slate-800',
    iconBg: 'bg-slate-400',
  },
}

function KpiCard({ label, value, icon: Icon, color, subtitle, trend }: KpiCardProps) {
  const c = COLOR_MAP[color] || COLOR_MAP.slate
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow duration-300 group">
      <div className="flex items-center justify-between">
        <div
          className={`p-2 rounded-lg ${c.bg} ${c.text} border ${c.border} transition-transform group-hover:scale-105 duration-300`}
        >
          <Icon className="h-4 w-4" />
        </div>
        {trend === 'up' && <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500" />}
        {trend === 'down' && <ArrowDownRight className="h-3.5 w-3.5 text-red-500" />}
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{value}</p>
        <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 mt-0.5">
          {label}
        </p>
        {subtitle && (
          <p className="text-[10px] text-slate-400 dark:text-slate-600 mt-1">{subtitle}</p>
        )}
      </div>
    </div>
  )
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
        <h3 className="font-bold text-sm text-slate-900 dark:text-white">{title}</h3>
        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{subtitle}</p>
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}

function TableCard({
  title,
  badge,
  badgeColor = 'slate',
  children,
}: {
  title: string
  badge?: string
  badgeColor?: string
  children: React.ReactNode
}) {
  const badgeClasses: Record<string, string> = {
    blue: 'bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400',
    emerald: 'bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400',
    red: 'bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-400',
    slate: 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400',
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden flex flex-col">
      <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center gap-2">
        <h3 className="font-bold text-sm text-slate-900 dark:text-white">{title}</h3>
        {badge && (
          <span
            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${badgeClasses[badgeColor] || badgeClasses.slate}`}
          >
            {badge}
          </span>
        )}
      </div>
      {children}
    </div>
  )
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="h-[280px] flex flex-col items-center justify-center gap-2 text-slate-400 dark:text-slate-600">
      <BarChart3 className="h-10 w-10 stroke-1 opacity-50" />
      <p className="text-xs">{message}</p>
    </div>
  )
}

function EmptyTable({
  message,
  icon: Icon,
}: {
  message: string
  icon: React.FC<{ className?: string }>
}) {
  return (
    <div className="px-4 py-8 text-center text-slate-400 dark:text-slate-600">
      <Icon className="h-8 w-8 mx-auto mb-2 stroke-1 opacity-50" />
      <p className="text-xs">{message}</p>
    </div>
  )
}

export default AnalyticsDashboard
