import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { can } from '../lib/permissions'
import { newId } from '../lib/validation'
import type { LookupList, StatusEntity } from '../types/domain'
import { MODULES } from '../types/domain'
import { Alert, Button, Card, Field, Input, PageHeader, Select, Tabs } from '../components/ui'

export function SettingsPage() {
  const { store, refresh, profile } = useApp()
  const location = useLocation()
  const [tab, setTab] = useState(location.pathname.includes('roles') ? 'roles' : 'shop')
  const [company, setCompany] = useState(store.state.company)
  const [message, setMessage] = useState<string | null>(null)
  const [statusLabel, setStatusLabel] = useState('')
  const [statusEntity, setStatusEntity] = useState<StatusEntity>('repair_order')
  const [lookupList, setLookupList] = useState<LookupList>('appointment_type')
  const [lookupLabel, setLookupLabel] = useState('')
  const [serviceName, setServiceName] = useState('')
  const canEdit = can(store.state, profile, 'settings', 'edit') || can(store.state, profile, 'settings', 'manage')

  return (
    <div>
      <PageHeader title="Settings" description="Shop information and the configurable lists that keep automotive workflows data-driven." />
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'shop', label: 'Shop' },
          { id: 'users', label: 'Users' },
          { id: 'roles', label: 'Roles' },
          { id: 'lists', label: 'Lists' },
          { id: 'statuses', label: 'Statuses' },
          { id: 'services', label: 'Services' },
          { id: 'notifications', label: 'Notifications' },
          { id: 'payments', label: 'Payments' },
          { id: 'system', label: 'System' },
        ]}
      />
      <div className="mt-4">
        {tab === 'shop' ? (
          <Card>
            {message ? <Alert tone="success">{message}</Alert> : null}
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Field label="Shop name"><Input value={company.name} onChange={(event) => setCompany({ ...company, name: event.target.value })} /></Field>
              <Field label="Email"><Input value={company.email} onChange={(event) => setCompany({ ...company, email: event.target.value })} /></Field>
              <Field label="Phone"><Input value={company.phone} onChange={(event) => setCompany({ ...company, phone: event.target.value })} /></Field>
              <Field label="Website"><Input value={company.website} onChange={(event) => setCompany({ ...company, website: event.target.value })} /></Field>
              <div className="sm:col-span-2"><Field label="Address"><Input value={company.address} onChange={(event) => setCompany({ ...company, address: event.target.value })} /></Field></div>
              <Field label="Tax rate %"><Input type="number" value={company.taxRate} onChange={(event) => setCompany({ ...company, taxRate: Number(event.target.value) })} /></Field>
              <Field label="Default labor rate"><Input type="number" value={company.defaultLaborRate} onChange={(event) => setCompany({ ...company, defaultLaborRate: Number(event.target.value) })} /></Field>
            </div>
            {canEdit ? (
              <Button className="mt-4" type="button" onClick={() => { store.saveCompany(company); refresh(); setMessage('Shop settings saved.') }}>
                Save shop
              </Button>
            ) : null}
          </Card>
        ) : null}
        {tab === 'users' ? (
          <Card>
            <p className="text-sm text-ink-soft">Staff accounts, positions, and active status live in Staff.</p>
            <Link className="mt-3 inline-block text-teal underline" to="/users">Open staff management</Link>
          </Card>
        ) : null}
        {tab === 'roles' ? <RolesPanel /> : null}
        {tab === 'lists' ? (
          <Card>
            <h3 className="font-display text-lg">Configurable lists</h3>
            <p className="mt-1 text-sm text-ink-soft">Staff positions, appointment types, service categories, inspection categories, and parts categories.</p>
            <ul className="mt-3 max-h-56 overflow-auto text-sm">
              {store.state.lookups.map((row) => <li key={row.id}>{row.list.replace('_', ' ')}: {row.label}</li>)}
            </ul>
            {canEdit ? (
              <form className="mt-3 grid gap-2 sm:grid-cols-[200px_1fr_auto]" onSubmit={(event) => { event.preventDefault(); if (!lookupLabel.trim()) return; store.addLookup(lookupList, lookupLabel); setLookupLabel(''); refresh() }}>
                <Select value={lookupList} onChange={(event) => setLookupList(event.target.value as LookupList)}>
                  <option value="staff_position">Staff position</option>
                  <option value="appointment_type">Appointment type</option>
                  <option value="service_category">Service category</option>
                  <option value="inspection_category">Inspection category</option>
                  <option value="parts_category">Parts category</option>
                </Select>
                <Input value={lookupLabel} onChange={(event) => setLookupLabel(event.target.value)} placeholder="New value" />
                <Button type="submit">Add</Button>
              </form>
            ) : null}
          </Card>
        ) : null}
        {tab === 'statuses' ? (
          <Card>
            <ul className="max-h-48 overflow-auto text-sm">
              {store.state.statuses.map((row) => <li key={row.id}>{row.entity}: {row.label}</li>)}
            </ul>
            {canEdit ? (
              <form className="mt-3 grid gap-2 sm:grid-cols-[180px_1fr_auto]" onSubmit={(event) => { event.preventDefault(); if (!statusLabel.trim()) return; store.addStatus(statusEntity, statusLabel.toLowerCase().replace(/\s+/g, '_'), statusLabel); setStatusLabel(''); refresh() }}>
                <Select value={statusEntity} onChange={(event) => setStatusEntity(event.target.value as StatusEntity)}>
                  <option value="repair_order">Repair order</option>
                  <option value="appointment">Appointment</option>
                  <option value="estimate">Estimate</option>
                  <option value="inspection">Inspection</option>
                  <option value="task">Task</option>
                  <option value="vehicle">Vehicle</option>
                  <option value="payment">Payment</option>
                </Select>
                <Input value={statusLabel} onChange={(event) => setStatusLabel(event.target.value)} placeholder="New status" />
                <Button type="submit">Add</Button>
              </form>
            ) : null}
          </Card>
        ) : null}
        {tab === 'services' ? (
          <Card>
            <h3 className="font-display text-lg">Service catalog</h3>
            <ul className="mt-2 text-sm">{store.state.services.map((row) => <li key={row.id}>{row.name}</li>)}</ul>
            {canEdit ? (
              <form className="mt-3 flex gap-2" onSubmit={(event) => { event.preventDefault(); if (!serviceName.trim()) return; store.saveService({ id: newId(), name: serviceName, categoryId: 'scat-repair', defaultHours: 1, defaultPrice: store.state.company.defaultLaborRate, active: true }); setServiceName(''); refresh() }}>
                <Input value={serviceName} onChange={(event) => setServiceName(event.target.value)} placeholder="New service" />
                <Button type="submit">Add service</Button>
              </form>
            ) : null}
          </Card>
        ) : null}
        {tab === 'notifications' ? (
          <Card>
            <div className="grid gap-2 sm:grid-cols-2">
              {([
                ['taskAssigned', 'Task assignments'],
                ['taskDue', 'Task due'],
                ['appointmentUpcoming', 'Upcoming appointments'],
                ['recordUpdates', 'Record updates'],
                ['approvalRequired', 'Approval required'],
                ['estimateApproved', 'Estimate approved'],
                ['vehicleReady', 'Vehicle ready'],
                ['lowInventory', 'Low inventory'],
                ['technicianAssigned', 'Technician assigned'],
                ['scheduleChange', 'Schedule change'],
              ] as const).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={company.notificationPreferences[key]}
                    onChange={(event) => setCompany({
                      ...company,
                      notificationPreferences: { ...company.notificationPreferences, [key]: event.target.checked },
                    })}
                  />
                  {label}
                </label>
              ))}
            </div>
            {canEdit ? <Button className="mt-4" type="button" onClick={() => { store.saveCompany(company); refresh(); setMessage('Notification preferences saved.') }}>Save notifications</Button> : null}
          </Card>
        ) : null}
        {tab === 'payments' ? (
          <Card>
            <Field label="Payment note">
              <Input value={company.paymentNote} onChange={(event) => setCompany({ ...company, paymentNote: event.target.value })} />
            </Field>
            <p className="mt-3 text-sm text-ink-soft">Architecture is ready for Stripe or another provider. This version records shop payments against repair orders only.</p>
            {canEdit ? <Button className="mt-4" type="button" onClick={() => { store.saveCompany(company); refresh(); setMessage('Payment settings saved.') }}>Save payment settings</Button> : null}
          </Card>
        ) : null}
        {tab === 'system' ? (
          <Card>
            <p className="text-sm text-ink-soft">
              B&C Core (auth, users, roles, notifications, activity, documents, search, settings, dashboard and report frameworks) stays reusable. Automotive modules sit in the Bayline layer.
            </p>
          </Card>
        ) : null}
      </div>
    </div>
  )
}

