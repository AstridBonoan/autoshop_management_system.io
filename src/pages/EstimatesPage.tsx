import { useMemo, useState } from 'react'
import { useApp } from '../context/AppContext'
import { formatMoney } from '../lib/format'
import { can } from '../lib/permissions'
import { collectErrors, isNonEmpty, newId } from '../lib/validation'
import { lineTotals, vehicleLabel } from '../lib/autoshop'
import type { Estimate, EstimateItem, EstimateStatus, LineKind } from '../types/domain'
import { Alert, Button, Card, Field, Input, Modal, PageHeader, Select, StatusBadge, Table, Textarea } from '../components/ui'

const STATUSES: EstimateStatus[] = ['draft', 'sent', 'pending_approval', 'approved', 'declined', 'expired']

function blankEstimate(): Estimate {
  const now = new Date().toISOString()
  return {
    id: newId(),
    number: '',
    customerId: '',
    vehicleId: '',
    repairOrderId: null,
    notes: '',
    status: 'draft',
    discount: 0,
    taxRate: 8.5,
    expiresAt: null,
    createdBy: '',
    updatedBy: '',
    createdAt: now,
    updatedAt: now,
  }
}

export function EstimatesPage() {
  const { store, refresh, profile } = useApp()
  const [search, setSearch] = useState('')
  const [form, setForm] = useState<Estimate | null>(null)
  const [line, setLine] = useState<Partial<EstimateItem>>({ kind: 'labor', description: '', quantity: 1, unitPrice: 145, hours: 1, unitCost: 0 })
  const [error, setError] = useState<string | null>(null)
  const result = useMemo(() => store.listEstimates({ search, pageSize: 20 }), [store, search])

  function save() {
    if (!form) return
    const errors = collectErrors([isNonEmpty(form.customerId, 'Customer'), isNonEmpty(form.vehicleId, 'Vehicle')])
    if (errors.length) {
      setError(errors[0])
      return
    }
    try {
      store.saveEstimate({ ...form, taxRate: form.taxRate || store.state.company.taxRate })
      refresh()
      setForm(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save estimate.')
    }
  }

  return (
    <div>
      <PageHeader
        title="Estimates"
        description="Recommended work before approval. Approved estimates can become or attach to a repair order."
        actions={can(store.state, profile, 'estimates', 'create') ? <Button type="button" className="min-h-11" onClick={() => { setError(null); setForm({ ...blankEstimate(), taxRate: store.state.company.taxRate }) }}>New estimate</Button> : null}
      />
      <div className="mb-4 max-w-sm"><Input placeholder="Search estimates" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
      <Table headers={['Estimate', 'Vehicle', 'Total', 'Status', '']}>
        {result.items.map((estimate) => {
          const vehicle = store.state.vehicles.find((row) => row.id === estimate.vehicleId)
          const items = store.state.estimateItems.filter((row) => row.estimateId === estimate.id)
          const totals = lineTotals(items, estimate.discount, estimate.taxRate)
          return (
            <tr key={estimate.id} className="border-t border-line">
              <td className="px-3 py-2"><button className="font-medium text-teal" type="button" onClick={() => setForm(estimate)}>{estimate.number}</button></td>
              <td className="px-3 py-2">{vehicle ? vehicleLabel(vehicle) : '—'}</td>
              <td className="px-3 py-2">{formatMoney(totals.total)}</td>
              <td className="px-3 py-2"><StatusBadge status={estimate.status} /></td>
              <td className="px-3 py-2 text-right">
                {estimate.status !== 'approved' && can(store.state, profile, 'repair_orders', 'create') ? (
                  <Button variant="secondary" type="button" onClick={() => { store.convertEstimateToRepairOrder(estimate.id, estimate.repairOrderId); refresh() }}>Convert to RO</Button>
                ) : null}
              </td>
            </tr>
          )
        })}
      </Table>
      {form ? (
        <Modal title={form.number || 'Estimate'} onClose={() => { setForm(null); refresh() }} footer={<Button type="button" onClick={save}>Save estimate</Button>}>
          {error ? <Alert tone="error">{error}</Alert> : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Customer">
              <Select value={form.customerId} onChange={(event) => setForm({ ...form, customerId: event.target.value, vehicleId: '' })}>
                <option value="">Select</option>
                {store.state.clients.filter((row) => !row.archivedAt).map((row) => <option key={row.id} value={row.id}>{row.displayName}</option>)}
              </Select>
            </Field>
            <Field label="Vehicle">
              <Select value={form.vehicleId} onChange={(event) => setForm({ ...form, vehicleId: event.target.value })}>
                <option value="">Select</option>
                {store.state.vehicles.filter((row) => !form.customerId || row.customerId === form.customerId).map((row) => <option key={row.id} value={row.id}>{vehicleLabel(row)}</option>)}
              </Select>
            </Field>
            <Field label="Related repair order">
              <Select value={form.repairOrderId ?? ''} onChange={(event) => setForm({ ...form, repairOrderId: event.target.value || null })}>
                <option value="">None</option>
                {store.state.repairOrders.filter((row) => row.vehicleId === form.vehicleId || !form.vehicleId).map((row) => <option key={row.id} value={row.id}>{row.number}</option>)}
              </Select>
            </Field>
            <Field label="Status">
              <Select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as EstimateStatus })}>
                {STATUSES.map((value) => <option key={value} value={value}>{value.replace(/_/g, ' ')}</option>)}
              </Select>
            </Field>
            <div className="sm:col-span-2"><Field label="Notes"><Textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></Field></div>
          </div>
          {store.state.estimates.some((row) => row.id === form.id) ? (
            <Card className="mt-4">
              <h3 className="font-semibold">Line items</h3>
              <ul className="mt-2 text-sm">
                {store.state.estimateItems.filter((row) => row.estimateId === form.id).map((item) => (
                  <li key={item.id}>{item.kind}: {item.description}</li>
                ))}
              </ul>
              <form
                className="mt-3 grid gap-2 sm:grid-cols-2"
                onSubmit={(event) => {
                  event.preventDefault()
                  if (!line.description) return
                  store.saveEstimateItem({
                    id: newId(),
                    estimateId: form.id,
                    kind: (line.kind ?? 'labor') as LineKind,
                    description: line.description,
                    serviceId: null,
                    partId: null,
                    quantity: Number(line.quantity) || 1,
                    unitCost: Number(line.unitCost) || 0,
                    unitPrice: Number(line.unitPrice) || 0,
                    hours: Number(line.hours) || 0,
                  })
                  setLine({ kind: 'labor', description: '', quantity: 1, unitPrice: 145, hours: 1, unitCost: 0 })
                  refresh()
                }}
              >
                <Field label="Description"><Input value={line.description ?? ''} onChange={(event) => setLine({ ...line, description: event.target.value })} /></Field>
                <Field label="Price"><Input type="number" value={line.unitPrice ?? 0} onChange={(event) => setLine({ ...line, unitPrice: Number(event.target.value) })} /></Field>
                <Button type="submit">Add line</Button>
              </form>
            </Card>
          ) : <p className="mt-3 text-sm text-ink-soft">Save the estimate first, then add recommended services.</p>}
        </Modal>
      ) : null}
    </div>
  )
}
