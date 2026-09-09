import { useMemo, useState } from 'react'
import { useApp } from '../context/AppContext'
import { can } from '../lib/permissions'
import { collectErrors, isNonEmpty, isTimeRange, newId } from '../lib/validation'
import { lookupsFor, vehicleLabel } from '../lib/autoshop'
import type { Appointment, AppointmentStatus } from '../types/domain'
import { Alert, Button, Card, ConfirmDialog, Field, Input, Modal, PageHeader, Select, StatusBadge, Table, Tabs, Textarea } from '../components/ui'

const STATUSES: AppointmentStatus[] = ['requested', 'confirmed', 'checked_in', 'in_service', 'completed', 'cancelled', 'no_show']

function blankAppointment(): Appointment {
  const now = new Date().toISOString()
  return {
    id: newId(),
    title: '',
    clientId: null,
    vehicleId: null,
    employeeId: null,
    serviceAdvisorId: null,
    appointmentTypeId: null,
    customerConcern: '',
    date: now.slice(0, 10),
    startTime: '09:00',
    endTime: '10:00',
    location: 'Bay 1',
    notes: '',
    status: 'confirmed',
    createdBy: '',
    updatedBy: '',
    createdAt: now,
    updatedAt: now,
  }
}

export function AppointmentsPage() {
  const { store, refresh, profile } = useApp()
  const [view, setView] = useState('list')
  const [form, setForm] = useState<Appointment | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [cancel, setCancel] = useState<Appointment | null>(null)
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7))
  const [assigned, setAssigned] = useState('')
  const types = lookupsFor(store.state.lookups, 'appointment_type')
  const items = useMemo(() => store.listAppointments({ pageSize: 80, assignedEmployeeId: assigned || undefined }).items, [store, assigned])

  function save() {
    if (!form) return
    const errors = collectErrors([isNonEmpty(form.title, 'Title'), isNonEmpty(form.date, 'Date'), isTimeRange(form.startTime, form.endTime)])
    if (errors.length) {
      setError(errors[0])
      return
    }
    try {
      store.saveAppointment(form)
      refresh()
      setForm(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save appointment.')
    }
  }

  const [year, monthNum] = month.split('-').map(Number)
  const daysInMonth = new Date(year, monthNum, 0).getDate()
  const cells = Array.from({ length: daysInMonth }, (_, index) => {
    const day = `${month}-${String(index + 1).padStart(2, '0')}`
    return { day, items: items.filter((item) => item.date === day) }
  })

  return (
    <div>
      <PageHeader
        title="Appointments"
        description="Service book for drop-offs, diagnostics, and scheduled repairs."
        actions={can(store.state, profile, 'appointments', 'create') ? <Button type="button" className="min-h-11" onClick={() => { setError(null); setForm(blankAppointment()) }}>New appointment</Button> : null}
      />
      <Tabs value={view} onChange={setView} tabs={[{ id: 'list', label: 'List' }, { id: 'calendar', label: 'Calendar' }]} />
      <div className="mt-4 max-w-xs">
        <Select value={assigned} onChange={(event) => setAssigned(event.target.value)}>
          <option value="">All technicians</option>
          {store.state.profiles.map((row) => <option key={row.id} value={row.id}>{row.fullName}</option>)}
        </Select>
      </div>
      {view === 'list' ? (
        <div className="mt-4">
          <Table headers={['When', 'Customer / vehicle', 'Type', 'Status', '']}>
            {items.map((item) => {
              const customer = store.state.clients.find((row) => row.id === item.clientId)
              const vehicle = store.state.vehicles.find((row) => row.id === item.vehicleId)
              return (
                <tr key={item.id} className="border-t border-line">
                  <td className="px-3 py-2"><button className="font-medium text-teal" type="button" onClick={() => setForm(item)}>{item.date} {item.startTime}</button></td>
                  <td className="px-3 py-2 text-sm">{customer?.displayName ?? '—'}<br />{vehicle ? vehicleLabel(vehicle) : item.title}</td>
                  <td className="px-3 py-2">{types.find((row) => row.id === item.appointmentTypeId)?.label ?? item.title}</td>
                  <td className="px-3 py-2"><StatusBadge status={item.status} /></td>
                  <td className="px-3 py-2 text-right">
                    {['requested', 'confirmed'].includes(item.status) ? <Button variant="secondary" type="button" onClick={() => { store.checkInAppointment(item.id); refresh() }}>Check in</Button> : null}
                    {!['cancelled', 'completed', 'no_show'].includes(item.status) ? <Button variant="ghost" type="button" onClick={() => setCancel(item)}>Cancel</Button> : null}
                  </td>
                </tr>
              )
            })}
          </Table>
        </div>
      ) : (
        <Card className="mt-4">
          <Field label="Month"><Input type="month" value={month} onChange={(event) => setMonth(event.target.value)} /></Field>
          <div className="mt-4 grid gap-2 sm:grid-cols-4 lg:grid-cols-7">
            {cells.map((cell) => (
              <div key={cell.day} className="min-h-24 rounded-md border border-line bg-paper p-2 text-xs">
                <p className="font-semibold">{cell.day.slice(-2)}</p>
                {cell.items.map((item) => (
                  <button key={item.id} className="mt-1 block w-full truncate text-left text-teal" type="button" onClick={() => setForm(item)}>
                    {item.startTime} {item.title}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </Card>
      )}
      {form ? (
        <Modal title="Appointment" onClose={() => setForm(null)} footer={<Button type="button" onClick={save}>Save</Button>}>
          {error ? <Alert tone="error">{error}</Alert> : null}
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Field label="Type">
              <Select value={form.appointmentTypeId ?? ''} onChange={(event) => {
                const type = types.find((row) => row.id === event.target.value)
                setForm({ ...form, appointmentTypeId: event.target.value || null, title: type?.label ?? form.title })
              }}>
                <option value="">Select type</option>
                {types.map((row) => <option key={row.id} value={row.id}>{row.label}</option>)}
              </Select>
            </Field>
            <Field label="Status">
              <Select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as AppointmentStatus })}>
                {STATUSES.map((value) => <option key={value} value={value}>{value.replace(/_/g, ' ')}</option>)}
              </Select>
            </Field>
            <Field label="Title"><Input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></Field>
            <Field label="Date"><Input type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} /></Field>
            <Field label="Start"><Input type="time" value={form.startTime} onChange={(event) => setForm({ ...form, startTime: event.target.value })} /></Field>
            <Field label="End"><Input type="time" value={form.endTime} onChange={(event) => setForm({ ...form, endTime: event.target.value })} /></Field>
            <Field label="Customer">
              <Select value={form.clientId ?? ''} onChange={(event) => setForm({ ...form, clientId: event.target.value || null, vehicleId: null })}>
                <option value="">None</option>
                {store.state.clients.filter((row) => !row.archivedAt).map((row) => <option key={row.id} value={row.id}>{row.displayName}</option>)}
              </Select>
            </Field>
            <Field label="Vehicle">
              <Select value={form.vehicleId ?? ''} onChange={(event) => {
                const vehicle = store.state.vehicles.find((row) => row.id === event.target.value)
                setForm({ ...form, vehicleId: event.target.value || null, clientId: vehicle?.customerId ?? form.clientId })
              }}>
                <option value="">None</option>
                {store.state.vehicles.filter((row) => !form.clientId || row.customerId === form.clientId).map((row) => <option key={row.id} value={row.id}>{vehicleLabel(row)}</option>)}
              </Select>
            </Field>
            <Field label="Technician">
              <Select value={form.employeeId ?? ''} onChange={(event) => setForm({ ...form, employeeId: event.target.value || null })}>
                <option value="">None</option>
                {store.state.profiles.filter((row) => row.status === 'active').map((row) => <option key={row.id} value={row.id}>{row.fullName}</option>)}
              </Select>
            </Field>
            <Field label="Service advisor">
              <Select value={form.serviceAdvisorId ?? ''} onChange={(event) => setForm({ ...form, serviceAdvisorId: event.target.value || null })}>
                <option value="">None</option>
                {store.state.profiles.filter((row) => row.status === 'active').map((row) => <option key={row.id} value={row.id}>{row.fullName}</option>)}
              </Select>
            </Field>
            <Field label="Bay / location"><Input value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} /></Field>
            <div className="sm:col-span-2"><Field label="Customer concern"><Textarea value={form.customerConcern} onChange={(event) => setForm({ ...form, customerConcern: event.target.value })} /></Field></div>
            <div className="sm:col-span-2"><Field label="Notes"><Textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></Field></div>
          </div>
        </Modal>
      ) : null}
      {cancel ? <ConfirmDialog title="Cancel appointment" body="The appointment stays in history as cancelled." confirmLabel="Cancel appointment" onClose={() => setCancel(null)} onConfirm={() => { store.cancelAppointment(cancel.id); refresh(); setCancel(null) }} /> : null}
    </div>
  )
}
