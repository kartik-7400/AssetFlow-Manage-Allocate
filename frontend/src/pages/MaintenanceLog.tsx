import React, { useState, useEffect } from 'react'
import { api } from '../lib/api'
import type { MaintenanceTicket } from '../lib/api'
import { Wrench, CheckCircle, X } from 'lucide-react'

interface MaintenanceLogProps {
  token?: string | null
}

export const MaintenanceLog: React.FC<MaintenanceLogProps> = ({ token }) => {
  const [tickets, setTickets] = useState<MaintenanceTicket[]>([])
  const [loading, setLoading] = useState(true)

  // Resolve Modal State
  const [resolvingTicket, setResolvingTicket] = useState<MaintenanceTicket | null>(null)
  const [resolutionDetails, setResolutionDetails] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const fetchTickets = async () => {
    setLoading(true)
    try {
      const data = await api.getMaintenanceTickets(token)
      // Sort open tickets first
      data.sort((a, b) => {
        if (a.status === b.status) return 0
        return a.status === 'OPEN' || a.status === 'IN_PROGRESS' ? -1 : 1
      })
      setTickets(data)
    } catch (err) {
      console.error('Error fetching maintenance tickets:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTickets()
  }, [token])

  const handleResolveOpen = (ticket: MaintenanceTicket) => {
    setResolvingTicket(ticket)
    setResolutionDetails('')
  }

  const handleResolveSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resolvingTicket || !resolutionDetails.trim()) return
    setSubmitting(true)

    try {
      await api.resolveMaintenanceTicket(resolvingTicket._id, { resolutionDetails }, token)
      setResolvingTicket(null)
      fetchTickets()
    } catch (err: any) {
      alert(err.message || 'Failed to resolve ticket.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Intro Header */}
      <div className="flex flex-col gap-1.5">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Repairs & Maintenance
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          Track assets flagged as damaged, manage active repairs, and restore equipment to the store
          catalog.
        </p>
      </div>

      {/* Ticket Registry List */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-xs text-slate-400 font-mono">
              Querying repairs...
            </div>
          ) : tickets.length === 0 ? (
            <div className="p-8 text-center text-slate-450 dark:text-slate-500">
              <CheckCircle className="h-8 w-8 mx-auto mb-2 text-emerald-500 stroke-1.25 animate-pulse" />
              <h3 className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                All equipment healthy
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                No active repair tickets exist. High-value gear is 100% available in store.
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-805 text-[10px] uppercase font-bold text-slate-450 tracking-wider">
                  <th className="px-5 py-3">Equipment</th>
                  <th className="px-5 py-3">Reported By</th>
                  <th className="px-5 py-3">Damage Report Description</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-850 text-xs">
                {tickets.map((ticket) => {
                  const asset = ticket.asset
                  const reporter = ticket.reportedBy
                  if (!asset) return null

                  const isOpen = ticket.status === 'OPEN' || ticket.status === 'IN_PROGRESS'

                  return (
                    <tr
                      key={ticket._id}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-850/20"
                    >
                      <td className="px-5 py-4 min-w-[150px]">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={
                              asset.imageUrl ||
                              'https://images.unsplash.com/photo-1619597455322-4fbbd820250a?w=80&auto=format&fit=crop&q=80'
                            }
                            alt={asset.name}
                            className="h-8 w-8 rounded object-cover border border-slate-200 dark:border-slate-800"
                          />
                          <div>
                            <p className="font-semibold text-slate-900 dark:text-white truncate max-w-[140px]">
                              {asset.name}
                            </p>
                            <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500 font-bold uppercase">
                              {ticket.quantity}x unit{ticket.quantity > 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 font-semibold text-slate-700 dark:text-slate-350 min-w-[100px]">
                        {reporter ? `${reporter.firstName} ${reporter.lastName}` : 'SYSTEM'}
                      </td>
                      <td className="px-5 py-4 min-w-[200px]">
                        <p className="text-slate-800 dark:text-slate-350 leading-relaxed font-medium">
                          {ticket.damageReport}
                        </p>
                        {ticket.resolutionDetails && (
                          <div className="mt-1.5 p-2 bg-emerald-50/40 dark:bg-emerald-950/10 border border-emerald-150 dark:border-emerald-900/60 rounded text-[11px] text-emerald-700 dark:text-emerald-450 leading-relaxed">
                            <span className="font-bold">Resolution:</span>{' '}
                            {ticket.resolutionDetails}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-4 min-w-[90px]">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                            isOpen
                              ? 'bg-amber-50 text-amber-700 border-amber-250 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900'
                          }`}
                        >
                          {ticket.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        {isOpen ? (
                          <button
                            onClick={() => handleResolveOpen(ticket)}
                            className="inline-flex items-center justify-center gap-1 px-3 py-1.5 bg-slate-900 text-white dark:bg-white dark:text-slate-950 hover:bg-slate-800 dark:hover:bg-slate-100 font-semibold text-[10px] uppercase rounded-lg border border-transparent transition-all shadow-sm active:scale-[0.97]"
                          >
                            Resolve Repair
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400 dark:text-slate-650 font-bold uppercase tracking-wider flex items-center justify-end gap-1">
                            <CheckCircle className="h-3 w-3 text-emerald-500" /> Completed
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Resolution Details Form Overlay Modal */}
      {resolvingTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-xl border border-slate-205 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                <Wrench className="h-4 w-4 text-slate-800 dark:text-white" /> Resolve Repair Ticket
              </h3>
              <button
                onClick={() => setResolvingTicket(null)}
                className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleResolveSubmit} className="p-5 space-y-4">
              <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs space-y-1">
                <p>
                  <span className="font-semibold text-slate-400">Equipment:</span>{' '}
                  {resolvingTicket.asset?.name}
                </p>
                <p>
                  <span className="font-semibold text-slate-400">Damage:</span>{' '}
                  {resolvingTicket.damageReport}
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">
                  Resolution / Fix Details <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  value={resolutionDetails}
                  onChange={(e) => setResolutionDetails(e.target.value)}
                  placeholder="Explain repair works done, parts replaced, calibration completed..."
                  className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-500 placeholder:text-slate-400 dark:placeholder:text-slate-700"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-805">
                <button
                  type="button"
                  onClick={() => setResolvingTicket(null)}
                  className="px-4 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-550 font-semibold text-xs animate-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-955 hover:bg-slate-800 dark:hover:bg-slate-100 font-semibold text-xs transition-colors"
                >
                  {submitting ? 'Resolving...' : 'Confirm Resolution'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
export default MaintenanceLog
