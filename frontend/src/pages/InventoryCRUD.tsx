import React, { useState, useEffect } from 'react'
import { api } from '../lib/api'
import type { Asset } from '../lib/api'
import { QRCodeSVG } from 'qrcode.react'
import { Plus, Edit2, Trash2, Printer, X, FolderOpen } from 'lucide-react'

interface InventoryCRUDProps {
  token?: string | null
}

export const InventoryCRUD: React.FC<InventoryCRUDProps> = ({ token }) => {
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)

  // Form Editor Modal state
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [showForm, setShowForm] = useState(false)

  // Form Fields
  const [name, setName] = useState('')
  const [category, setCategory] = useState('Camera')
  const [description, setDescription] = useState('')
  const [quantityTotal, setQuantityTotal] = useState(1)
  const [condition, setCondition] = useState<'EXCELLENT' | 'GOOD' | 'FAIR' | 'DAMAGED'>('EXCELLENT')
  const [imageUrl, setImageUrl] = useState('')
  const [qrCodeData, setQrCodeData] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  // Print Label State
  const [printingAsset, setPrintingAsset] = useState<Asset | null>(null)

  const fetchAssets = async () => {
    setLoading(true)
    try {
      const data = await api.getAssets({}, token)
      setAssets(data)
    } catch (err) {
      console.error('Error fetching assets:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAssets()
  }, [token])

  // Open Form to Create
  const handleOpenCreate = () => {
    setIsNew(true)
    setEditingAsset(null)
    setName('')
    setCategory('Camera')
    setDescription('')
    setQuantityTotal(1)
    setCondition('EXCELLENT')
    setImageUrl('')
    // Prefill with a clean unique string suggestion
    setQrCodeData(`QR-AF-${Date.now()}`)
    setErrorMsg('')
    setShowForm(true)
  }

  // Open Form to Edit
  const handleOpenEdit = (asset: Asset) => {
    setIsNew(false)
    setEditingAsset(asset)
    setName(asset.name)
    setCategory(asset.category)
    setDescription(asset.description)
    setQuantityTotal(asset.quantityTotal)
    setCondition(asset.condition)
    setImageUrl(asset.imageUrl || '')
    setQrCodeData(asset.qrCodeData)
    setErrorMsg('')
    setShowForm(true)
  }

  // Submit Form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setErrorMsg('')

    const payload = {
      name,
      category,
      description,
      quantityTotal,
      condition,
      imageUrl: imageUrl || undefined,
      qrCodeData,
    }

    try {
      if (isNew) {
        await api.createAsset(payload, token)
      } else if (editingAsset) {
        await api.updateAsset(editingAsset._id, payload, token)
      }
      setShowForm(false)
      fetchAssets()
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save asset. Check unique constraints on QR code.')
    } finally {
      setSubmitting(false)
    }
  }

  // Retire / Delete Asset
  const handleRetire = async (asset: Asset) => {
    const confirmText = `Are you sure you want to retire ${asset.name}? This will mark it as retired and zero out store availability.`
    if (!window.confirm(confirmText)) return

    try {
      await api.deleteAsset(asset._id, token)
      fetchAssets()
    } catch (err: any) {
      alert(err.message || 'Failed to retire asset.')
    }
  }

  // Open Browser Print Dialog for Label
  const triggerPrintWindow = () => {
    window.print()
  }

  return (
    <div className="space-y-6">
      {/* Intro Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Equipment Registry
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Create catalog items, edit total stock sizes, and generate QR code stickers.
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="flex items-center justify-center gap-1.5 px-4 py-2 bg-slate-900 text-white dark:bg-white dark:text-slate-950 hover:bg-slate-800 dark:hover:bg-slate-100 font-semibold text-xs rounded-lg transition-colors border border-transparent shadow-sm self-start sm:self-center"
        >
          <Plus className="h-4 w-4" /> Add New Asset
        </button>
      </div>

      {/* Grid inventory list */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-xs text-slate-400 font-mono">
              Loading inventory...
            </div>
          ) : assets.length === 0 ? (
            <div className="p-8 text-center text-slate-400 dark:text-slate-500">
              <FolderOpen className="h-8 w-8 mx-auto mb-2 opacity-50 stroke-1.25" />
              <p className="text-xs">No assets available in the catalog database yet.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-805 text-[10px] uppercase font-bold text-slate-450 tracking-wider">
                  <th className="px-5 py-3">Asset</th>
                  <th className="px-5 py-3">Identifier (QR String)</th>
                  <th className="px-5 py-3">Condition</th>
                  <th className="px-5 py-3">Stock Details</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-850 text-xs">
                {assets.map((asset) => (
                  <tr key={asset._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/20">
                    <td className="px-5 py-4 min-w-[200px]">
                      <div className="flex items-center gap-3">
                        <img
                          src={
                            asset.imageUrl ||
                            'https://images.unsplash.com/photo-1619597455322-4fbbd820250a?w=120&auto=format&fit=crop&q=80'
                          }
                          alt={asset.name}
                          className="h-9 w-9 rounded object-cover border border-slate-200 dark:border-slate-800"
                        />
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-white">
                            {asset.name}
                          </p>
                          <span className="text-[9px] uppercase font-bold text-slate-400 bg-slate-50 dark:bg-slate-950 px-1.5 py-0.5 rounded">
                            {asset.category}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 font-mono font-bold text-[10px] text-slate-500 dark:text-slate-400">
                      {asset.qrCodeData}
                    </td>
                    <td className="px-5 py-4 font-semibold text-slate-700 dark:text-slate-350">
                      {asset.condition}
                    </td>
                    <td className="px-5 py-4">
                      <div className="space-y-0.5">
                        <p className="font-semibold text-slate-800 dark:text-slate-200">
                          Total: {asset.quantityTotal} units
                        </p>
                        <p className="text-[10px] text-slate-400">
                          Avail:{' '}
                          <span className="text-emerald-500 font-bold">
                            {asset.quantityAvailable}
                          </span>{' '}
                          | Repair:{' '}
                          <span className="text-amber-500 font-bold">
                            {asset.quantityInMaintenance}
                          </span>
                        </p>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setPrintingAsset(asset)}
                          className="p-1.5 rounded-md text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                          title="Generate & Print QR Code Label"
                        >
                          <Printer className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(asset)}
                          className="p-1.5 rounded-md text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/20"
                          title="Edit Details"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleRetire(asset)}
                          className="p-1.5 rounded-md text-red-650 hover:bg-red-50 dark:hover:bg-red-950/20"
                          title="Retire Asset"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Create / Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                {isNew ? 'Register New Equipment Asset' : `Edit ${editingAsset?.name}`}
              </h3>
              <button
                onClick={() => setShowForm(false)}
                className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">
                  Asset Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Sony FX3 Cinema Camera"
                  className="w-full px-3 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-500"
                  >
                    <option value="Camera">Camera</option>
                    <option value="Lighting">Lighting</option>
                    <option value="Audio">Audio</option>
                    <option value="Lenses">Lenses</option>
                    <option value="Costumes">Costumes</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">
                    Physical Condition
                  </label>
                  <select
                    value={condition}
                    onChange={(e) => setCondition(e.target.value as any)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-500"
                  >
                    <option value="EXCELLENT">EXCELLENT</option>
                    <option value="GOOD">GOOD</option>
                    <option value="FAIR">FAIR</option>
                    <option value="DAMAGED">DAMAGED</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">
                    Total Quantity <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={quantityTotal}
                    onChange={(e) => setQuantityTotal(Number(e.target.value))}
                    className="w-full px-3 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-500 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">
                    QR Data Identifier <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    disabled={!isNew}
                    value={qrCodeData}
                    onChange={(e) => setQrCodeData(e.target.value)}
                    placeholder="e.g. QR-SONY-FX3-001"
                    className="w-full px-3 py-1.5 text-xs rounded-lg bg-slate-55 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-500 font-mono disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">
                  Image URL
                </label>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="e.g. https://images.unsplash.com/photo..."
                  className="w-full px-3 py-1.5 text-xs rounded-lg bg-slate-55 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">
                  Asset Specifications / Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add detailed description, camera resolution details, lighting configurations..."
                  className="w-full px-3 py-2 text-xs rounded-lg bg-slate-55 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-500 placeholder:text-slate-400 dark:placeholder:text-slate-700"
                />
              </div>

              {errorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 dark:bg-red-950/20 dark:border-red-900 text-red-650 rounded-lg text-xs font-semibold">
                  {errorMsg}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 font-semibold text-xs text-slate-650"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-950 hover:bg-slate-800 dark:hover:bg-slate-100 font-semibold text-xs transition-colors"
                >
                  {submitting ? 'Saving...' : 'Save Asset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Print Friendly QR Label Overlay Modal */}
      {printingAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm print:bg-white print:p-0 print:inset-auto print:static">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-xl border border-slate-250 dark:border-slate-800 shadow-2xl p-6 relative flex flex-col items-center justify-center gap-5 print:border-none print:shadow-none print:p-0">
            {/* Close controls hidden during system printing */}
            <button
              onClick={() => setPrintingAsset(null)}
              className="absolute top-4 right-4 p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-850 print:hidden"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Print Friendly CSS Layout Area */}
            <div className="w-[180px] h-[250px] border-2 border-dashed border-slate-350 dark:border-slate-700 bg-white dark:bg-white p-4 rounded-lg flex flex-col items-center justify-between text-center select-none print:border-solid print:border-2 print:border-black print:rounded-none">
              <div className="space-y-0.5">
                <span className="text-[12px] font-extrabold text-black uppercase tracking-wider block font-sans">
                  ASSETFLOW
                </span>
                <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest block font-sans">
                  {printingAsset.category}
                </span>
              </div>

              {/* Physical QR code string in black color */}
              <div className="p-1 bg-white border border-slate-200 rounded">
                <QRCodeSVG
                  value={printingAsset.qrCodeData}
                  size={100}
                  level="H"
                  fgColor="#000000"
                  bgColor="#FFFFFF"
                />
              </div>

              <div className="space-y-0.5">
                <p className="text-[10px] font-bold text-black truncate max-w-[150px] font-sans">
                  {printingAsset.name}
                </p>
                <p className="text-[8px] font-mono text-slate-600 font-bold block">
                  {printingAsset.qrCodeData}
                </p>
              </div>
            </div>

            {/* Action buttons triggers system print window */}
            <div className="flex gap-2 w-full pt-4 border-t border-slate-100 dark:border-slate-800 print:hidden">
              <button
                onClick={() => setPrintingAsset(null)}
                className="flex-1 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-650 font-semibold text-xs transition-colors"
              >
                Close View
              </button>
              <button
                onClick={triggerPrintWindow}
                className="flex-1 py-1.5 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-955 hover:bg-slate-800 dark:hover:bg-slate-100 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <Printer className="h-3.5 w-3.5" /> Print Label
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
export default InventoryCRUD
