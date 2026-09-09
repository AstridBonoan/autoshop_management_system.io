import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { formatMoney } from '../lib/format'
import { can } from '../lib/permissions'
import { newId } from '../lib/validation'
import { vehicleLabel } from '../lib/autoshop'
import type { LineKind, PaymentMethod, RepairOrder, RepairOrderItem, RepairOrderStatus } from '../types/domain'
import { Alert, Button, Card, Field, Input, PageHeader, Select, StatusBadge, Textarea } from '../components/ui'

const STATUSES: RepairOrderStatus[] = ['draft', 'checked_in', 'diagnosing', 'awaiting_approval', 'approved', 'in_progress', 'waiting_for_parts', 'quality_check', 'ready_for_pickup', 'completed', 'cancelled']

export function RepairOrderDetailPage() {
  const { id } = useParams()
  const { store, refresh, profile } = useApp()
  const [error, setError] = useState<string | null>(null)
  const [line, setLine] = useState<Partial<RepairOrderItem>>({ kind: 'labor', description: '', quantity: 1, unitPrice: store.state.company.defaultLaborRate, hours: 1, unitCost: 0 })
  const [pay, setPay] = useState({ amount: '', method: 'card' as PaymentMethod, note: '' })
  const found = store.getRepairOrder(id ?? '')
  if (!found) return <p>Repair order not found.</p>
  const order = found
  const customer = store.state.clients.find((row) => row.id === order.customerId)
  const vehicle = store.state.vehicles.find((row) => row.id === order.vehicleId)
  const items = store.state.repairOrderItems.filter((row) => row.repairOrderId === order.id)
  const money = store.orderMoney(order)
  const canEdit = can(store.state, profile, 'repair_orders', 'edit')
  const canPay = can(store.state, profile, 'payments', 'create')

  function update(patch: Partial<RepairOrder>) {
    try {
      store.saveRepairOrder({ ...order, ...patch, id: order.id, customerId: order.customerId, vehicleId: order.vehicleId })
      refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update repair order.')
    }
  }

  return (
    <div>
      <PageHeader
        title={order.number}
        description={`${customer?.displayName ?? 'Customer'} · ${vehicle ? vehicleLabel(vehicle) : 'Vehicle'} · ${order.mileage.toLocaleString()} mi`}
        actions={<StatusBadge status={order.status} />}
      />
      {error ? <Alert tone="error">{error}</Alert> : null}
      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-4">
          <Card>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Status">
                <Select value={order.status} disabled={!canEdit} onChange={(event) => update({ status: event.target.value as RepairOrderStatus })}>
                  {STATUSES.map((value) => <option key={value} value={value}>{value.replace(/_/g, ' ')}</option>)}
                </Select>
              </Field>
              <Field label="Technician">
                <Select value={order.technicianId ?? ''} disabled={!canEdit} onChange={(event) => update({ technicianId: event.target.value || null })}>
                  <option value="">Unassigned</option>
                  {store.technicians().map((row) => <option key={row.id} value={row.id}>{row.fullName}</option>)}
                </Select>
              </Field>
            </div>
            <div className="mt-3 grid gap-3">
              <Field label="Customer concern"><Textarea value={order.customerConcern} disabled={!canEdit} onChange={(event) => update({ customerConcern: event.target.value })} /></Field>
              <Field label="Diagnosis"><Textarea value={order.diagnosis} disabled={!canEdit} onChange={(event) => update({ diagnosis: event.target.value })} /></Field>
              <Field label="Recommended work"><Textarea value={order.recommendedWork} disabled={!canEdit} onChange={(event) => update({ recommendedWork: event.target.value })} /></Field>
              <Field label="Approved work"><Textarea value={order.approvedWork} disabled={!canEdit} onChange={(event) => update({ approvedWork: event.target.value })} /></Field>
              <Field label="Declined work"><Textarea value={order.declinedWork} disabled={!canEdit} onChange={(event) => update({ declinedWork: event.target.value })} /></Field>
            </div>
          </Card>
          <Card>
            <h2 className="font-display text-xl">Labor, parts, and fees</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {items.map((item) => (
                <li key={item.id} className="flex justify-between gap-3 border-b border-line py-2">
                  <span>{item.kind}: {item.description}{item.declined ? ' (declined)' : ''}</span>
                  <span>{formatMoney((item.kind === 'labor' || item.kind === 'service' ? item.hours || item.quantity : item.quantity) * item.unitPrice)}</span>
                </li>
              ))}
            </ul>
            {canEdit ? (
              <form
                className="mt-4 grid gap-3 sm:grid-cols-2"
                onSubmit={(event) => {
                  event.preventDefault()
                  if (!line.description) return
                  store.saveRepairOrderItem({
                    id: newId(),
                    repairOrderId: order.id,
                    kind: (line.kind ?? 'labor') as LineKind,
                    description: line.description,
                    serviceId: line.serviceId ?? null,
                    partId: line.partId ?? null,
                    quantity: Number(line.quantity) || 1,
                    unitCost: Number(line.unitCost) || 0,
                    unitPrice: Number(line.unitPrice) || 0,
                    hours: Number(line.hours) || 0,
                    approved: true,
                    declined: false,
                    technicianId: order.technicianId,
                  })
                  setLine({ kind: 'labor', description: '', quantity: 1, unitPrice: store.state.company.defaultLaborRate, hours: 1, unitCost: 0 })
                  refresh()
                }}
              >
                <Field label="Type">
                  <Select value={line.kind} onChange={(event) => setLine({ ...line, kind: event.target.value as LineKind })}>
                    <option value="labor">Labor</option>
                    <option value="service">Service</option>
                    <option value="part">Part</option>
                    <option value="fee">Fee</option>
                  </Select>
                </Field>
                <Field label="Description"><Input value={line.description ?? ''} onChange={(event) => setLine({ ...line, description: event.target.value })} /></Field>
                {line.kind === 'part' ? (
                  <Field label="Part">
                    <Select value={line.partId ?? ''} onChange={(event) => {
                      const part = store.state.parts.find((row) => row.id === event.target.value)
                      setLine({ ...line, partId: event.target.value || null, description: part?.name ?? line.description, unitCost: part?.cost, unitPrice: part?.price })
                    }}>
                      <option value="">Select part</option>
                      {store.state.parts.filter((row) => row.active).map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
                    </Select>
                  </Field>
                ) : (
                  <Field label="Hours"><Input type="number" step="0.1" value={line.hours ?? 0} onChange={(event) => setLine({ ...line, hours: Number(event.target.value) })} /></Field>
                )}
                <Field label="Qty / price">
                  <div className="grid grid-cols-2 gap-2">
                    <Input type="number" value={line.quantity ?? 1} onChange={(event) => setLine({ ...line, quantity: Number(event.target.value) })} />
                    <Input type="number" value={line.unitPrice ?? 0} onChange={(event) => setLine({ ...line, unitPrice: Number(event.target.value) })} />
                  </div>
                </Field>
                <div className="sm:col-span-2"><Button type="submit">Add line</Button></div>
              </form>
            ) : null}
          </Card>
        </div>
        <div className="space-y-4">
          <Card>
            <h2 className="font-semibold">Totals</h2>
            <dl className="mt-3 space-y-1 text-sm">
              <div className="flex justify-between"><dt>Labor</dt><dd>{formatMoney(money.labor)}</dd></div>
              <div className="flex justify-between"><dt>Parts</dt><dd>{formatMoney(money.parts)}</dd></div>
              <div className="flex justify-between"><dt>Fees</dt><dd>{formatMoney(money.fees)}</dd></div>
              <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatMoney(money.subtotal)}</dd></div>
              <div className="flex justify-between"><dt>Discount</dt><dd>{formatMoney(money.discount)}</dd></div>
              <div className="flex justify-between"><dt>Tax</dt><dd>{formatMoney(money.tax)}</dd></div>
              <div className="flex justify-between font-semibold"><dt>Total</dt><dd>{formatMoney(money.total)}</dd></div>
              <div className="flex justify-between"><dt>Paid</dt><dd>{formatMoney(money.amountPaid)}</dd></div>
              <div className="flex justify-between"><dt>Balance</dt><dd>{formatMoney(money.balance)}</dd></div>
              <div className="pt-2"><StatusBadge status={money.status} /></div>
            </dl>
          </Card>
          <Card>
            <p>Customer: {customer ? <Link className="text-teal" to={`/customers/${customer.id}`}>{customer.displayName}</Link> : '—'}</p>
            <p className="mt-2">Vehicle: {vehicle ? <Link className="text-teal" to={`/vehicles/${vehicle.id}`}>{vehicleLabel(vehicle)}</Link> : '—'}</p>
          </Card>
          {canPay ? (
            <Card>
              <h2 className="font-semibold">Record payment</h2>
              <form
                className="mt-3 space-y-3"
                onSubmit={(event) => {
                  event.preventDefault()
                  store.savePayment({ id: newId(), repairOrderId: order.id, method: pay.method, amount: Number(pay.amount), note: pay.note, status: 'recorded' })
                  setPay({ amount: '', method: 'card', note: '' })
                  refresh()
                }}
              >
                <Field label="Amount"><Input type="number" step="0.01" value={pay.amount} onChange={(event) => setPay({ ...pay, amount: event.target.value })} /></Field>
                <Field label="Method">
                  <Select value={pay.method} onChange={(event) => setPay({ ...pay, method: event.target.value as PaymentMethod })}>
                    <option value="card">Card</option>
                    <option value="cash">Cash</option>
                    <option value="check">Check</option>
                    <option value="other">Other</option>
                  </Select>
                </Field>
                <Button type="submit" className="min-h-11">Record payment</Button>
              </form>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  )
}
