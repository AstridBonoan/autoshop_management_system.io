import { useMemo, useState } from 'react'
import { useApp } from '../context/AppContext'
import { can } from '../lib/permissions'
import { newId } from '../lib/validation'
import { lookupLabel } from '../lib/autoshop'
import type { Shift, ShiftStatus } from '../types/domain'
import { Button, Card, Field, Input, Modal, PageHeader, Select, StatusBadge, Tabs } from '../components/ui'

function startOfWeek(date: string) {
  const value = new Date(`${date}T00:00:00`)
  const day = value.getDay()
  value.setDate(value.getDate() - day)
  return value.toISOString().slice(0, 10)
}

function addDays(date: string, days: number) {
  const value = new Date(`${date}T00:00:00`)
  value.setDate(value.getDate() + days)
  return value.toISOString().slice(0, 10)
}

export function SchedulePage() {
  const { store, refresh, profile } = useApp()
  const [view, setView] = useState('week')
  const [day, setDay] = useState(() => new Date().toISOString().slice(0, 10))
  const [form, setForm] = useState<Shift | null>(null)
  const weekStart = startOfWeek(day)
  const days = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)), [weekStart])
  const staff = store.state.profiles.filter((row) => row.status === 'active')

  return (
    <div>
      <PageHeader
        title="Staff schedule"
        description="Daily and weekly coverage, time off, and bay assignments."
        actions={can(store.state, profile, 'scheduling', 'create') ? (
          <Button type="button" className="min-h-11" onClick={() => setForm({ id: newId(), employeeId: staff[0]?.id ?? '', date: day, startTime: '08:00', endTime: '17:00', label: 'Bay shift', status: 'scheduled', notes: '' })}>
            Add shift
          </Button>
        ) : null}
      />
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <Tabs value={view} onChange={setView} tabs={[{ id: 'day', label: 'Daily' }, { id: 'week', label: 'Weekly' }]} />
        <Field label="Date"><Input type="date" value={day} onChange={(event) => setDay(event.target.value)} /></Field>
      </div>
      {view === 'day' ? (
        <Card>
          <ul className="space-y-2">
            {store.state.shifts.filter((row) => row.date === day).map((shift) => {
              const person = store.state.profiles.find((row) => row.id === shift.employeeId)
              return (
                <li key={shift.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-line py-2">
                  <button className="text-left" type="button" onClick={() => setForm(shift)}>
                    <span className="font-medium">{person?.fullName}</span>
                    <span className="block text-sm text-ink-soft">{shift.startTime}–{shift.endTime} · {shift.label} · {lookupLabel(store.state.lookups, person?.positionId)}</span>
                  </button>
                  <StatusBadge status={shift.status} />
                </li>
              )
            })}
          </ul>
        </Card>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr>{days.map((value) => <th key={value} className="px-2 py-2">{value.slice(5)}</th>)}</tr>
            </thead>
            <tbody>
              {staff.map((person) => (
                <tr key={person.id} className="border-t border-line">
                  {days.map((value) => {
                    const shifts = store.state.shifts.filter((row) => row.employeeId === person.id && row.date === value)
                    return (
                      <td key={value} className="px-2 py-2 align-top">
                        <p className="text-xs font-semibold">{person.fullName}</p>
                        {shifts.map((shift) => (
                          <button key={shift.id} className="mt-1 block rounded bg-paper px-2 py-1 text-left text-xs" type="button" onClick={() => setForm(shift)}>
                            {shift.startTime} {shift.label}
                          </button>
                        ))}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {form ? (
        <Modal title="Shift" onClose={() => setForm(null)} footer={<Button type="button" onClick={() => { store.saveShift(form); refresh(); setForm(null) }}>Save</Button>}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Employee">
              <Select value={form.employeeId} onChange={(event) => setForm({ ...form, employeeId: event.target.value })}>
                {staff.map((row) => <option key={row.id} value={row.id}>{row.fullName}</option>)}
              </Select>
            </Field>
            <Field label="Status">
              <Select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as ShiftStatus })}>
                <option value="scheduled">Scheduled</option>
                <option value="available">Available</option>
                <option value="time_off">Time off</option>
              </Select>
            </Field>
            <Field label="Date"><Input type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} /></Field>
            <Field label="Label"><Input value={form.label} onChange={(event) => setForm({ ...form, label: event.target.value })} /></Field>
            <Field label="Start"><Input type="time" value={form.startTime} onChange={(event) => setForm({ ...form, startTime: event.target.value })} /></Field>
            <Field label="End"><Input type="time" value={form.endTime} onChange={(event) => setForm({ ...form, endTime: event.target.value })} /></Field>
          </div>
        </Modal>
      ) : null}
    </div>
  )
}
