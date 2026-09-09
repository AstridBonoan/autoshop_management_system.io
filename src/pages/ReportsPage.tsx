import { useMemo, useState } from 'react'
import { useApp } from '../context/AppContext'
import { formatDateTime } from '../lib/format'
import { Card, Field, Input, PageHeader } from '../components/ui'

export function ReportsPage() {
  const { store } = useApp()
  const [from, setFrom] = useState('2026-09-01')
  const [to, setTo] = useState('2026-09-30')
  const report = useMemo(() => store.reports(from, to), [store, from, to])

  return (
    <div>
      <PageHeader title="Shop reports" description="Operational counts for appointments, repair orders, technicians, parts, and activity." />
      <div className="mb-4 grid max-w-lg gap-3 sm:grid-cols-2">
        <Field label="From"><Input type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></Field>
        <Field label="To"><Input type="date" value={to} onChange={(event) => setTo(event.target.value)} /></Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['Customers', report.clientCount],
          ['Vehicles', report.vehicleCount],
          ['Open repair orders', report.openRepairOrders],
          ['Completed work', report.completedWork],
          ['Appointments', report.appointmentCount],
          ['Estimates', report.estimateCount],
          ['Approved estimates', report.approvedEstimates],
          ['Parts used', report.partsUsageCount],
        ].map(([label, value]) => (
          <Card key={String(label)}>
            <p className="text-sm text-ink-soft">{label}</p>
            <p className="mt-2 font-display text-3xl">{value}</p>
          </Card>
        ))}
      </div>
      <Card className="mt-4">
        <h2 className="font-display text-xl">Repair order activity</h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-3">
          {Object.entries(report.repairOrdersByStatus).map(([status, count]) => (
            <li key={status} className="rounded-md bg-paper px-3 py-2 text-sm">{status.replace(/_/g, ' ')}: {count}</li>
          ))}
        </ul>
      </Card>
      <Card className="mt-4">
        <h2 className="font-display text-xl">Technician activity</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {report.workload.filter((row) => row.repairOrders || row.openTasks || row.appointments).map((row) => (
            <li key={row.profile.id}>{row.profile.fullName}: {row.repairOrders} open ROs, {row.openTasks} tasks, {row.appointments} appointments</li>
          ))}
        </ul>
      </Card>
      <Card className="mt-4">
        <h2 className="font-display text-xl">Low-stock items</h2>
        <ul className="mt-3 text-sm">
          {report.lowStock.map((item) => <li key={item.id}>{item.name} · {item.quantity} {item.unit}</li>)}
        </ul>
      </Card>
      <Card className="mt-4">
        <h2 className="font-display text-xl">Recent activity</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {report.recentActivity.map((item) => (
            <li key={item.id}>{item.description} · {formatDateTime(item.createdAt)}</li>
          ))}
        </ul>
      </Card>
    </div>
  )
}
