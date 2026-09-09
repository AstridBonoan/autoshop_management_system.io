import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { AppStore } from '../data/store'
import { isSupabaseConfigured } from '../lib/supabase'
import type { Profile } from '../types/domain'

const AppContext = createContext<{
  store: AppStore
  version: number
  refresh: () => void
  profile: Profile | null
  demoMode: boolean
} | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [store] = useState(() => AppStore.load())
  const [version, setVersion] = useState(0)
  const refresh = () => setVersion((value) => value + 1)
  const value = useMemo(
    () => ({
      store,
      version,
      refresh,
      profile: store.currentProfile(),
      demoMode: !isSupabaseConfigured(),
    }),
    [store, version],
  )
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const context = useContext(AppContext)
  if (!context) throw new Error('useApp must be used within AppProvider')
  return context
}
