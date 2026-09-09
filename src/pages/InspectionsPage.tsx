import { useMemo, useState } from 'react'
import { useApp } from '../context/AppContext'
import { can } from '../lib/permissions'
import { collectErrors, isNonEmpty, newId } from '../lib/validation'
import { inspectionTone, lookupsFor, vehicleLabel } from '../lib/autoshop'
import type { Inspection, InspectionItem, InspectionResult } from '../types/domain'
import { Alert, Badge, Button, Card, Field, Input, Modal, PageHeader, Select, StatusBadge, Table, Textarea } from '../components/ui'

function blankInspection(): Inspection {
  const now = new Date().toISOString()
  return {
    id: newId(),
    number: '',
    customerId: '',
    vehicleId: '',
    repairOrderId: null,
    technicianId: null,
    mileage: 0,
    notes: '',
    recommendations: '',
    status: 'in_progress',
    createdBy: '',
    updatedBy: '',
    createdAt: now,
    updatedAt: now,
  }
}

export function InspectionsPage() {
  const { store, refresh, profile } = useApp()
  const [form, setForm] = useState<Inspection | null>(null)
  const [error, setError] = useState<string | null>(null)
  const result = useMemo(() => store.listInspections({ pageSize: 30 }), [store])
  const categories = lookupsFor(store.state.lookups, 'inspection_category')

  function save() {
    if (!form) return
    const errors = collectErrors([isNonEmpty(form.customerId, 'Customer'), isNonEmpty(form.vehicleId, 'Vehicle')])
    if (errors.length) {
      setError(errors[0])
      return
    }
    try {
      store.saveInspection(form)
      refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save inspection.')
    }
  }

  return (
    <div>
      <PageHeader
        title="Inspections"
        description="Multi-point vehicle inspections tied to the vehicle and repair order."
        actions={can(store.state, profile, 'inspections', 'create') ? <Button type="button" className="min-h-11" onClick={() => { setError(null); setForm({ ...blankInspection(), technicianId: store.currentProfile()?.id ?? null }) }}>New inspection</Button> : null}
      />
      <Table headers={['Inspection', 'Vehicle', 'Technician', 'Status']}>
        {result.items.map((item) => {
          const vehicle = store.state.vehicles.find((row) => row.id === item.vehicleId)
          const tech = store.state.profiles.find((row) => row.id === item.technicianId)
          return (
            <tr key={item.id} className="border-t border-line">
              <td className="px-3 py-2"><button className="font-medium text-teal" type="button" onClick={() => setForm(item)}>{item.number}</button></td>
              <td className="px-3 py-2">{vehicle ? vehicleLabel(vehicle) : '—'}</td>
              <td className="px-3 py-2">{tech?.fullName ?? '—'}</td>
              <td className="px-3 py-2"><StatusBadge status={item.status} /></td>
            </tr>
          )
        })}
      </Table>
      {form ? (
        <Modal title={form.number || 'Inspection'} onClose={() => { setForm(null); refresh() }} footer={<Button type="button" onClick={() => { save(); setForm(null) }}>Save</Button>}>
          {error ? <Alert tone="error">{error}</Alert> : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Customer">
              <Select value={form.customerId} onChange={(event) => setForm({ ...form, customerId: event.target.value })}>
                <option value="">Select</option>
                {store.state.clients.filter((row) => !row.archivedAt).map((row) => <option key={row.id} value={row.id}>{row.displayName}</option>)}
              </Select>
            </Field>
            <Field label="Vehicle">
              <Select value={form.vehicleId} onChange={(event) => {
                const vehicle = store.state.vehicles.find((row) => row.id === event.target.value)
                setForm({ ...form, vehicleId: event.target.value, customerId: vehicle?.customerId ?? form.customerId, mileage: vehicle?.mileage ?? form.mileage })
              }}>
                <option value="">Select</option>
                {store.state.vehicles.map((row) => <option key={row.id} value={row.id}>{vehicleLabel(row)}</option>)}
              </Select>
            </Field>
            <Field label="Repair order">
              <Select value={form.repairOrderId ?? ''} onChange={(event) => setForm({ ...form, repairOrderId: event.target.value || null })}>
                <option value="">None</option>
                {store.state.repairOrders.filter((row) => row.vehicleId === form.vehicleId || !form.vehicleId).map((row) => <option key={row.id} value={row.id}>{row.number}</option>)}
              </Select>
            </Field>
            <Field label="Status">
              <Select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as Inspection['status'] })}>
                <option value="in_progress">In progress</option>
                <option value="completed">Completed</option>
              </Select>
            </Field>
            <div className="sm:col-span-2"><Field label="Recommendations"><Textarea value={form.recommendations} onChange={(event) => setForm({ ...form, recommendations: event.target.value })} /></Field></div>
          </div>
          {store.state.inspections.some((row) => row.id === form.id) ? (
            <Card className="mt-4">
              <h3 className="font-semibold">Categories</h3>
              <ul className="mt-3 space-y-3">
                {categories.map((category) => {
                  const item = store.state.inspectionItems.find((row) => row.inspectionId === form.id && row.categoryId === category.id)
                  return (
                    <li key={category.id} className="grid gap-2 rounded-md bg-paper p-3 sm:grid-cols-[140px_1fr]">
                      <div>
                        <p className="font-medium">{category.label}</p>
                        {item ? <Badge tone={inspectionTone(item.result)}>{item.result}</Badge> : null}
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <Select
                          value={item?.result ?? ''}
                          onChange={(event) => {
                            const next: InspectionItem = {
                              id: item?.id ?? newId(),
                              inspectionId: form.id,
                              categoryId: category.id,
                              result: event.target.value as InspectionResult,
                              measurement: item?.measurement ?? '',
                              notes: item?.notes ?? '',
                              recommendation: item?.recommendation ?? '',
                            }
                            store.saveInspectionItem(next)
                            refresh()
                          }}
                        >
                          <option value="">Result</option>
                          <option value="good">Good</option>
                          <option value="attention">Attention</option>
                          <option value="recommended">Recommended</option>
                          <option value="urgent">Urgent</option>
                          <option value="na">Not applicable</option>
                        </Select>
                        <Input
                          placeholder="Measurement / notes"
                          defaultValue={item?.notes ?? ''}
                          onBlur={(event) => {
                            if (!item) return
                            store.saveInspectionItem({ ...item, notes: event.target.value })
                            refresh()
                          }}
                        />
                      </div>
                    </li>
                  )
                })}
              </ul>
            </Card>
          ) : <p className="mt-3 text-sm text-ink-soft">Save the inspection, then record category results.</p>}
        </Modal>
      ) : null}
    </div>
  )
}
