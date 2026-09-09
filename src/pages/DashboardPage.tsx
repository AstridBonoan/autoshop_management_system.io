import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { formatDateTime } from '../lib/format'
import { prettyStatus, vehicleLabel } from '../lib/autoshop'
import { Badge, Button, Card, EmptyState, PageHeader, StatusBadge } from '../components/ui'

export function DashboardPage() {
  const { store } = useApp()
  const dash = store.shopDashboard()

  return (
    <div>
      <PageHeader
        title="Shop floor"
        description="What needs attention in the bays today."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link to="/appointments"><Button type="button">New appointment</Button></Link>
            <Link to="/repair-orders"><Button type="button" variant="secondary">New repair order</Button></Link>
            <Link to="/customers"><Button type="button" variant="secondary">Find customer</Button></Link>
          </div>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Stat to="/appointments" label="Vehicles today" value={dash.appointmentsToday.length} />
        <Stat to="/repair-orders" label="Open repair orders" value={dash.openOrders.length} />
        <Stat to="/repair-orders" label="Awaiting approval" value={dash.awaiting.length} warn={dash.awaiting.length > 0} />
        <Stat to="/repair-orders" label="Ready for pickup" value={dash.ready.length} />
        <Stat to="/technicians" label="Technicians working" value={dash.working.length} />
        <Stat to="/inventory" label="Low stock" value={dash.lowStock.length} warn={dash.lowStock.length > 0} />
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Card>
          <h2 className="font-display text-xl">Today's appointments</h2>
          {dash.appointmentsToday.length === 0 ? <EmptyState title="No appointments today" body="The book is clear. Create a drop-off when the next customer calls." /> : (
            <ul className="mt-3 space-y-2 text-sm">
              {dash.appointmentsToday.map((item) => {
                const vehicle = store.state.vehicles.find((row) => row.id === item.vehicleId)
                const customer = store.state.clients.find((row) => row.id === item.clientId)
                return (
                  <li key={item.id} className="flex justify-between gap-3 border-b border-line py-2 last:border-0">
                    <span>
                      <span className="font-medium">{item.startTime}</span> · {customer?.displayName ?? 'Walk-in'} · {vehicle ? vehicleLabel(vehicle) : item.title}
                    </span>
                    <StatusBadge status={item.status} />
                  </li>
                )
              })}
            </ul>
          )}
        </Card>
        <Card>
          <h2 className="font-display text-xl">Vehicles in shop</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {dash.inShop.map((vehicle) => {
              const owner = store.state.clients.find((row) => row.id === vehicle.customerId)
              return (
                <li key={vehicle.id} className="flex justify-between gap-3 border-b border-line py-2 last:border-0">
                  <Link className="text-teal" to={`/vehicles/${vehicle.id}`}>{vehicleLabel(vehicle)}</Link>
                  <span className="text-ink-soft">{owner?.displayName} · {prettyStatus(vehicle.status)}</span>
                </li>
              )
            })}
          </ul>
        </Card>
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Card>
          <h2 className="font-display text-xl">Jobs being worked</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {dash.working.map((order) => {
              const vehicle = store.state.vehicles.find((row) => row.id === order.vehicleId)
              const tech = store.state.profiles.find((row) => row.id === order.technicianId)
              return (
                <li key={order.id} className="flex justify-between gap-3 border-b border-line py-2 last:border-0">
                  <Link className="text-teal" to={`/repair-orders/${order.id}`}>{order.number} · {vehicle ? vehicleLabel(vehicle) : 'Vehicle'}</Link>
                  <span className="text-ink-soft">{tech?.fullName ?? 'Unassigned'}</span>
                </li>
              )
            })}
          </ul>
        </Card>
        <Card>
          <h2 className="font-display text-xl">Technician workload</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {dash.workload.map((row) => (
              <li key={row.profile.id} className="flex justify-between gap-3 border-b border-line py-2 last:border-0">
                <Link className="text-teal" to="/technicians">{row.profile.fullName}</Link>
                <span className="text-ink-soft">{row.jobs.length} jobs · {row.tasks.length} tasks</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card>
          <h2 className="font-display text-xl">Pending estimates</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {dash.pendingEstimates.map((item) => (
              <li key={item.id}><Link className="text-teal" to="/estimates">{item.number}</Link> · <StatusBadge status={item.status} /></li>
            ))}
          </ul>
        </Card>
        <Card>
          <h2 className="font-display text-xl">Low inventory</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {dash.lowStock.map((item) => (
              <li key={item.id} className="flex justify-between">
                <Link className="text-teal" to="/inventory">{item.name}</Link>
                <Badge tone="warn">{item.quantity} {item.unit}</Badge>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <h2 className="font-display text-xl">Notifications</h2>
          <ul className="mt-3 space-y-2">
            {dash.notifications.map((item) => (
              <li key={item.id} className="rounded-md bg-paper px-3 py-2">
                <p className="text-sm font-semibold">{item.title}</p>
                <p className="text-sm text-ink-soft">{item.body}</p>
              </li>
            ))}
          </ul>
        </Card>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="font-display text-xl">Recent customer activity</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {dash.recentCustomers.map((item) => (
              <li key={item.id} className="flex justify-between">
                <Link className="text-teal" to={`/customers/${item.id}`}>{item.displayName}</Link>
                <span className="text-ink-soft">{formatDateTime(item.updatedAt)}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <h2 className="font-display text-xl">Recent repair activity</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {dash.recentRepairs.map((item) => (
              <li key={item.id} className="flex justify-between">
                <Link className="text-teal" to={`/repair-orders/${item.id}`}>{item.number}</Link>
                <StatusBadge status={item.status} />
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  )
}

function Stat({ to, label, value, warn }: { to: string; label: string; value: number; warn?: boolean }) {
  return (
    <Link to={to}>
      <Card className={warn ? 'border-warn/40' : undefined}>
        <p className="text-sm text-ink-soft">{label}</p>
        <p className="mt-2 font-display text-4xl">{value}</p>
      </Card>
    </Link>
  )
}
