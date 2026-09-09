import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { can } from '../lib/permissions'
import { collectErrors, isNonEmpty, newId } from '../lib/validation'
import { vehicleLabel } from '../lib/autoshop'
import type { Vehicle, VehicleStatus } from '../types/domain'
import { Alert, Button, EmptyState, Field, Input, Modal, PageHeader, Pagination, Select, StatusBadge, Table, Textarea } from '../components/ui'

function blankVehicle(customerId = ''): Vehicle {
  const now = new Date().toISOString()
  return {
    id: newId(),
    customerId,
    vin: '',
    year: new Date().getFullYear(),
    make: '',
    model: '',
    trim: '',
    mileage: 0,
    licensePlate: '',
    color: '',
    notes: '',
    status: 'active',
    createdBy: '',
    updatedBy: '',
    createdAt: now,
    updatedAt: now,
  }
}

export function VehiclesPage() {
  const { store, refresh, profile } = useApp()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [form, setForm] = useState<Vehicle | null>(null)
  const [error, setError] = useState<string | null>(null)
  const result = useMemo(() => store.listVehicles({ search, status: status || undefined, page, pageSize: 8 }), [store, search, status, page])

  function save() {
    if (!form) return
    const errors = collectErrors([isNonEmpty(form.customerId, 'Customer'), isNonEmpty(form.make, 'Make'), isNonEmpty(form.model, 'Model')])
    if (errors.length) {
      setError(errors[0])
      return
    }
    try {
      store.saveVehicle(form)
      refresh()
      setForm(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save vehicle.')
    }
  }

  return (
    <div>
      <PageHeader
        title="Vehicles"
        description="The shop record that appointments, inspections, and repair orders hang from."
        actions={can(store.state, profile, 'vehicles', 'create') ? <Button type="button" className="min-h-11" onClick={() => { setError(null); setForm(blankVehicle()) }}>Add vehicle</Button> : null}
      />
      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <Input placeholder="Search VIN, plate, make, or customer" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1) }} />
        <Select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1) }}>
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="in_shop">In shop</option>
          <option value="awaiting_approval">Awaiting approval</option>
          <option value="ready_for_pickup">Ready for pickup</option>
          <option value="inactive">Inactive</option>
        </Select>
      </div>
      {result.total === 0 ? <EmptyState title="No vehicles found" body="Add a vehicle to a customer to start the service workflow." /> : (
        <Table headers={['Vehicle', 'VIN / plate', 'Customer', 'Mileage', 'Status']}>
          {result.items.map((vehicle) => {
            const customer = store.state.clients.find((row) => row.id === vehicle.customerId)
            return (
              <tr key={vehicle.id} className="border-t border-line">
                <td className="px-3 py-2"><Link className="font-medium text-teal" to={`/vehicles/${vehicle.id}`}>{vehicleLabel(vehicle)}</Link></td>
                <td className="px-3 py-2 text-xs">{vehicle.vin || '—'}<br />{vehicle.licensePlate || '—'}</td>
                <td className="px-3 py-2">{customer ? <Link className="text-teal" to={`/customers/${customer.id}`}>{customer.displayName}</Link> : '—'}</td>
                <td className="px-3 py-2">{vehicle.mileage.toLocaleString()}</td>
                <td className="px-3 py-2"><StatusBadge status={vehicle.status} /></td>
              </tr>
            )
          })}
        </Table>
      )}
      <div className="mt-3"><Pagination page={result.page} pageSize={result.pageSize} total={result.total} onPage={setPage} /></div>
      {form ? (
        <Modal title="Vehicle" onClose={() => setForm(null)} footer={<Button type="button" onClick={save}>Save</Button>}>
          {error ? <Alert tone="error">{error}</Alert> : null}
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Field label="Customer">
              <Select value={form.customerId} onChange={(event) => setForm({ ...form, customerId: event.target.value })}>
                <option value="">Select customer</option>
                {store.state.clients.filter((row) => !row.archivedAt).map((row) => <option key={row.id} value={row.id}>{row.displayName}</option>)}
              </Select>
            </Field>
            <Field label="Status">
              <Select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as VehicleStatus })}>
                <option value="active">Active</option>
                <option value="in_shop">In shop</option>
                <option value="awaiting_approval">Awaiting approval</option>
                <option value="ready_for_pickup">Ready for pickup</option>
                <option value="inactive">Inactive</option>
              </Select>
            </Field>
            <Field label="Year"><Input type="number" value={form.year} onChange={(event) => setForm({ ...form, year: Number(event.target.value) })} /></Field>
            <Field label="Make"><Input value={form.make} onChange={(event) => setForm({ ...form, make: event.target.value })} /></Field>
            <Field label="Model"><Input value={form.model} onChange={(event) => setForm({ ...form, model: event.target.value })} /></Field>
            <Field label="Trim"><Input value={form.trim} onChange={(event) => setForm({ ...form, trim: event.target.value })} /></Field>
            <Field label="VIN"><Input value={form.vin} onChange={(event) => setForm({ ...form, vin: event.target.value })} /></Field>
            <Field label="License plate"><Input value={form.licensePlate} onChange={(event) => setForm({ ...form, licensePlate: event.target.value })} /></Field>
            <Field label="Mileage"><Input type="number" value={form.mileage} onChange={(event) => setForm({ ...form, mileage: Number(event.target.value) })} /></Field>
            <Field label="Color"><Input value={form.color} onChange={(event) => setForm({ ...form, color: event.target.value })} /></Field>
            <div className="sm:col-span-2"><Field label="Notes"><Textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></Field></div>
          </div>
        </Modal>
      ) : null}
    </div>
  )
}
