import { useMemo, useState, type ReactNode } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  Activity,
  BarChart3,
  Bell,
  Calendar,
  Car,
  ClipboardCheck,
  ClipboardList,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Search,
  Settings,
  Shield,
  Users,
  Wrench,
  CalendarClock,
  CircleDollarSign,
  Boxes,
  FileSignature,
  X,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { canViewModule } from '../lib/permissions'
import { PRODUCT, vehicleLabel } from '../lib/autoshop'
import type { ModuleKey } from '../types/domain'
import { ProductMark } from './ProductMark'
import { Button, Input } from './ui'

type NavItem = { to: string; label: string; module: ModuleKey; icon: typeof LayoutDashboard }

const GROUPS: Array<{ label: string; items: NavItem[] }> = [
  {
    label: 'Operations',
    items: [
      { to: '/', label: 'Dashboard', module: 'dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Customers',
    items: [
      { to: '/customers', label: 'Customers', module: 'clients', icon: Users },
      { to: '/vehicles', label: 'Vehicles', module: 'vehicles', icon: Car },
    ],
  },
  {
    label: 'Service',
    items: [
      { to: '/appointments', label: 'Appointments', module: 'appointments', icon: Calendar },
      { to: '/repair-orders', label: 'Repair Orders', module: 'repair_orders', icon: Wrench },
      { to: '/estimates', label: 'Estimates', module: 'estimates', icon: FileSignature },
      { to: '/inspections', label: 'Inspections', module: 'inspections', icon: ClipboardCheck },
    ],
  },
  {
    label: 'Shop',
    items: [
      { to: '/technicians', label: 'Technicians', module: 'technicians', icon: Shield },
      { to: '/schedule', label: 'Schedule', module: 'scheduling', icon: CalendarClock },
      { to: '/tasks', label: 'Tasks', module: 'tasks', icon: ClipboardList },
      { to: '/parts', label: 'Parts', module: 'parts', icon: Package },
      { to: '/inventory', label: 'Inventory', module: 'inventory', icon: Boxes },
    ],
  },
  {
    label: 'Administration',
    items: [
      { to: '/payments', label: 'Payments', module: 'payments', icon: CircleDollarSign },
      { to: '/reports', label: 'Reports', module: 'reports', icon: BarChart3 },
      { to: '/documents', label: 'Documents', module: 'documents', icon: FileText },
      { to: '/activity', label: 'Activity', module: 'activity', icon: Activity },
      { to: '/users', label: 'Staff', module: 'users', icon: Users },
      { to: '/settings', label: 'Settings', module: 'settings', icon: Settings },
    ],
  },
]

export function AppShell() {
  const { store, profile, demoMode, refresh } = useApp()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const unread = store.state.notifications.filter((item) => item.recipientId === profile?.id && !item.readAt).length
  const results = useMemo(() => (query.trim().length > 1 ? store.globalSearch(query, 5) : null), [query, store])

  return (
    <div className="min-h-svh bg-paper lg:grid lg:grid-cols-[280px_1fr]">
      <aside className={`brand-panel fixed inset-y-0 left-0 z-40 w-[280px] text-white transition lg:static ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="flex h-full flex-col">
          <div className="flex items-start justify-between gap-2 px-4 py-5">
            <div className="min-w-0">
              <ProductMark variant="onDark" />
              <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-gold">{PRODUCT.tagline}</p>
            </div>
            <button className="lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu">
              <X />
            </button>
          </div>
          <nav className="flex-1 space-y-4 overflow-y-auto px-3 pb-6">
            {GROUPS.map((group) => {
              const items = group.items.filter((item) => canViewModule(store.state, profile, item.module))
              if (!items.length) return null
              return (
                <div key={group.label}>
                  <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">{group.label}</p>
                  <div className="space-y-1">
                    {items.map((item) => {
                      const Icon = item.icon
                      return (
                        <NavLink
                          key={item.to}
                          to={item.to}
                          end={item.to === '/' || item.to === '/settings'}
                          onClick={() => setOpen(false)}
                          className={({ isActive }) =>
                            `flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-sm ${isActive ? 'bg-white/10 text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`
                          }
                        >
                          <Icon size={18} />
                          {item.label}
                        </NavLink>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </nav>
          <p className="px-4 pb-4 text-[10px] uppercase tracking-[0.16em] text-slate-500">A {PRODUCT.developer} product</p>
        </div>
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex flex-col gap-3 border-b border-line bg-card/95 px-4 py-3 backdrop-blur sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <button className="rounded-md p-2 hover:bg-paper-2 lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
              <Menu />
            </button>
            <div className="relative min-w-0 flex-1 sm:w-[28rem]">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-ink-soft" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search customers, VIN, plate, repair orders"
                aria-label="Search records"
                className="pl-9"
              />
              {results ? (
                <div className="absolute z-20 mt-1 w-full rounded-lg border border-line bg-card p-2 text-sm shadow-lg">
                  <SearchGroup
                    label="Customers"
                    items={results.clients.map((item) => ({ id: item.id, label: item.displayName, to: `/customers/${item.id}` }))}
                    onPick={(to) => { setQuery(''); navigate(to) }}
                  />
                  <SearchGroup
                    label="Vehicles"
                    items={results.vehicles.map((item) => ({ id: item.id, label: `${vehicleLabel(item)} · ${item.licensePlate || item.vin}`, to: `/vehicles/${item.id}` }))}
                    onPick={(to) => { setQuery(''); navigate(to) }}
                  />
                  <SearchGroup
                    label="Repair orders"
                    items={results.repairOrders.map((item) => ({ id: item.id, label: item.number, to: `/repair-orders/${item.id}` }))}
                    onPick={(to) => { setQuery(''); navigate(to) }}
                  />
                  <SearchGroup
                    label="Staff"
                    items={results.users.map((item) => ({ id: item.id, label: item.fullName, to: `/users/${item.id}` }))}
                    onPick={(to) => { setQuery(''); navigate(to) }}
                  />
                  <SearchGroup
                    label="Parts"
                    items={results.parts.map((item) => ({ id: item.id, label: `${item.name} · ${item.partNumber}`, to: '/parts' }))}
                    onPick={(to) => { setQuery(''); navigate(to) }}
                  />
                </div>
              ) : null}
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {demoMode ? <span className="rounded-full bg-gold-soft px-2 py-1 text-xs font-semibold text-teal-deep">Demo mode</span> : null}
            <Button variant="ghost" type="button" onClick={() => navigate('/notifications')} aria-label="Notifications">
              <Bell size={18} />
              {unread ? <span className="rounded-full bg-gold px-1.5 text-xs text-white">{unread}</span> : null}
            </Button>
            <button className="rounded-md px-2 text-left text-sm" onClick={() => navigate('/profile')}>
              <span className="block font-semibold">{profile?.fullName}</span>
              <span className="text-xs text-ink-soft">{profile?.title || profile?.email}</span>
            </button>
            <Button
              variant="ghost"
              type="button"
              onClick={() => {
                store.logout()
                refresh()
                navigate('/login')
              }}
            >
              <LogOut size={18} />
              Log out
            </Button>
          </div>
        </header>
        <main className="px-4 py-6 sm:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

function SearchGroup({
  label,
  items,
  onPick,
}: {
  label: string
  items: Array<{ id: string; label: string; to: string }>
  onPick: (to: string) => void
}) {
  if (!items.length) return null
  return (
    <div>
      <p className="px-2 pt-1 text-xs uppercase text-ink-soft">{label}</p>
      {items.map((item) => (
        <button key={item.id} className="block w-full rounded px-2 py-1.5 text-left hover:bg-paper-2" onClick={() => onPick(item.to)}>
          {item.label}
        </button>
      ))}
    </div>
  )
}

export function RelatedLink({ to, children }: { to: string; children: ReactNode }) {
  return <NavLink className="text-teal" to={to}>{children}</NavLink>
}
