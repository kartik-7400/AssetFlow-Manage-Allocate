// API Client for AssetFlow SaaS Application

export interface UserProfile {
  _id: string
  clerkId: string
  email: string
  firstName: string
  lastName: string
  imageUrl?: string
  role: 'ADMINISTRATOR' | 'CONSUMER'
  createdAt: string
  updatedAt: string
}

export interface Asset {
  _id: string
  name: string
  category: string
  description: string
  quantityTotal: number
  quantityAvailable: number
  quantityInMaintenance: number
  status: 'AVAILABLE' | 'MAINTENANCE' | 'RETIRED'
  condition: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'DAMAGED'
  qrCodeData: string
  imageUrl?: string
  availabilityBadge?: 'Green' | 'Yellow' | 'Red'
  calculatedRemaining?: number
  createdAt: string
  updatedAt: string
}

export interface Booking {
  _id: string
  user:
    | {
        _id: string
        clerkId: string
        firstName: string
        lastName: string
        email: string
        imageUrl?: string
      }
    | string
  asset: Asset | string
  quantity: number
  startDate: string
  endDate: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'ISSUED' | 'RETURNED' | 'CANCELLED' | 'OVERDUE'
  notes?: string
  issueNotes?: string
  returnNotes?: string
  issuedAt?: string
  returnedAt?: string
  createdAt: string
  updatedAt: string
}

export interface MaintenanceTicket {
  _id: string
  asset: Asset
  reportedBy: UserProfile
  booking?: string
  quantity: number
  condition: 'DAMAGED' | 'UNDER_REPAIR' | 'RESOLVED'
  damageReport: string
  resolutionDetails?: string
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED'
  createdAt: string
  updatedAt: string
}

export interface AuditLog {
  _id: string
  actor: UserProfile | 'SYSTEM' | string
  action:
    | 'ASSET_CREATE'
    | 'ASSET_UPDATE'
    | 'BOOKING_APPROVE'
    | 'BOOKING_REJECT'
    | 'ASSET_ISSUE'
    | 'ASSET_RETURN'
    | 'MAINTENANCE_LOG'
    | 'MAINTENANCE_RESOLVE'
  targetType: 'Asset' | 'Booking' | 'User' | 'Maintenance' | 'Notification'
  targetId: string
  details?: Record<string, any>
  createdAt: string
}

export interface SystemNotification {
  _id: string
  recipient: string
  title: string
  message: string
  type: 'BOOKING_REQUEST' | 'BOOKING_APPROVED' | 'BOOKING_REJECTED' | 'RETURN_REMINDER' | 'OVERDUE'
  isRead: boolean
  relatedBooking?: string
  createdAt: string
}

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || ''
const BASE_URL = `${BACKEND_URL}/api`

let tokenResolver: (() => Promise<string | null>) | null = null

/**
 * Get HTTP Headers including Clerk or Mock Auth headers.
 */
async function getHeaders(token?: string | null): Promise<HeadersInit> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  let resolvedToken = token
  if (tokenResolver) {
    try {
      resolvedToken = await tokenResolver()
    } catch (err) {
      console.error('Failed to resolve dynamic token:', err)
    }
  }

  if (resolvedToken) {
    headers['Authorization'] = `Bearer ${resolvedToken}`
  } else {
    // Check local storage for mock developer auth
    const mockClerkId = localStorage.getItem('assetflow_mock_clerk_id')
    if (mockClerkId) {
      headers['x-mock-clerk-id'] = mockClerkId
    }
  }

  return headers
}

/**
 * Handle API responses and standardize errors.
 */
async function handleResponse(response: Response) {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    const errorMessage =
      errorData.error ||
      errorData.warning ||
      `HTTP Error ${response.status}: ${response.statusText}`

    // Custom handling for warning overrides
    if (errorData.code === 'INVENTORY_WARNING') {
      const error: any = new Error(errorMessage)
      error.code = 'INVENTORY_WARNING'
      error.warning = errorMessage
      throw error
    }

    throw new Error(errorMessage)
  }
  return response.json()
}

