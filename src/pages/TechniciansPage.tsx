import { useApp } from '../context/AppContext'
import { vehicleLabel } from '../lib/autoshop'
import { Card, PageHeader, StatusBadge } from '../components/ui'
import { Link } from 'react-router-dom'
import { OPEN_REPAIR_STATUSES } from '../lib/autoshop'

export function TechniciansPage() {
  const { store } = useApp()
  const techs = store.technicians()

  return (
    <div>
      <PageHeader title="Technicians" description="Assigned vehicles, open tickets, inspections, and shop tasks." />
      <div className="grid gap-4 xl:grid-cols-2">
        {techs.map((tech) => {
          const jobs = store.state.repairOrders.filter((row) => row.technicianId === tech.id && OPEN_REPAIR_STATUSES.includes(row.status))
          const tasks = store.state.tasks.filter((row) => row.assignedEmployeeId === tech.id && !row.archivedAt && row.status !== 'completed')
          const inspections = store.state.inspections.filter((row) => row.technicianId === tech.id && row.status !== 'completed')
          const shift = store.state.shifts.find((row) => row.employeeId === tech.id && row.date === new Date().toISOString().slice(0, 10))
          return (
            <Card key={tech.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-2xl">{tech.fullName}</h2>
                  <p className="text-sm text-ink-soft">{tech.title} · {jobs.length} current jobs</p>
                </div>
                {shift ? <StatusBadge status={shift.status} /> : null}
              </div>
              <h3 className="mt-4 font-semibold">Current jobs</h3>
              <ul className="mt-2 space-y-2 text-sm">
                {jobs.map((order) => {
                  const vehicle = store.state.vehicles.find((row) => row.id === order.vehicleId)
                  return (
                    <li key={order.id} className="flex justify-between gap-3">
                      <Link className="text-teal" to={`/repair-orders/${order.id}`}>{vehicle ? vehicleLabel(vehicle) : order.number} — {order.approvedWork || order.customerConcern || order.number}</Link>
                      <StatusBadge status={order.status} />
                    </li>
                  )
                })}
                {jobs.length === 0 ? <li className="text-ink-soft">No open assignments.</li> : null}
              </ul>
              <h3 className="mt-4 font-semibold">Tasks & inspections</h3>
              <ul className="mt-2 space-y-1 text-sm">
                {tasks.map((task) => <li key={task.id}><Link className="text-teal" to="/tasks">{task.title}</Link></li>)}
                {inspections.map((item) => <li key={item.id}><Link className="text-teal" to="/inspections">{item.number}</Link></li>)}
              </ul>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
