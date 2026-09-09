import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { formatDateTime, formatMoney } from '../lib/format'
import { vehicleLabel } from '../lib/autoshop'
import { Card, PageHeader, StatusBadge, Table } from '../components/ui'

export function PaymentsPage() {
  const { store } = useApp()
  const open = store.state.repairOrders.filter((row) => !['cancelled'].includes(row.status))

  return (
    <div>
      <PageHeader title="Payments" description="Repair-order balances and transaction history. Provider checkout can be added later." />
      <div className="grid gap-4 md:grid-cols-3">
        {['unpaid', 'partial', 'paid'].map((status) => {
          const count = open.filter((row) => store.orderMoney(row).status === status).length
          return (
            <Card key={status}>
              <p className="text-sm text-ink-soft">{status}</p>
              <p className="mt-2 font-display text-3xl">{count}</p>
            </Card>
          )
        })}
      </div>
      <Table headers={['Repair order', 'Vehicle', 'Total', 'Paid', 'Balance', 'Status']}>
        {open.map((order) => {
          const money = store.orderMoney(order)
          const vehicle = store.state.vehicles.find((row) => row.id === order.vehicleId)
          return (
            <tr key={order.id} className="border-t border-line">
              <td className="px-3 py-2"><Link className="text-teal" to={`/repair-orders/${order.id}`}>{order.number}</Link></td>
              <td className="px-3 py-2">{vehicle ? vehicleLabel(vehicle) : '—'}</td>
              <td className="px-3 py-2">{formatMoney(money.total)}</td>
              <td className="px-3 py-2">{formatMoney(money.amountPaid)}</td>
              <td className="px-3 py-2">{formatMoney(money.balance)}</td>
              <td className="px-3 py-2"><StatusBadge status={money.status} /></td>
            </tr>
          )
        })}
      </Table>
      <Card className="mt-4">
        <h2 className="font-semibold">Transactions</h2>
        <ul className="mt-2 space-y-2 text-sm">
          {store.state.payments.map((row) => {
            const order = store.state.repairOrders.find((item) => item.id === row.repairOrderId)
            return <li key={row.id}>{formatDateTime(row.createdAt)} · {order?.number} · {row.method} · {formatMoney(row.amount)}</li>
          })}
        </ul>
      </Card>
    </div>
  )
}
