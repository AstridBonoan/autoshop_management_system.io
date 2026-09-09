import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { canViewModule } from '../lib/permissions'
import type { ModuleKey } from '../types/domain'
import { Spinner } from './ui'

export function ProtectedRoute({
  children,
  module,
}: {
  children: ReactNode
  module?: ModuleKey
}) {
  const { profile, store } = useApp()
  const location = useLocation()

  if (!store.session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  if (!profile) {
    return <Spinner label="Restoring session" />
  }
  if (module && !canViewModule(store.state, profile, module)) {
    return <Navigate to="/unauthorized" replace />
  }
  return children
}
