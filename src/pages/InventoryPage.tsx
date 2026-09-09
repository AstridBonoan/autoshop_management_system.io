import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { formatDateTime } from '../lib/format'
import { can } from '../lib/permissions'
import { Button, Card, Field, Input, PageHeader, Select, StatusBadge, Table } from '../components/ui'

export function InventoryPage() {
  const { store, refresh, profile } = useApp()
  const [partId, setPartId] = useState(store.state.parts[0]?.id ?? '')
  const [qty, setQty] = useState('1')
  const [type, setType] = useState<'receiving' | 'adjustment' | 'return' | 'waste'>('receiving')
  const [note, setNote] = useState('')
  const low = store.state.parts.filter((row) => row.active && row.quantity <= row.minQuantity)
  const canEdit = can(store.state, profile, 'inventory', 'edit')

  return (
    <div>
      <PageHeader title="Inventory" description="Stock levels, receiving, usage history, and low-stock alerts." />
      {low.length ? (
        <Card className="mb-4 border-warn/40">
          <h2 className="font-semibold">Low stock</h2>
          <ul className="mt-2 text-sm">{low.map((row) => <li key={row.id}>{row.name} · {row.quantity} {row.unit} (min {row.minQuantity})</li>)}</ul>
        </Card>
      ) : null}
      <Table headers={['Item', 'On hand', 'Min', 'Location', 'Status']}>
        {store.state.parts.map((part) => (
          <tr key={part.id} className="border-t border-line">
            <td className="px-3 py-2">{part.name}<div className="text-xs text-ink-soft">{part.partNumber}</div></td>
            <td className="px-3 py-2">{part.quantity} {part.unit}</td>
            <td className="px-3 py-2">{part.minQuantity}</td>
            <td className="px-3 py-2">{part.location || '—'}</td>
            <td className="px-3 py-2"><StatusBadge status={part.quantity <= part.minQuantity ? 'attention' : 'good'} /></td>
          </tr>
        ))}
      </Table>
      {canEdit ? (
        <Card className="mt-4">
          <h2 className="font-semibold">Adjustment / receiving</h2>
          <form
            className="mt-3 grid gap-3 sm:grid-cols-4"
            onSubmit={(event) => {
              event.preventDefault()
              const amount = type === 'receiving' || type === 'return' ? Math.abs(Number(qty)) : -Math.abs(Number(qty))
              if (type === 'receiving') store.receiveInventory(partId, Number(qty), note || 'Received')
              else store.adjustInventory(partId, type, type === 'return' ? Math.abs(Number(qty)) : amount, note || type)
              setNote('')
              refresh()
            }}
          >
            <Field label="Item">
              <Select value={partId} onChange={(event) => setPartId(event.target.value)}>
                {store.state.parts.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
              </Select>
            </Field>
            <Field label="Type">
              <Select value={type} onChange={(event) => setType(event.target.value as typeof type)}>
                <option value="receiving">Receiving</option>
                <option value="adjustment">Adjustment</option>
                <option value="return">Return</option>
                <option value="waste">Waste</option>
              </Select>
            </Field>
            <Field label="Quantity"><Input type="number" value={qty} onChange={(event) => setQty(event.target.value)} /></Field>
            <Field label="Note"><Input value={note} onChange={(event) => setNote(event.target.value)} /></Field>
            <Button type="submit">Record</Button>
          </form>
        </Card>
      ) : null}
      <Card className="mt-4">
        <h2 className="font-semibold">Inventory history</h2>
        <ul className="mt-2 space-y-2 text-sm">
          {store.state.inventoryTransactions.slice(0, 16).map((row) => {
            const part = store.state.parts.find((item) => item.id === row.partId)
            return <li key={row.id}>{formatDateTime(row.createdAt)} · {part?.name} · {row.type} · {row.quantity} · {row.note}</li>
          })}
        </ul>
      </Card>
    </div>
  )
}
