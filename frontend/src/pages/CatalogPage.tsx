import React, { useState, useEffect } from 'react'
import { api } from '../lib/api'
import type { Asset } from '../lib/api'
import { Search, Calendar, ChevronRight, X, Sparkles, CheckCircle, Info } from 'lucide-react'

interface CatalogPageProps {
  token?: string | null
}

export const CatalogPage: React.FC<CatalogPageProps> = ({ token }) => {
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')

  // Date range filters
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Booking Modal State
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null)
  const [bookingQty, setBookingQty] = useState(1)
  const [bookingStart, setBookingStart] = useState('')
  const [bookingEnd, setBookingEnd] = useState('')
  const [bookingNotes, setBookingNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const categories = ['All', 'Camera', 'Lighting', 'Audio', 'Lenses', 'Costumes']

  const fetchAssets = async () => {
    setLoading(true)
    try {
      const data = await api.getAssets(
        {
          category: category === 'All' ? '' : category,
          search,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        },
        token,
      )
      setAssets(data)
    } catch (err) {
      console.error('Error fetching assets:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAssets()
  }, [category, startDate, endDate, token])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    fetchAssets()
  }

  // Open booking modal
  const handleOpenBooking = (asset: Asset) => {
    setSelectedAsset(asset)
    setBookingQty(1)

    // Default dates matching search dates, or falling back to tomorrow -> day after
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const dayAfter = new Date()
    dayAfter.setDate(tomorrow.getDate() + 3)

    setBookingStart(startDate || tomorrow.toISOString().split('T')[0])
    setBookingEnd(endDate || dayAfter.toISOString().split('T')[0])
    setBookingNotes('')
    setSubmitSuccess(false)
    setErrorMsg('')
  }

  // Submit Booking Request
  const handleRequestBooking = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedAsset) return
    setSubmitting(true)
    setErrorMsg('')

    try {
      await api.createBooking(
        {
          assetId: selectedAsset._id,
          quantity: bookingQty,
          startDate: bookingStart,
          endDate: bookingEnd,
          notes: bookingNotes,
        },
        token,
      )

      setSubmitSuccess(true)
      setTimeout(() => {
        setSelectedAsset(null)
        fetchAssets()
      }, 2000)
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit booking request.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Intro Header */}
      <div className="flex flex-col gap-1.5">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Discover Assets
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          Browse media and production equipment. Specify your dates to check real-time store
          availability.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-4">
        {/* Search & Dates Form */}
        <form
          onSubmit={handleSearchSubmit}
          className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end"
        >
          <div className="md:col-span-5 space-y-1">
            <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">
              Keywords
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search Sony FX3, Aputure, lenses..."
                className="w-full pl-9 pr-4 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-500 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600"
              />
            </div>
          </div>

          <div className="md:col-span-3 space-y-1">
            <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1">
              <Calendar className="h-3 w-3" /> Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-500 transition-all font-mono"
            />
          </div>

          <div className="md:col-span-3 space-y-1">
            <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1">
              <Calendar className="h-3 w-3" /> End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-500 transition-all font-mono"
            />
          </div>

          <div className="md:col-span-1">
            <button
              type="submit"
              className="w-full py-2 bg-slate-900 text-white dark:bg-white dark:text-slate-950 hover:bg-slate-800 dark:hover:bg-slate-100 font-medium text-sm rounded-lg transition-colors border border-transparent dark:border-slate-200 h-9"
            >
              Search
            </button>
          </div>
        </form>

        {/* Category Chip List */}
        <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800/50">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat === 'All' ? '' : cat)}
              className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                (cat === 'All' && !category) || category === cat
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 border-transparent shadow-sm'
                  : 'bg-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 border-slate-200 dark:border-slate-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid Visual Catalog */}
      {loading ? (
        <div className="h-[40vh] flex flex-col items-center justify-center gap-2">
          <div className="h-6 w-6 rounded-full border-2 border-slate-200 dark:border-slate-800 border-t-slate-900 dark:border-t-white animate-spin" />
          <p className="text-xs text-slate-400 font-mono">Querying catalog...</p>
        </div>
      ) : assets.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-8 text-center">
          <Info className="h-8 w-8 text-slate-400 dark:text-slate-600 mx-auto mb-2" />
          <h3 className="font-semibold text-sm text-slate-800 dark:text-slate-200">
            No assets found
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            Try adjusting your search keywords, category chips, or picking alternative date ranges.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {assets.map((asset) => {
            const isRedBadge = asset.availabilityBadge === 'Red'
            const isYellowBadge = asset.availabilityBadge === 'Yellow'

            // Availability statement
            let availabilityLabel = 'Available'
            let badgeColor =
              'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900'

            if (isRedBadge) {
              availabilityLabel = 'Out of Stock / Busy'
              badgeColor =
                'bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400 border-red-200 dark:border-red-900'
            } else if (isYellowBadge) {
              availabilityLabel = 'Low Stock'
              badgeColor =
                'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400 border-amber-200 dark:border-amber-900'
            }

            return (
              <div
                key={asset._id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm flex flex-col group hover:shadow transition-shadow"
              >
                {/* Visual Image */}
                <div className="h-44 bg-slate-100 dark:bg-slate-950 relative overflow-hidden shrink-0">
                  <img
                    src={
                      asset.imageUrl ||
                      'https://images.unsplash.com/photo-1619597455322-4fbbd820250a?w=400&auto=format&fit=crop&q=80'
                    }
                    alt={asset.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-3 right-3 flex flex-col gap-1.5">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badgeColor}`}
                    >
                      {availabilityLabel}
                    </span>
                  </div>
                </div>

                {/* Info Content */}
                <div className="p-4 flex-1 flex flex-col justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">
                        {asset.category}
                      </span>
                      <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                        Cond:{' '}
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {asset.condition}
                        </span>
                      </span>
                    </div>
                    <h3 className="font-semibold text-sm text-slate-900 dark:text-white leading-tight">
                      {asset.name}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-3 leading-normal">
                      {asset.description}
                    </p>
                  </div>

                  <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800/50">
                    <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                      <span>Total inventory:</span>
                      <span className="text-slate-800 dark:text-slate-200 font-bold">
                        {asset.quantityTotal} units
                      </span>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                      <span>Available for dates:</span>
                      <span
                        className={`font-bold ${isRedBadge ? 'text-red-500' : 'text-slate-800 dark:text-slate-200'}`}
                      >
                        {asset.calculatedRemaining !== undefined
                          ? asset.calculatedRemaining
                          : asset.quantityAvailable}{' '}
                        units
                      </span>
                    </div>

                    <button
                      onClick={() => handleOpenBooking(asset)}
                      disabled={isRedBadge}
                      className={`w-full py-1.5 flex items-center justify-center gap-1 font-semibold text-xs rounded-lg border transition-all ${
                        isRedBadge
                          ? 'bg-slate-100 text-slate-400 border-slate-200 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-600 cursor-not-allowed'
                          : 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 border-transparent hover:bg-slate-800 dark:hover:bg-slate-100 active:scale-[0.98]'
                      }`}
                    >
                      Request Reservation <ChevronRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Booking Form Dialog Modal */}
      {selectedAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-slate-800 dark:text-white" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Request Reservation
                </h3>
              </div>
              <button
                onClick={() => setSelectedAsset(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-850"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Content Body */}
            {submitSuccess ? (
              <div className="p-8 text-center flex flex-col items-center justify-center gap-2">
                <CheckCircle className="h-12 w-12 text-emerald-500 animate-bounce" />
                <h4 className="font-bold text-sm text-slate-900 dark:text-white mt-2">
                  Request Submitted Successfully
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs leading-normal">
                  Your reservation request is now pending review. The storekeeper will verify
                  inventory shortly.
                </p>
              </div>
            ) : (
              <form onSubmit={handleRequestBooking} className="p-5 space-y-4">
                {/* Details Banner */}
                <div className="flex gap-3.5 bg-slate-50 dark:bg-slate-950/50 border border-slate-150 dark:border-slate-800 p-3 rounded-lg">
                  <img
                    src={
                      selectedAsset.imageUrl ||
                      'https://images.unsplash.com/photo-1619597455322-4fbbd820250a?w=150&auto=format&fit=crop&q=80'
                    }
                    alt={selectedAsset.name}
                    className="h-16 w-16 rounded object-cover border border-slate-200 dark:border-slate-800"
                  />
                  <div className="min-w-0">
                    <span className="text-[9px] uppercase font-bold text-slate-400 dark:text-slate-500">
                      {selectedAsset.category}
                    </span>
                    <h4 className="font-semibold text-xs text-slate-900 dark:text-white truncate">
                      {selectedAsset.name}
                    </h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">
                      {selectedAsset.description}
                    </p>
                  </div>
                </div>

                {/* Form Controls */}
                <div className="grid grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">
                      Start Date
                    </label>
                    <input
                      type="date"
                      required
                      value={bookingStart}
                      onChange={(e) => setBookingStart(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-500 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">
                      End Date
                    </label>
                    <input
                      type="date"
                      required
                      value={bookingEnd}
                      onChange={(e) => setBookingEnd(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-500 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3.5 items-end">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">
                      Quantity Requested
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={
                        selectedAsset.calculatedRemaining || selectedAsset.quantityAvailable || 1
                      }
                      required
                      value={bookingQty}
                      onChange={(e) => setBookingQty(Number(e.target.value))}
                      className="w-full px-3 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-500 font-mono"
                    />
                  </div>
                  <div className="text-[10px] text-slate-400 dark:text-slate-500 pb-2">
                    Max available:{' '}
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      {selectedAsset.calculatedRemaining !== undefined
                        ? selectedAsset.calculatedRemaining
                        : selectedAsset.quantityAvailable}{' '}
                      units
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">
                    Booking Request Notes
                  </label>
                  <textarea
                    rows={3}
                    value={bookingNotes}
                    onChange={(e) => setBookingNotes(e.target.value)}
                    placeholder="Describe what shoot or project this gear will be used for..."
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-500 placeholder:text-slate-400 dark:placeholder:text-slate-700"
                  />
                </div>

                {errorMsg && (
                  <div className="p-2.5 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 text-xs text-red-600 dark:text-red-400 font-medium">
                    {errorMsg}
                  </div>
                )}

                {/* Footer Controls */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedAsset(null)}
                    className="px-4 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 font-semibold text-xs text-slate-600 dark:text-slate-400 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-1.5 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-950 hover:bg-slate-800 dark:hover:bg-slate-100 font-semibold text-xs border border-transparent transition-all"
                  >
                    {submitting ? 'Submitting...' : 'Submit Request'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
export default CatalogPage
