import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { formatDate, formatDateTime } from '../lib/format'
import { can } from '../lib/permissions'
import { newId } from '../lib/validation'
import { lookupLabel, vehicleLabel } from '../lib/autoshop'
import type { CommunicationType } from '../types/domain'
import { Button, Card, Field, Input, PageHeader, Select, StatusBadge, Tabs, Textarea } from '../components/ui'

export function ClientDetailPage() {
  const { id } = useParams()
  const { store, refresh, profile } = useApp()
  const [tab, setTab] = useState('vehicles')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [type, setType] = useState<CommunicationType>('note')
  const client = store.getClient(id ?? '')
  if (!client) return <p>Customer not found.</p>
  const owner = store.state.profiles.find((row) => row.id === client.assignedEmployeeId)
  const vehicles = store.state.vehicles.filter((row) => row.customerId === client.id)
  const tasks = store.state.tasks.filter((row) => row.clientId === client.id && !row.archivedAt)
  const appointments = store.state.appointments.filter((row) => row.clientId === client.id)
  const orders = store.state.repairOrders.filter((row) => row.customerId === client.id)
  const documents = store.state.documents.filter((row) => row.clientId === client.id && !row.archivedAt)
  const activity = store.state.activities.filter((row) => row.relatedId === client.id || vehicles.some((vehicle) => vehicle.id === row.relatedId))
  const comms = store.state.communications.filter((row) => row.customerId === client.id)

  return (
    <div>
      <PageHeader
        title={client.displayName}
        description={`${client.phone || 'No phone'} · ${client.email || 'No email'}`}
        actions={<StatusBadge status={client.status} />}
      />
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'vehicles', label: 'Vehicles' },
          { id: 'profile', label: 'Profile' },
          { id: 'appointments', label: 'Appointments' },
          { id: 'repairs', label: 'Repair orders' },
          { id: 'documents', label: 'Documents' },
          { id: 'comms', label: 'Communication' },
          { id: 'history', label: 'Activity' },
        ]}
      />
      <div className="mt-4">
        {tab === 'vehicles' ? (
          <Card>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold">Vehicles owned</h3>
              {can(store.state, profile, 'vehicles', 'create') ? <Link to="/vehicles"><Button type="button">Add vehicle</Button></Link> : null}
            </div>
            <ul className="space-y-3">
              {vehicles.map((vehicle) => (
                <li key={vehicle.id} className="rounded-lg border border-line px-3 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Link className="font-medium text-teal" to={`/vehicles/${vehicle.id}`}>{vehicleLabel(vehicle)}</Link>
                    <StatusBadge status={vehicle.status} />
                  </div>
                  <p className="mt-1 text-sm text-ink-soft">{vehicle.vin} · {vehicle.licensePlate} · {vehicle.mileage.toLocaleString()} mi</p>
                </li>
              ))}
            </ul>
          </Card>
        ) : null}
        {tab === 'profile' ? (
          <Card>
            <dl className="grid gap-3 sm:grid-cols-2">
              <div><dt className="text-xs uppercase text-ink-soft">Advisor</dt><dd>{owner?.fullName ?? '—'}</dd></div>
              <div><dt className="text-xs uppercase text-ink-soft">Address</dt><dd>{[client.addressLine1, client.city, client.region, client.postalCode].filter(Boolean).join(', ') || '—'}</dd></div>
              <div className="sm:col-span-2"><dt className="text-xs uppercase text-ink-soft">Notes</dt><dd className="whitespace-pre-wrap">{client.notes || 'No notes.'}</dd></div>
            </dl>
          </Card>
        ) : null}
        {tab === 'appointments' ? (
          <Card>
            <ul className="space-y-2 text-sm">
              {appointments.map((item) => (
                <li key={item.id}>{formatDate(item.date)} {item.startTime} · {item.title} · {lookupLabel(store.state.lookups, item.appointmentTypeId)} · <StatusBadge status={item.status} /></li>
              ))}
            </ul>
          </Card>
        ) : null}
        {tab === 'repairs' ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <h3 className="font-semibold">Repair orders</h3>
              <ul className="mt-2 space-y-2 text-sm">
                {orders.map((item) => (
                  <li key={item.id}><Link className="text-teal" to={`/repair-orders/${item.id}`}>{item.number}</Link> · <StatusBadge status={item.status} /></li>
                ))}
              </ul>
            </Card>
            <Card>
              <h3 className="font-semibold">Tasks</h3>
              <ul className="mt-2 space-y-2 text-sm">{tasks.map((task) => <li key={task.id}><Link className="text-teal" to="/tasks">{task.title}</Link></li>)}</ul>
            </Card>
          </div>
        ) : null}
        {tab === 'documents' ? (
          <Card>
            <ul className="space-y-2">{documents.map((item) => <li key={item.id}><Link className="text-teal" to="/documents">{item.name}</Link></li>)}</ul>
          </Card>
        ) : null}
        {tab === 'comms' ? (
          <Card>
            <ul className="space-y-2 text-sm">
              {comms.map((item) => (
                <li key={item.id} className="rounded-md bg-paper px-3 py-2">
                  <p className="font-semibold">{item.subject} · {item.type.replace('_', ' ')}</p>
                  <p className="text-ink-soft">{item.body}</p>
                  <p className="mt-1 text-xs text-ink-soft">{formatDateTime(item.createdAt)}</p>
                </li>
              ))}
            </ul>
            {can(store.state, profile, 'clients', 'edit') ? (
              <form
                className="mt-4 grid gap-3"
                onSubmit={(event) => {
                  event.preventDefault()
                  if (!subject.trim() || !body.trim()) return
                  store.saveCommunication({ id: newId(), customerId: client.id, vehicleId: vehicles[0]?.id ?? null, repairOrderId: null, type, subject, body })
                  setSubject('')
                  setBody('')
                  refresh()
                }}
              >
                <Field label="Type">
                  <Select value={type} onChange={(event) => setType(event.target.value as CommunicationType)}>
                    <option value="note">Note</option>
                    <option value="call">Call</option>
                    <option value="message">Message</option>
                    <option value="approval_request">Approval request</option>
                    <option value="appointment">Appointment</option>
                    <option value="repair_update">Repair update</option>
                    <option value="pickup">Pickup</option>
                  </Select>
                </Field>
                <Field label="Subject"><Input value={subject} onChange={(event) => setSubject(event.target.value)} /></Field>
                <Field label="Details"><Textarea value={body} onChange={(event) => setBody(event.target.value)} /></Field>
                <Button type="submit">Log communication</Button>
              </form>
            ) : null}
          </Card>
        ) : null}
        {tab === 'history' ? (
          <Card>
            <ul className="space-y-2 text-sm">
              {activity.map((item) => (
                <li key={item.id}>{item.description} · {formatDateTime(item.createdAt)}</li>
              ))}
            </ul>
          </Card>
        ) : null}
      </div>
    </div>
  )
}
