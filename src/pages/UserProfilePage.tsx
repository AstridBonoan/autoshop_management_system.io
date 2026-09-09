import { Link, useParams } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { formatDateTime } from '../lib/format'
import { lookupLabel, vehicleLabel } from '../lib/autoshop'
import { Badge, Card, PageHeader, StatusBadge } from '../components/ui'
import { OPEN_REPAIR_STATUSES } from '../lib/autoshop'

export function UserProfilePage() {
  const { id } = useParams()
  const { store, profile } = useApp()
  const user = store.state.profiles.find((row) => row.id === (!id || id === 'me' ? profile?.id : id))
  if (!user) return <p>Staff member not found.</p>
  const role = store.state.roles.find((row) => row.id === user.roleId)
  const assignedCustomers = store.state.clients.filter((row) => row.assignedEmployeeId === user.id)
  const assignedOrders = store.state.repairOrders.filter((row) => row.technicianId === user.id && OPEN_REPAIR_STATUSES.includes(row.status))
  const assignedTasks = store.state.tasks.filter((row) => row.assignedEmployeeId === user.id && !row.archivedAt)
  const activity = store.state.activities.filter((row) => row.actorId === user.id).slice(0, 12)
  return (
    <div>
      <PageHeader title={user.fullName} description="Staff profile, assignments, and activity." />
      <Card>
        <dl className="grid gap-3 sm:grid-cols-2">
          <div><dt className="text-xs uppercase text-ink-soft">Email</dt><dd>{user.email}</dd></div>
          <div><dt className="text-xs uppercase text-ink-soft">Phone</dt><dd>{user.phone || '—'}</dd></div>
          <div><dt className="text-xs uppercase text-ink-soft">Position</dt><dd>{lookupLabel(store.state.lookups, user.positionId)}</dd></div>
          <div><dt className="text-xs uppercase text-ink-soft">Role</dt><dd>{role?.name}</dd></div>
          <div><dt className="text-xs uppercase text-ink-soft">Status</dt><dd><Badge tone={user.status === 'active' ? 'success' : 'neutral'}>{user.status}</Badge></dd></div>
          <div><dt className="text-xs uppercase text-ink-soft">Updated</dt><dd>{formatDateTime(user.updatedAt)}</dd></div>
        </dl>
        <p className="mt-4 text-sm text-ink-soft">{user.notes || 'No notes.'}</p>
      </Card>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card>
          <h3 className="font-semibold">Customer assignments</h3>
          <ul className="mt-2 space-y-1 text-sm">{assignedCustomers.map((row) => <li key={row.id}><Link className="text-teal" to={`/customers/${row.id}`}>{row.displayName}</Link></li>)}</ul>
        </Card>
        <Card>
          <h3 className="font-semibold">Repair assignments</h3>
          <ul className="mt-2 space-y-1 text-sm">
            {assignedOrders.map((row) => {
              const vehicle = store.state.vehicles.find((item) => item.id === row.vehicleId)
              return <li key={row.id}><Link className="text-teal" to={`/repair-orders/${row.id}`}>{row.number} · {vehicle ? vehicleLabel(vehicle) : ''}</Link> <StatusBadge status={row.status} /></li>
            })}
          </ul>
        </Card>
        <Card>
          <h3 className="font-semibold">Open tasks</h3>
          <ul className="mt-2 space-y-1 text-sm">{assignedTasks.filter((row) => row.status !== 'completed').map((row) => <li key={row.id}>{row.title}</li>)}</ul>
        </Card>
      </div>
      <Card className="mt-4">
        <h3 className="font-semibold">Activity</h3>
        <ul className="mt-2 space-y-2 text-sm">
          {activity.map((item) => (
            <li key={item.id}>{item.description} · {formatDateTime(item.createdAt)}</li>
          ))}
        </ul>
      </Card>
      {id ? <Link className="mt-4 inline-block text-sm text-teal underline" to="/users">Back to staff</Link> : null}
    </div>
  )
}
