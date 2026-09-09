import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { can } from '../lib/permissions'
import { collectErrors, isNonEmpty, newId } from '../lib/validation'
import { vehicleLabel } from '../lib/autoshop'
import type { RepairOrder, RepairOrderStatus } from '../types/domain'
import { Alert, Button, EmptyState, Field, Input, Modal, PageHeader, Pagination, Select, StatusBadge, Table, Textarea } from '../components/ui'

const STATUSES: RepairOrderStatus[] = ['draft', 'checked_in', 'diagnosing', 'awaiting_approval', 'approved', 'in_progress', 'waiting_for_parts', 'quality_check', 'ready_for_pickup', 'completed', 'cancelled']

function blankOrder(): RepairOrder {
  const now = new Date().toISOString()
  return {
    id: newId(),
    number: '',
    customerId: '',
    vehicleId: '',
    mileage: 0,
    serviceAdvisorId: null,
    technicianId: null,
    openedAt: now,
    estimatedCompletion: null,
    completedAt: null,
    customerConcern: '',
    diagnosis: '',
    recommendedWork: '',
    approvedWork: '',
    declinedWork: '',
    notes: '',
    status: 'checked_in',
    discount: 0,
    taxRate: 8.5,
    createdBy: '',
    updatedBy: '',
    createdAt: now,
    updatedAt: now,
  }
}

export function RepairOrdersPage() {
  const { store, refresh, profile } = useApp()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [tech, setTech] = useState('')
  const [page, setPage] = useState(1)
  const [form, setForm] = useState<RepairOrder | null>(null)
  const [error, setError] = useState<string | null>(null)
  const result = useMemo(
    () => store.listRepairOrders({ search, status: status || undefined, technicianId: tech || undefined, page, pageSize: 8 }),
    [store, search, status, tech, page],
  )

  function save() {
    if (!form) return
    const errors = collectErrors([isNonEmpty(form.customerId, 'Customer'), isNonEmpty(form.vehicleId, 'Vehicle')])
    if (errors.length) {
      setError(errors[0])
      return
    }
    try {
      store.saveRepairOrder(form)
      refresh()
      setForm(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save repair order.')
    }
  }

  const vehiclesForCustomer = store.state.vehicles.filter((row) => !form?.customerId || row.customerId === form.customerId)

  return (
    <div>
      <PageHeader
        title="Repair orders"
        description="The primary shop ticket: concern, diagnosis, approval, labor, parts, and status."
        actions={can(store.state, profile, 'repair_orders', 'create') ? <Button type="button" className="min-h-11" onClick={() => { setError(null); setForm({ ...blankOrder(), taxRate: store.state.company.taxRate, serviceAdvisorId: store.currentProfile()?.id ?? null }) }}>New repair order</Button> : null}
      />
      <div className="mb-4 grid gap-3 lg:grid-cols-3">
        <Input placeholder="Search RO, VIN, plate, or customer" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1) }} />
        <Select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1) }}>
          <option value="">All statuses</option>
          {STATUSES.map((value) => <option key={value} value={value}>{value.replace(/_/g, ' ')}</option>)}
        </Select>
        <Select value={tech} onChange={(event) => { setTech(event.target.value); setPage(1) }}>
          <option value="">All technicians</option>
          {store.technicians().map((row) => <option key={row.id} value={row.id}>{row.fullName}</option>)}
        </Select>
      </div>
      {result.total === 0 ? <EmptyState title="No repair orders" body="Check a vehicle in to open the first ticket of the day." /> : (
        <Table headers={['RO', 'Vehicle', 'Customer', 'Technician', 'Status']}>
          {result.items.map((order) => {
            const customer = store.state.clients.find((row) => row.id === order.customerId)
            const vehicle = store.state.vehicles.find((row) => row.id === order.vehicleId)
            const technician = store.state.profiles.find((row) => row.id === order.technicianId)
            return (
              <tr key={order.id} className="border-t border-line">
                <td className="px-3 py-2"><Link className="font-medium text-teal" to={`/repair-orders/${order.id}`}>{order.number}</Link></td>
                <td className="px-3 py-2">{vehicle ? vehicleLabel(vehicle) : '—'}</td>
                <td className="px-3 py-2">{customer?.displayName ?? '—'}</td>
                <td className="px-3 py-2">{technician?.fullName ?? '—'}</td>
                <td className="px-3 py-2"><StatusBadge status={order.status} /></td>
              </tr>
            )
          })}
        </Table>
      )}
      <div className="mt-3"><Pagination page={result.page} pageSize={result.pageSize} total={result.total} onPage={setPage} /></div>
      {form ? (
        <Modal title="Repair order" onClose={() => setForm(null)} footer={<Button type="button" onClick={save}>Save</Button>}>
          {error ? <Alert tone="error">{error}</Alert> : null}
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Field label="Customer">
              <Select value={form.customerId} onChange={(event) => setForm({ ...form, customerId: event.target.value, vehicleId: '' })}>
                <option value="">Select customer</option>
                {store.state.clients.filter((row) => !row.archivedAt).map((row) => <option key={row.id} value={row.id}>{row.displayName}</option>)}
              </Select>
            </Field>
            <Field label="Vehicle">
              <Select value={form.vehicleId} onChange={(event) => {
                const vehicle = store.state.vehicles.find((row) => row.id === event.target.value)
                setForm({ ...form, vehicleId: event.target.value, mileage: vehicle?.mileage ?? form.mileage, customerId: vehicle?.customerId ?? form.customerId })
              }}>
                <option value="">Select vehicle</option>
                {vehiclesForCustomer.map((row) => <option key={row.id} value={row.id}>{vehicleLabel(row)}</option>)}
              </Select>
            </Field>
            <Field label="Mileage"><Input type="number" value={form.mileage} onChange={(event) => setForm({ ...form, mileage: Number(event.target.value) })} /></Field>
            <Field label="Status">
              <Select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as RepairOrderStatus })}>
                {STATUSES.map((value) => <option key={value} value={value}>{value.replace(/_/g, ' ')}</option>)}
              </Select>
            </Field>
            <Field label="Service advisor">
              <Select value={form.serviceAdvisorId ?? ''} onChange={(event) => setForm({ ...form, serviceAdvisorId: event.target.value || null })}>
                <option value="">Unassigned</option>
                {store.state.profiles.filter((row) => row.status === 'active').map((row) => <option key={row.id} value={row.id}>{row.fullName}</option>)}
              </Select>
            </Field>
            <Field label="Technician">
              <Select value={form.technicianId ?? ''} onChange={(event) => setForm({ ...form, technicianId: event.target.value || null })}>
                <option value="">Unassigned</option>
                {store.technicians().map((row) => <option key={row.id} value={row.id}>{row.fullName}</option>)}
              </Select>
            </Field>
            <Field label="Estimated completion"><Input type="date" value={form.estimatedCompletion ?? ''} onChange={(event) => setForm({ ...form, estimatedCompletion: event.target.value || null })} /></Field>
            <div className="sm:col-span-2"><Field label="Customer concern"><Textarea value={form.customerConcern} onChange={(event) => setForm({ ...form, customerConcern: event.target.value })} /></Field></div>
          </div>
        </Modal>
      ) : null}
    </div>
  )
}
