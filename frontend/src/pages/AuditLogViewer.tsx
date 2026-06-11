import React, { useState, useEffect } from 'react'
import { api } from '../lib/api'
import type { AuditLog } from '../lib/api'
import { User, Database } from 'lucide-react'

interface AuditLogViewerProps {
  token?: string | null
}

export const AuditLogViewer: React.FC<AuditLogViewerProps> = ({ token }) => {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const data = await api.getAuditLogs(token)
      // Sort newest first
      data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      setLogs(data)
    } catch (err) {
      console.error('Error fetching audit logs:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [token])

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'ASSET_CREATE':
        return 'Asset Created'
      case 'ASSET_UPDATE':
        return 'Asset Modified'
      case 'BOOKING_APPROVE':
        return 'Booking Approved'
      case 'BOOKING_REJECT':
        return 'Booking Rejected'
      case 'ASSET_ISSUE':
        return 'Equipment Issued'
      case 'ASSET_RETURN':
        return 'Equipment Returned'
      case 'MAINTENANCE_LOG':
        return 'Maintenance Logged'
      case 'MAINTENANCE_RESOLVE':
        return 'Maintenance Resolved'
      default:
        return action
    }
  }

  const getActionClass = (action: string) => {
    switch (action) {
      case 'ASSET_CREATE':
        return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900'
      case 'BOOKING_APPROVE':
        return 'bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400 border-blue-200 dark:border-blue-900'
      case 'BOOKING_REJECT':
      case 'MAINTENANCE_LOG':
        return 'bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400 border-red-200 dark:border-red-900'
      case 'ASSET_ISSUE':
      case 'ASSET_RETURN':
        return 'bg-purple-50 text-purple-700 dark:bg-purple-950/20 dark:text-purple-400 border-purple-200 dark:border-purple-900'
      default:
        return 'bg-slate-50 text-slate-700 dark:bg-slate-950 dark:text-slate-400 border-slate-200 dark:border-slate-800'
    }
  }

  return (
    <div className="space-y-6">
      {/* Intro Header */}
      <div className="flex flex-col gap-1.5">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Immutable Audit Log
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          Chronological journal recording catalog changes, checkouts, returns, and maintenance
          resolutions.
        </p>
      </div>

      {/* Log list table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-xs text-slate-400 font-mono">Querying logs...</div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center text-slate-450 dark:text-slate-500">
              <Database className="h-8 w-8 mx-auto mb-2 opacity-50 stroke-1.25" />
              <p className="text-xs">No audit logs recorded in the system.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-805 text-[10px] uppercase font-bold text-slate-450 tracking-wider">
                  <th className="px-5 py-3">Timestamp</th>
                  <th className="px-5 py-3">Actor</th>
                  <th className="px-5 py-3">Action Event</th>
                  <th className="px-5 py-3">Target Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-850 text-xs">
                {logs.map((log) => {
                  const actorName =
                    typeof log.actor === 'object' && log.actor
                      ? `${log.actor.firstName} ${log.actor.lastName}`
                      : String(log.actor)

                  return (
                    <tr
                      key={log._id}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-850/20 align-top"
                    >
                      <td className="px-5 py-4 font-mono text-slate-450 dark:text-slate-500 whitespace-nowrap min-w-[130px]">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="px-5 py-4 font-semibold text-slate-700 dark:text-slate-300 min-w-[120px] flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-slate-400" />
                        <span>{actorName}</span>
                      </td>
                      <td className="px-5 py-4 min-w-[150px]">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${getActionClass(log.action)}`}
                        >
                          {getActionLabel(log.action)}
                        </span>
                      </td>
                      <td className="px-5 py-4 min-w-[250px]">
                        <div className="space-y-1">
                          <p className="text-[10px] text-slate-400 font-mono">
                            Type:{' '}
                            <span className="font-bold text-slate-650 dark:text-slate-350">
                              {log.targetType}
                            </span>{' '}
                            | ID: <span className="font-bold">{log.targetId}</span>
                          </p>
                          {log.details && Object.keys(log.details).length > 0 && (
                            <pre className="font-mono text-[9px] bg-slate-50 dark:bg-slate-950 p-2 rounded border border-slate-100 dark:border-slate-850 text-slate-600 dark:text-slate-400 max-h-[100px] overflow-y-auto leading-normal">
                              {JSON.stringify(log.details, null, 2)}
                            </pre>
                          )}
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
    </div>
  )
}
export default AuditLogViewer
