import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { ClerkProvider, useAuth, SignedIn, SignedOut, SignIn, useClerk } from '@clerk/clerk-react'

import Layout from './components/Layout'
import DevAuthBar from './components/DevAuthBar'

import CatalogPage from './pages/CatalogPage'
import ConsumerDashboard from './pages/ConsumerDashboard'
import AdminDashboard from './pages/AdminDashboard'
import InventoryCRUD from './pages/InventoryCRUD'
import QRScannerPage from './pages/QRScannerPage'
import MaintenanceLog from './pages/MaintenanceLog'
import AuditLogViewer from './pages/AuditLogViewer'
import AnalyticsDashboard from './pages/AnalyticsDashboard'

import { api } from './lib/api'
import type { UserProfile } from './lib/api'

// Retrieve Clerk key safely from env if present
const CLERK_PUBLISHABLE_KEY = (import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || '') as string

interface AdminRouteGuardProps {
  userProfile: UserProfile | null
  loadingProfile: boolean
  children: React.ReactNode
}

function AdminRouteGuard({ userProfile, loadingProfile, children }: AdminRouteGuardProps) {
  if (loadingProfile) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-2">
        <div className="h-5 w-5 rounded-full border-2 border-slate-200 dark:border-slate-800 border-t-slate-900 dark:border-t-white animate-spin" />
        <p className="text-[10px] text-slate-400 font-mono">Verifying credentials...</p>
      </div>
    )
  }
  if (!userProfile || userProfile.role !== 'ADMINISTRATOR') {
    return <Navigate to="/" replace />
  }
  return <>{children}</>
}

interface AppLayoutProps {
  userProfile: UserProfile | null
  loadingProfile: boolean
  clerkToken: string | null
  onUserChange: () => void
  onLogout?: () => void
}

function AppLayout({
  userProfile,
  loadingProfile,
  clerkToken,
  onUserChange,
  onLogout,
}: AppLayoutProps) {
  return (
    <>
      <Layout userProfile={userProfile} loadingProfile={loadingProfile} onLogout={onLogout}>
        <Routes>
          {/* Public / Consumer Access routes */}
          <Route path="/" element={<CatalogPage token={clerkToken} />} />
          <Route
            path="/dashboard"
            element={<ConsumerDashboard userProfile={userProfile} token={clerkToken} />}
          />

          {/* Admin Restricted routes */}
          <Route
            path="/admin"
            element={
              <AdminRouteGuard userProfile={userProfile} loadingProfile={loadingProfile}>
                <AdminDashboard token={clerkToken} />
              </AdminRouteGuard>
            }
          />
          <Route
            path="/admin/inventory"
            element={
              <AdminRouteGuard userProfile={userProfile} loadingProfile={loadingProfile}>
                <InventoryCRUD token={clerkToken} />
              </AdminRouteGuard>
            }
          />
          <Route
            path="/admin/scan"
            element={
              <AdminRouteGuard userProfile={userProfile} loadingProfile={loadingProfile}>
                <QRScannerPage token={clerkToken} />
              </AdminRouteGuard>
            }
          />
          <Route
            path="/admin/maintenance"
            element={
              <AdminRouteGuard userProfile={userProfile} loadingProfile={loadingProfile}>
                <MaintenanceLog token={clerkToken} />
              </AdminRouteGuard>
            }
          />
          <Route
            path="/admin/audit"
            element={
              <AdminRouteGuard userProfile={userProfile} loadingProfile={loadingProfile}>
                <AuditLogViewer token={clerkToken} />
              </AdminRouteGuard>
            }
          />
          <Route
            path="/admin/analytics"
            element={
              <AdminRouteGuard userProfile={userProfile} loadingProfile={loadingProfile}>
                <AnalyticsDashboard token={clerkToken} />
              </AdminRouteGuard>
            }
          />

          {/* Fallback redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>

      {/* Floating sandbox controls for local development */}
      {!CLERK_PUBLISHABLE_KEY && <DevAuthBar onUserChange={onUserChange} />}
    </>
  )
}

function ClerkAppContent() {
  const { isLoaded, userId, getToken } = useAuth()
  const { signOut } = useClerk()
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [clerkToken, setClerkToken] = useState<string | null>(null)

  useEffect(() => {
    if (isLoaded && userId) {
      api.setTokenResolver(getToken)
    }
  }, [isLoaded, userId, getToken])

  const syncProfile = async () => {
    setLoadingProfile(true)
    try {
      let token: string | null = null
      if (userId) {
        token = await getToken()
        setClerkToken(token)
      } else {
        setClerkToken(null)
      }

      const profile = await api.getCurrentUser(token)
      setUserProfile(profile)
    } catch (err) {
      console.warn('Clerk profile synchronization failed:', err)
      setUserProfile(null)
    } finally {
      setLoadingProfile(false)
    }
  }

  useEffect(() => {
    if (isLoaded) {
      syncProfile()
    }
  }, [isLoaded, userId])

  const handleClerkLogout = async () => {
    try {
      await signOut()
      window.location.reload()
    } catch (err) {
      console.error('Clerk logout failed:', err)
    }
  }

  return (
    <AppLayout
      userProfile={userProfile}
      loadingProfile={loadingProfile}
      clerkToken={clerkToken}
      onUserChange={syncProfile}
      onLogout={handleClerkLogout}
    />
  )
}

function MockAppContent() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loadingProfile, setLoadingProfile] = useState(true)

  const syncProfile = async () => {
    setLoadingProfile(true)
    try {
      const profile = await api.getCurrentUser(null)
      setUserProfile(profile)
    } catch (err) {
      console.warn('Mock profile load failed:', err)
      setUserProfile(null)
    } finally {
      setLoadingProfile(false)
    }
  }

  useEffect(() => {
    syncProfile()
  }, [])

  const handleMockLogout = () => {
    localStorage.removeItem('assetflow_mock_clerk_id')
    window.location.reload()
  }

  return (
    <AppLayout
      userProfile={userProfile}
      loadingProfile={loadingProfile}
      clerkToken={null}
      onUserChange={syncProfile}
      onLogout={handleMockLogout}
    />
  )
}

export function App() {
  if (CLERK_PUBLISHABLE_KEY) {
    return (
      <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>
        <Router>
          <SignedIn>
            <ClerkAppContent />
          </SignedIn>
          <SignedOut>
            <div className="min-h-screen w-full flex items-center justify-center bg-slate-950 p-4">
              <div className="max-w-md w-full border border-slate-800 bg-slate-900/50 p-6 rounded-2xl backdrop-blur-md shadow-2xl flex flex-col items-center">
                <div className="flex items-center gap-2 mb-8">
                  <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold shadow-md shadow-indigo-500/20">
                    A
                  </div>
                  <span className="text-lg font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                    AssetFlow
                  </span>
                </div>
                <SignIn routing="hash" />
              </div>
            </div>
          </SignedOut>
        </Router>
      </ClerkProvider>
    )
  }

  // Fallback to offline mock sandbox router
  return (
    <Router>
      <MockAppContent />
    </Router>
  )
}

export default App
