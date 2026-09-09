import { useMemo, useState } from 'react'
import { useApp } from '../context/AppContext'
import { formatMoney } from '../lib/format'
import { can } from '../lib/permissions'
import { newId } from '../lib/validation'
import { lookupsFor } from '../lib/autoshop'
import type { Part } from '../types/domain'
import { Button, Field, Input, Modal, PageHeader, Pagination, Select, StatusBadge, Table, Textarea } from '../components/ui'

function blankPart(): Part {
  return {
    id: newId(),
    name: '',
    partNumber: '',
    description: '',
    supplierId: null,
    categoryId: null,
    kind: 'part',
    cost: 0,
    price: 0,
    quantity: 0,
    minQuantity: 1,
    unit: 'each',
    location: '',
    compatibility: '',
    active: true,
  }
}

export function PartsPage() {
  const { store, refresh, profile } = useApp()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [form, setForm] = useState<Part | null>(null)
  const result = useMemo(() => store.listParts({ search, page, pageSize: 8 }), [store, search, page])
  const categories = lookupsFor(store.state.lookups, 'parts_category')

  return (
    <div>
      <PageHeader
        title="Parts"
        description="Catalog items used on estimates and repair orders."
        actions={can(store.state, profile, 'parts', 'create') ? <Button type="button" className="min-h-11" onClick={() => setForm(blankPart())}>Add part</Button> : null}
      />
      <div className="mb-4 max-w-sm"><Input placeholder="Search name, number, or compatibility" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1) }} /></div>
      <Table headers={['Part', 'Number', 'Qty', 'Price', 'Status']}>
        {result.items.map((part) => (
          <tr key={part.id} className="border-t border-line">
            <td className="px-3 py-2"><button className="font-medium text-teal" type="button" onClick={() => setForm(part)}>{part.name}</button></td>
            <td className="px-3 py-2">{part.partNumber}</td>
            <td className="px-3 py-2">{part.quantity} {part.unit}</td>
            <td className="px-3 py-2">{formatMoney(part.price)}</td>
            <td className="px-3 py-2"><StatusBadge status={part.active ? (part.quantity <= part.minQuantity ? 'attention' : 'active') : 'inactive'} /></td>
          </tr>
        ))}
      </Table>
      <div className="mt-3"><Pagination page={result.page} pageSize={result.pageSize} total={result.total} onPage={setPage} /></div>
      {form ? (
        <Modal title="Part" onClose={() => setForm(null)} footer={<Button type="button" onClick={() => { store.savePart(form); refresh(); setForm(null) }}>Save</Button>}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Name"><Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field>
            <Field label="Part number"><Input value={form.partNumber} onChange={(event) => setForm({ ...form, partNumber: event.target.value })} /></Field>
            <Field label="Kind">
              <Select value={form.kind} onChange={(event) => setForm({ ...form, kind: event.target.value as Part['kind'] })}>
                <option value="part">Part</option>
                <option value="supply">Shop supply</option>
              </Select>
            </Field>
            <Field label="Category">
              <Select value={form.categoryId ?? ''} onChange={(event) => setForm({ ...form, categoryId: event.target.value || null })}>
                <option value="">None</option>
                {categories.map((row) => <option key={row.id} value={row.id}>{row.label}</option>)}
              </Select>
            </Field>
            <Field label="Supplier">
              <Select value={form.supplierId ?? ''} onChange={(event) => setForm({ ...form, supplierId: event.target.value || null })}>
                <option value="">None</option>
                {store.state.suppliers.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
              </Select>
            </Field>
            <Field label="Location"><Input value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} /></Field>
            <Field label="Cost"><Input type="number" value={form.cost} onChange={(event) => setForm({ ...form, cost: Number(event.target.value) })} /></Field>
            <Field label="Selling price"><Input type="number" value={form.price} onChange={(event) => setForm({ ...form, price: Number(event.target.value) })} /></Field>
            <Field label="Quantity"><Input type="number" value={form.quantity} onChange={(event) => setForm({ ...form, quantity: Number(event.target.value) })} /></Field>
            <Field label="Minimum"><Input type="number" value={form.minQuantity} onChange={(event) => setForm({ ...form, minQuantity: Number(event.target.value) })} /></Field>
            <div className="sm:col-span-2"><Field label="Compatibility"><Input value={form.compatibility} onChange={(event) => setForm({ ...form, compatibility: event.target.value })} /></Field></div>
            <div className="sm:col-span-2"><Field label="Description"><Textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></Field></div>
          </div>
        </Modal>
      ) : null}
    </div>
  )
}