export const api = {
  setTokenResolver: (resolver: () => Promise<string | null>) => {
    tokenResolver = resolver
  },

  // --- USER PROFILE ---
  getCurrentUser: async (token?: string | null): Promise<UserProfile> => {
    const res = await fetch(`${BASE_URL}/users/me`, {
      method: 'GET',
      headers: await getHeaders(token),
    })
    return handleResponse(res)
  },

  // --- ASSETS ---
  getAssets: async (
    filters?: {
      category?: string
      condition?: string
      search?: string
      startDate?: string
      endDate?: string
    },
    token?: string | null,
  ): Promise<Asset[]> => {
    const params = new URLSearchParams()
    if (filters) {
      if (filters.category) params.append('category', filters.category)
      if (filters.condition) params.append('condition', filters.condition)
      if (filters.search) params.append('search', filters.search)
      if (filters.startDate) params.append('startDate', filters.startDate)
      if (filters.endDate) params.append('endDate', filters.endDate)
    }
    const res = await fetch(`${BASE_URL}/assets?${params.toString()}`, {
      method: 'GET',
      headers: await getHeaders(token),
    })
    return handleResponse(res)
  },

  createAsset: async (data: Partial<Asset>, token?: string | null): Promise<Asset> => {
    const res = await fetch(`${BASE_URL}/assets`, {
      method: 'POST',
      headers: await getHeaders(token),
      body: JSON.stringify(data),
    })
    return handleResponse(res)
  },

  updateAsset: async (id: string, data: Partial<Asset>, token?: string | null): Promise<Asset> => {
    const res = await fetch(`${BASE_URL}/assets/${id}`, {
      method: 'PUT',
      headers: await getHeaders(token),
      body: JSON.stringify(data),
    })
    return handleResponse(res)
  },

  deleteAsset: async (
    id: string,
    token?: string | null,
  ): Promise<{ message: string; asset: Asset }> => {
    const res = await fetch(`${BASE_URL}/assets/${id}`, {
      method: 'DELETE',
      headers: await getHeaders(token),
    })
    return handleResponse(res)
  },

  // --- BOOKINGS ---
  getBookings: async (
    filters?: {
      status?: string
      overdue?: boolean
    },
    token?: string | null,
  ): Promise<Booking[]> => {
    const params = new URLSearchParams()
    if (filters) {
      if (filters.status) params.append('status', filters.status)
      if (filters.overdue) params.append('overdue', String(filters.overdue))
    }
    const res = await fetch(`${BASE_URL}/bookings?${params.toString()}`, {
      method: 'GET',
      headers: await getHeaders(token),
    })
    return handleResponse(res)
  },

  createBooking: async (
    data: {
      assetId: string
      quantity: number
      startDate: string
      endDate: string
      notes?: string
    },
    token?: string | null,
  ): Promise<Booking> => {
    const res = await fetch(`${BASE_URL}/bookings`, {
      method: 'POST',
      headers: await getHeaders(token),
      body: JSON.stringify(data),
    })
    return handleResponse(res)
  },

  updateBookingStatus: async (
    id: string,
    data: {
      status: 'APPROVED' | 'REJECTED'
      notes?: string
      force?: boolean
    },
    token?: string | null,
  ): Promise<Booking> => {
    const res = await fetch(`${BASE_URL}/bookings/${id}/status`, {
      method: 'PATCH',
      headers: await getHeaders(token),
      body: JSON.stringify(data),
    })
    return handleResponse(res)
  },

  issueAssetBooking: async (
    id: string,
    notes?: string,
    token?: string | null,
  ): Promise<Booking> => {
    const res = await fetch(`${BASE_URL}/bookings/${id}/issue`, {
      method: 'POST',
      headers: await getHeaders(token),
      body: JSON.stringify({ notes }),
    })
    return handleResponse(res)
  },

  returnAssetBooking: async (
    id: string,
    data: {
      condition: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'DAMAGED'
      notes?: string
    },
    token?: string | null,
  ): Promise<Booking> => {
    const res = await fetch(`${BASE_URL}/bookings/${id}/return`, {
      method: 'POST',
      headers: await getHeaders(token),
      body: JSON.stringify(data),
    })
    return handleResponse(res)
  },

  sendOverdueAlert: async (id: string, token?: string | null): Promise<{ message: string }> => {
    const res = await fetch(`${BASE_URL}/bookings/${id}/overdue-alert`, {
      method: 'POST',
      headers: await getHeaders(token),
    })
    return handleResponse(res)
  },

  // --- MAINTENANCE ---
  getMaintenanceTickets: async (token?: string | null): Promise<MaintenanceTicket[]> => {
    const res = await fetch(`${BASE_URL}/maintenance`, {
      method: 'GET',
      headers: await getHeaders(token),
    })
    return handleResponse(res)
  },

  resolveMaintenanceTicket: async (
    id: string,
    data: { resolutionDetails: string },
    token?: string | null,
  ): Promise<MaintenanceTicket> => {
    const res = await fetch(`${BASE_URL}/maintenance/${id}/resolve`, {
      method: 'POST',
      headers: await getHeaders(token),
      body: JSON.stringify(data),
    })
    return handleResponse(res)
  },

  // --- AUDIT LOGS ---
  getAuditLogs: async (token?: string | null): Promise<AuditLog[]> => {
    const res = await fetch(`${BASE_URL}/audit`, {
      method: 'GET',
      headers: await getHeaders(token),
    })
    return handleResponse(res)
  },
}
