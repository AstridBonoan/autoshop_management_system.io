import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { can } from '../lib/permissions'
import { collectErrors, isNonEmpty, newId } from '../lib/validation'
import type { Client, ClientStatus, ClientType } from '../types/domain'
import { Alert, Button, ConfirmDialog, EmptyState, Field, Input, Modal, PageHeader, Pagination, Select, StatusBadge, Table, Textarea } from '../components/ui'

function blankClient(): Client {
  const now = new Date().toISOString()
  return {
    id: newId(),
    type: 'individual',
    displayName: '',
    legalName: '',
    email: '',
    phone: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    region: '',
    postalCode: '',
    country: 'United States',
    status: 'active',
    notes: '',
    tags: [],
    assignedEmployeeId: null,
    createdBy: '',
    updatedBy: '',
    createdAt: now,
    updatedAt: now,
    archivedAt: null,
  }
}

export function ClientsPage() {
  const { store, refresh, profile } = useApp()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [assigned, setAssigned] = useState('')
  const [page, setPage] = useState(1)
  const [form, setForm] = useState<Client | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [archive, setArchive] = useState<Client | null>(null)
  const result = useMemo(
    () => store.listClients({ search, status: status || undefined, assignedEmployeeId: assigned || undefined, page, pageSize: 8, includeArchived: status === 'archived' }),
    [store, search, status, assigned, page],
  )

  function save() {
    if (!form) return
    const errors = collectErrors([isNonEmpty(form.displayName, 'Name')])
    if (errors.length) {
      setError(errors[0])
      return
    }
    try {
      store.saveClient(form)
      refresh()
      setForm(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save customer.')
    }
  }

  return (
    <div>
      <PageHeader
        title="Customers"
        description="People and fleets who own the vehicles in the shop."
        actions={
          can(store.state, profile, 'clients', 'create') ? (
            <Button type="button" className="min-h-11" onClick={() => { setError(null); setForm(blankClient()) }}>New customer</Button>
          ) : null
        }
      />
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Input placeholder="Search name, phone, or email" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1) }} />
        <Select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1) }}>
          <option value="">Active & inactive</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="archived">Archived</option>
        </Select>
        <Select value={assigned} onChange={(event) => { setAssigned(event.target.value); setPage(1) }}>
          <option value="">All advisors</option>
          {store.state.profiles.map((row) => <option key={row.id} value={row.id}>{row.fullName}</option>)}
        </Select>
      </div>
      {result.total === 0 ? <EmptyState title="No customers match" body="Try another name or add the customer before creating a vehicle." /> : (
        <Table headers={['Customer', 'Phone', 'Vehicles', 'Advisor', 'Status', '']}>
          {result.items.map((client) => {
            const owner = store.state.profiles.find((row) => row.id === client.assignedEmployeeId)
            const vehicles = store.state.vehicles.filter((row) => row.customerId === client.id)
            return (
              <tr key={client.id} className="border-t border-line">
                <td className="px-3 py-2"><Link className="font-medium text-teal" to={`/customers/${client.id}`}>{client.displayName}</Link></td>
                <td className="px-3 py-2">{client.phone || '—'}</td>
                <td className="px-3 py-2">{vehicles.length}</td>
                <td className="px-3 py-2">{owner?.fullName ?? '—'}</td>
                <td className="px-3 py-2"><StatusBadge status={client.status} /></td>
                <td className="px-3 py-2 text-right">
                  {can(store.state, profile, 'clients', 'archive') && client.status !== 'archived' ? (
                    <Button variant="ghost" type="button" onClick={() => setArchive(client)}>Archive</Button>
                  ) : null}
                </td>
              </tr>
            )
          })}
        </Table>
      )}
      <div className="mt-3"><Pagination page={result.page} pageSize={result.pageSize} total={result.total} onPage={setPage} /></div>
      {form ? (
        <Modal title="Customer" onClose={() => setForm(null)} footer={<Button type="button" onClick={save}>Save</Button>}>
          {error ? <Alert tone="error">{error}</Alert> : null}
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Field label="Name"><Input value={form.displayName} onChange={(event) => setForm({ ...form, displayName: event.target.value, legalName: form.legalName || event.target.value })} /></Field>
            <Field label="Type">
              <Select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as ClientType })}>
                <option value="individual">Individual</option>
                <option value="business">Business / fleet</option>
              </Select>
            </Field>
            <Field label="Phone"><Input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></Field>
            <Field label="Email"><Input value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></Field>
            <Field label="Status">
              <Select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as ClientStatus })}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </Select>
            </Field>
            <Field label="Service advisor">
              <Select value={form.assignedEmployeeId ?? ''} onChange={(event) => setForm({ ...form, assignedEmployeeId: event.target.value || null })}>
                <option value="">Unassigned</option>
                {store.state.profiles.filter((row) => row.status === 'active').map((row) => <option key={row.id} value={row.id}>{row.fullName}</option>)}
              </Select>
            </Field>
            <Field label="Address"><Input value={form.addressLine1} onChange={(event) => setForm({ ...form, addressLine1: event.target.value })} /></Field>
            <Field label="City"><Input value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} /></Field>
            <Field label="State"><Input value={form.region} onChange={(event) => setForm({ ...form, region: event.target.value })} /></Field>
            <Field label="Postal code"><Input value={form.postalCode} onChange={(event) => setForm({ ...form, postalCode: event.target.value })} /></Field>
            <div className="sm:col-span-2"><Field label="Notes"><Textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></Field></div>
          </div>
        </Modal>
      ) : null}
      {archive ? (
        <ConfirmDialog
          title="Archive customer"
          body="The customer remains available for history but is hidden from default lists."
          confirmLabel="Archive"
          onClose={() => setArchive(null)}
          onConfirm={() => { store.archiveClient(archive.id); refresh(); setArchive(null) }}
        />
      ) : null}
    </div>
  )
}