function RolesPanel() {
  const { store, refresh, profile } = useApp()
  const [roleId, setRoleId] = useState(store.state.roles[0]?.id ?? '')
  const selected = new Set(store.state.rolePermissions.filter((row) => row.roleId === roleId).map((row) => row.permissionId))
  const canManage = can(store.state, profile, 'roles', 'manage')
  return (
    <Card>
      <Field label="Role">
        <select className="w-full rounded-md border border-line bg-card px-3 py-2 text-sm" value={roleId} onChange={(event) => setRoleId(event.target.value)}>
          {store.state.roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
        </select>
      </Field>
      <div className="mt-4 space-y-4">
        {MODULES.map((module) => (
          <div key={module}>
            <p className="text-sm font-semibold capitalize">{module.replace('_', ' ')}</p>
            <div className="mt-1 flex flex-wrap gap-3">
              {store.state.permissions.filter((permission) => permission.module === module).map((permission) => (
                <label key={permission.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    disabled={!canManage}
                    checked={selected.has(permission.id)}
                    onChange={(event) => {
                      const next = new Set(selected)
                      if (event.target.checked) next.add(permission.id)
                      else next.delete(permission.id)
                      store.saveRolePermissions(roleId, [...next])
                      refresh()
                    }}
                  />
                  {permission.action}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
