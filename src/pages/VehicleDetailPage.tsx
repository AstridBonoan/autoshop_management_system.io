import { Link, useParams } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { formatDate, formatMoney } from '../lib/format'
import { vehicleLabel } from '../lib/autoshop'
import { Card, PageHeader, StatusBadge } from '../components/ui'

export function VehicleDetailPage() {
  const { id } = useParams()
  const { store } = useApp()
  const vehicle = store.getVehicle(id ?? '')
  if (!vehicle) return <p>Vehicle not found.</p>
  const customer = store.state.clients.find((row) => row.id === vehicle.customerId)
  const history = store.vehicleHistory(vehicle.id)
  const appointments = store.state.appointments.filter((row) => row.vehicleId === vehicle.id)
  const documents = store.state.documents.filter((row) => row.vehicleId === vehicle.id && !row.archivedAt)
  const inspections = store.state.inspections.filter((row) => row.vehicleId === vehicle.id)

  return (
    <div>
      <PageHeader
        title={vehicleLabel(vehicle)}
        description={`${vehicle.color || 'Color not set'} · ${vehicle.licensePlate || 'No plate'} · VIN ${vehicle.vin || '—'}`}
        actions={<StatusBadge status={vehicle.status} />}
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <h2 className="font-semibold">Owner</h2>
          <p className="mt-2">{customer ? <Link className="text-teal" to={`/customers/${customer.id}`}>{customer.displayName}</Link> : '—'}</p>
          <p className="text-sm text-ink-soft">{customer?.phone} · {customer?.email}</p>
        </Card>
        <Card>
          <h2 className="font-semibold">Current mileage</h2>
          <p className="mt-2 font-display text-3xl">{vehicle.mileage.toLocaleString()}</p>
        </Card>
        <Card>
          <h2 className="font-semibold">Notes</h2>
          <p className="mt-2 text-sm text-ink-soft">{vehicle.notes || 'No vehicle notes.'}</p>
        </Card>
      </div>
      <Card className="mt-4">
        <h2 className="font-display text-xl">Service history</h2>
        <ul className="mt-3 space-y-4">
          {history.map(({ order, items, inspections: orderInspections }) => {
            const tech = store.state.profiles.find((row) => row.id === order.technicianId)
            const money = store.orderMoney(order)
            return (
              <li key={order.id} className="rounded-lg border border-line p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link className="font-semibold text-teal" to={`/repair-orders/${order.id}`}>{order.number}</Link>
                  <StatusBadge status={order.status} />
                </div>
                <p className="mt-1 text-sm text-ink-soft">{formatDate(order.openedAt)} · {order.mileage.toLocaleString()} mi · {tech?.fullName ?? 'Unassigned'}</p>
                <p className="mt-2 text-sm">{order.customerConcern || order.approvedWork || order.notes}</p>
                <ul className="mt-2 text-sm text-ink-soft">
                  {items.map((item) => (
                    <li key={item.id}>{item.kind}: {item.description}</li>
                  ))}
                </ul>
                {orderInspections.map((inspection) => (
                  <p key={inspection.id} className="mt-2 text-sm">Inspection {inspection.number}: {inspection.recommendations || inspection.notes}</p>
                ))}
                <p className="mt-2 text-sm">Total {formatMoney(money.total)}</p>
              </li>
            )
          })}
        </ul>
      </Card>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="font-semibold">Appointments</h2>
          <ul className="mt-2 space-y-2 text-sm">
            {appointments.map((item) => (
              <li key={item.id}>{formatDate(item.date)} {item.startTime} · {item.title} · <StatusBadge status={item.status} /></li>
            ))}
          </ul>
        </Card>
        <Card>
          <h2 className="font-semibold">Inspections & documents</h2>
          <ul className="mt-2 space-y-2 text-sm">
            {inspections.map((item) => <li key={item.id}><Link className="text-teal" to="/inspections">{item.number}</Link></li>)}
            {documents.map((item) => <li key={item.id}><Link className="text-teal" to="/documents">{item.name}</Link></li>)}
          </ul>
        </Card>
      </div>
    </div>
  )
}
