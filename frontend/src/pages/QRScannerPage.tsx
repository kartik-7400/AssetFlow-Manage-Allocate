import React, { useState, useEffect, useRef, useCallback } from 'react'
import { api } from '../lib/api'
import type { Asset, Booking } from '../lib/api'
import { Html5QrcodeScanner } from 'html5-qrcode'
import {
  QrCode,
  Search,
  Camera,
  AlertTriangle,
  Wrench,
  Clock,
  CornerDownRight,
  X,
} from 'lucide-react'

interface QRScannerPageProps {
  token?: string | null
}

export const QRScannerPage: React.FC<QRScannerPageProps> = ({ token }) => {
  const [searchText, setSearchText] = useState('')
  const [scannerActive, setScannerActive] = useState(false)

  // Match details
  const [matchedAsset, setMatchedAsset] = useState<Asset | null>(null)
  const [assetBookings, setAssetBookings] = useState<Booking[]>([])
  const [loadingMatch, setLoadingMatch] = useState(false)
  const [searchError, setSearchError] = useState('')

  // Action variables
  const [actionBooking, setActionBooking] = useState<Booking | null>(null)
  const [actionType, setActionType] = useState<'issue' | 'return' | null>(null)
  const [notes, setNotes] = useState('')
  const [returnCondition, setReturnCondition] = useState<'EXCELLENT' | 'GOOD' | 'FAIR' | 'DAMAGED'>(
    'GOOD',
  )
  const [submittingAction, setSubmittingAction] = useState(false)

  const scannerRef = useRef<Html5QrcodeScanner | null>(null)

  // Lookup scanned or searched text
  const handleLookupCode = useCallback(
    async (codeStr: string) => {
      if (!codeStr.trim()) return
      setLoadingMatch(true)
      setSearchError('')
      setMatchedAsset(null)
      setAssetBookings([])
      setActionBooking(null)
      setActionType(null)

      try {
        // 1. Fetch assets and check for exact match in qrCodeData
        const assets = await api.getAssets({}, token)
        const matched = assets.find(
          (a) => a.qrCodeData.trim().toLowerCase() === codeStr.trim().toLowerCase(),
        )

        if (!matched) {
          setSearchError(`No asset found matching QR identifier: "${codeStr}"`)
          setLoadingMatch(false)
          return
        }

        setMatchedAsset(matched)

        // 2. Fetch bookings matching this asset that are APPROVED (can check out) or ISSUED (can return)
        const bookings = await api.getBookings({}, token)
        const filtered = bookings.filter((b) => {
          const assetId = typeof b.asset === 'object' ? b.asset._id : b.asset
          return assetId === matched._id && ['APPROVED', 'ISSUED'].includes(b.status)
        })

        setAssetBookings(filtered)
      } catch (err: any) {
        setSearchError(err.message || 'Error executing lookup search.')
      } finally {
        setLoadingMatch(false)
      }
    },
    [token],
  )

  // Initialize html5-qrcode scanner
  useEffect(() => {
    if (!scannerActive) {
      if (scannerRef.current) {
        scannerRef.current.clear().catch((err) => console.error('Error clearing scanner:', err))
        scannerRef.current = null
      }
      return
    }

    // Delay container instantiation slightly to ensure DOM element is mounted
    const timer = setTimeout(() => {
      try {
        const scanner = new Html5QrcodeScanner(
          'qr-reader-target',
          {
            fps: 10,
            qrbox: { width: 220, height: 220 },
            aspectRatio: 1.0,
          },
          /* verbose= */ false,
        )

        scanner.render(
          (decodedText) => {
            setSearchText(decodedText)
            setScannerActive(false) // Stop scanner on success
            handleLookupCode(decodedText)
          },
          () => {
            // Silence silent scan failures (polling reports)
          },
        )

        scannerRef.current = scanner
      } catch (err) {
        console.error('Error launching QR Scanner:', err)
        setScannerActive(false)
      }
    }, 100)

    return () => {
      clearTimeout(timer)
      if (scannerRef.current) {
        scannerRef.current.clear().catch((err) => console.error('Error clearing scanner:', err))
        scannerRef.current = null
      }
    }
  }, [scannerActive, handleLookupCode])

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault()
    handleLookupCode(searchText)
  }

  // Open transaction dialog
  const handleOpenAction = (booking: Booking, type: 'issue' | 'return') => {
    setActionBooking(booking)
    setActionType(type)
    setNotes('')
    setReturnCondition('GOOD')
  }

  // Execute issue checkout or check-in return
  const handleExecuteAction = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!actionBooking || !actionType) return
    setSubmittingAction(true)

    try {
      if (actionType === 'issue') {
        await api.issueAssetBooking(actionBooking._id, notes, token)
      } else {
        await api.returnAssetBooking(
          actionBooking._id,
          {
            condition: returnCondition,
            notes,
          },
          token,
        )
      }

      // Close overlays and refresh matches
      setActionBooking(null)
      setActionType(null)
      handleLookupCode(matchedAsset!.qrCodeData)
    } catch (err: any) {
      alert(err.message || 'Operation failed.')
    } finally {
      setSubmittingAction(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Intro Header */}
      <div className="flex flex-col gap-1.5">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          QR Checkout & Returns
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          Use the camera to scan stickers or manually type the QR identifier code to execute
          instantly.
        </p>
      </div>

      {/* Main Scanner Controls Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Lookup and Scan Input (Left, 5-span) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
            {/* Search Lookup input fallback */}
            <form onSubmit={handleManualSearch} className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">
                Manual Identifier Lookup
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    placeholder="Enter QR Data (e.g. QR-SONY-FX3)"
                    className="w-full pl-9 pr-4 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-500 font-mono"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 text-white dark:bg-white dark:text-slate-950 hover:bg-slate-800 dark:hover:bg-slate-100 font-semibold text-xs rounded-lg border border-transparent transition-colors"
                >
                  Lookup
                </button>
              </div>
            </form>

            <div className="relative flex items-center justify-center my-3">
              <span className="absolute inset-x-0 h-px bg-slate-150 dark:bg-slate-800/80" />
              <span className="relative bg-white dark:bg-slate-900 px-3 text-[10px] text-slate-400 uppercase font-bold">
                Or Webcam Scan
              </span>
            </div>

            {/* Webcam activation button */}
            {!scannerActive ? (
              <button
                onClick={() => setScannerActive(true)}
                className="w-full py-2.5 flex items-center justify-center gap-2 border border-slate-250 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-lg text-slate-700 dark:text-slate-200 text-xs font-semibold shadow-sm active:scale-[0.99] transition-all"
              >
                <Camera className="h-4 w-4" /> Activate Device Camera
              </button>
            ) : (
              <div className="space-y-4">
                <div
                  id="qr-reader-target"
                  className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-950"
                />
                <button
                  onClick={() => setScannerActive(false)}
                  className="w-full py-2 bg-red-50 hover:bg-red-100/80 border border-red-200 text-red-650 text-xs font-semibold rounded-lg transition-colors"
                >
                  Close Camera
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Action Lookup Details (Right, 7-span) */}
        <div className="lg:col-span-7 space-y-4">
          {loadingMatch ? (
            <div className="h-[250px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col items-center justify-center gap-2">
              <div className="h-5 w-5 rounded-full border-2 border-slate-200 dark:border-slate-800 border-t-slate-900 dark:border-t-white animate-spin" />
              <p className="text-[10px] text-slate-400 font-mono">Fetching matching records...</p>
            </div>
          ) : searchError ? (
            <div className="bg-red-50/45 dark:bg-red-950/5 border border-red-250 dark:border-red-950 p-6 rounded-xl text-center">
              <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
              <h3 className="font-bold text-sm text-red-800 dark:text-red-400">
                Scan Match Failed
              </h3>
              <p className="text-xs text-red-650 dark:text-red-400/80 mt-1 max-w-sm mx-auto font-medium leading-normal">
                {searchError}
              </p>
            </div>
          ) : !matchedAsset ? (
            <div className="h-[250px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col items-center justify-center text-center p-6">
              <QrCode className="h-10 w-10 text-slate-350 dark:text-slate-700 mb-2 stroke-1.25" />
              <h3 className="font-semibold text-sm text-slate-800 dark:text-slate-300">
                Awaiting lookup code
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-500 mt-1 max-w-sm">
                Activate the scanner or enter the barcode QR data. Asset records and check-outs will
                be listed here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Asset Specs Banner Card */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex gap-4">
                <img
                  src={
                    matchedAsset.imageUrl ||
                    'https://images.unsplash.com/photo-1619597455322-4fbbd820250a?w=150&auto=format&fit=crop&q=80'
                  }
                  alt={matchedAsset.name}
                  className="h-20 w-20 rounded object-cover border border-slate-200 dark:border-slate-800 shrink-0"
                />
                <div className="min-w-0 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-950 px-1.5 py-0.5 rounded">
                      {matchedAsset.category}
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                      {matchedAsset.qrCodeData}
                    </span>
                  </div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                    {matchedAsset.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                    {matchedAsset.description}
                  </p>
                </div>
              </div>

              {/* Booking Check-out / Check-in List */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    Eligible Reservations
                  </h3>
                </div>

                <div className="p-4 space-y-4 divide-y divide-slate-100 dark:divide-slate-800">
                  {assetBookings.length === 0 ? (
                    <p className="text-xs text-slate-450 dark:text-slate-500 text-center py-6">
                      No active APPROVED checkouts or ISSUED rentals found matching this asset.
                    </p>
                  ) : (
                    assetBookings.map((booking, idx) => {
                      const user = typeof booking.user === 'object' ? booking.user : null
                      if (!user) return null

                      const isIssued = booking.status === 'ISSUED'

                      return (
                        <div
                          key={booking._id}
                          className={`flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pt-3.5 ${idx === 0 ? 'pt-0' : ''}`}
                        >
                          <div className="space-y-1.5 min-w-0">
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                                  isIssued
                                    ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900'
                                    : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900'
                                }`}
                              >
                                {isIssued ? 'ACTIVE CHECKOUT' : 'APPROVED CHECKOUT'}
                              </span>
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold font-mono">
                                {booking.quantity}x units
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <img
                                src={
                                  user.imageUrl ||
                                  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&auto=format&fit=crop&q=80'
                                }
                                alt={user.firstName}
                                className="h-5 w-5 rounded-full"
                              />
                              <p className="text-xs font-semibold text-slate-900 dark:text-white">
                                {user.firstName} {user.lastName} ({user.email})
                              </p>
                            </div>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                              Period: {new Date(booking.startDate).toLocaleDateString()} to{' '}
                              {new Date(booking.endDate).toLocaleDateString()}
                            </p>
                          </div>

                          <button
                            onClick={() => handleOpenAction(booking, isIssued ? 'return' : 'issue')}
                            className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1 shadow-sm active:scale-[0.98] transition-all self-end sm:self-center ${
                              isIssued
                                ? 'bg-amber-600 text-white hover:bg-amber-700 border border-transparent'
                                : 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 border border-transparent hover:bg-slate-800 dark:hover:bg-slate-100'
                            }`}
                          >
                            <CornerDownRight className="h-3.5 w-3.5" />
                            {isIssued ? 'Return Asset' : 'Issue Asset'}
                          </button>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Transaction Action Modal Form (Issue / Return) */}
      {actionBooking && actionType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                {actionType === 'issue' ? (
                  <>
                    <Clock className="h-4 w-4 text-blue-500" /> Confirm Asset Check-out
                  </>
                ) : (
                  <>
                    <Wrench className="h-4 w-4 text-amber-500" /> Confirm Asset Return Check-in
                  </>
                )}
              </h3>
              <button
                onClick={() => setActionBooking(null)}
                className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleExecuteAction} className="p-5 space-y-4">
              <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs rounded-lg space-y-1">
                <p>
                  <span className="font-semibold text-slate-400">Asset:</span> {matchedAsset?.name}
                </p>
                <p>
                  <span className="font-semibold text-slate-400">Quantity:</span>{' '}
                  {actionBooking.quantity} units
                </p>
                <p>
                  <span className="font-semibold text-slate-400">Crew Member:</span>{' '}
                  {(actionBooking.user as any)?.firstName} {(actionBooking.user as any)?.lastName}
                </p>
              </div>

              {/* Conditional return inputs */}
              {actionType === 'return' && (
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">
                    Return Condition Status <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={returnCondition}
                    onChange={(e) => setReturnCondition(e.target.value as any)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-500"
                  >
                    <option value="EXCELLENT">EXCELLENT</option>
                    <option value="GOOD">GOOD</option>
                    <option value="FAIR">FAIR</option>
                    <option value="DAMAGED">DAMAGED (Auto-Maintenance Log)</option>
                  </select>
                  {returnCondition === 'DAMAGED' && (
                    <span className="text-[10px] text-amber-500 font-medium flex items-center gap-1 mt-1">
                      <AlertTriangle className="h-3 w-3" /> Flagging as damaged initiates
                      maintenance logs and reduces stock availability automatically.
                    </span>
                  )}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">
                  {actionType === 'issue' ? 'Issue check-out notes' : 'Return check-in comments'}
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={
                    actionType === 'issue'
                      ? 'Add notes regarding battery size, serial tags checked...'
                      : 'Describe overall equipment condition returned, any wear noticed...'
                  }
                  className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-500 placeholder:text-slate-400 dark:placeholder:text-slate-700"
                />
              </div>

              {/* Submit triggers */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setActionBooking(null)}
                  className="px-4 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-550 font-semibold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAction}
                  className={`px-4 py-1.5 rounded-lg text-white font-semibold text-xs transition-colors ${
                    actionType === 'return'
                      ? 'bg-amber-600 hover:bg-amber-700'
                      : 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 hover:bg-slate-850 dark:hover:bg-slate-100'
                  }`}
                >
                  {submittingAction
                    ? 'Processing...'
                    : actionType === 'issue'
                      ? 'Confirm Check-out'
                      : 'Confirm Check-in'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
export default QRScannerPage
