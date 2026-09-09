import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { can } from '../lib/permissions'
import { collectErrors, isEmail, isNonEmpty, newId } from '../lib/validation'
import { Alert, Badge, Button, ConfirmDialog, Field, Input, Modal, PageHeader, Pagination, Select, Table, Textarea } from '../components/ui'
import type { Profile, UserStatus } from '../types/domain'

const emptyUser = (): Omit<Profile, 'createdAt' | 'updatedAt'> & { password: string } => ({
  id: newId(),
  email: '',
  fullName: '',
  phone: '',
  title: '',
  positionId: null,
  roleId: '',
  status: 'active',
  notes: '',
  password: '',
})

export function UsersPage() {
  const { store, refresh, profile } = useApp()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [form, setForm] = useState<(Omit<Profile, 'createdAt' | 'updatedAt'> & { password?: string }) | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<Profile | null>(null)
  const result = useMemo(
    () => store.listUsers({ search, status: status || undefined, page, pageSize: 8 }),
    [store, search, status, page],
  )

  async function save() {
    if (!form) return
    const errors = collectErrors([isNonEmpty(form.fullName, 'Name'), isEmail(form.email), isNonEmpty(form.roleId, 'Role')])
    const existing = store.state.profiles.some((row) => row.id === form.id)
    if (!existing && !form.password) errors.push('A temporary password is required.')
    if (errors.length) {
      setError(errors[0])
      return
    }
    try {
      await store.upsertUser(form)
      refresh()
      setForm(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save user.')
    }
  }

  return (
    <div>
      <PageHeader
        title="Shop staff"
        description="Employee profiles, positions, and access roles. Authentication identity stays in B&C Core."
        actions={
          can(store.state, profile, 'users', 'create') ? (
            <Button type="button" onClick={() => { setError(null); setForm({ ...emptyUser(), roleId: store.state.roles.find((row) => row.key === 'technician')?.id ?? store.state.roles[0].id }) }}>
              Add staff
            </Button>
          ) : null
        }
      />
      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <Input placeholder="Search users" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1) }} />
        <Select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1) }}>
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </Select>
      </div>
      <Table headers={['Name', 'Email', 'Role', 'Status', '']}>
        {result.items.map((user) => {
          const role = store.state.roles.find((row) => row.id === user.roleId)
          return (
            <tr key={user.id} className="border-t border-line">
              <td className="px-3 py-2"><Link className="font-medium text-teal" to={`/users/${user.id}`}>{user.fullName}</Link></td>
              <td className="px-3 py-2">{user.email}</td>
              <td className="px-3 py-2">{role?.name}</td>
              <td className="px-3 py-2"><Badge tone={user.status === 'active' ? 'success' : 'neutral'}>{user.status}</Badge></td>
              <td className="px-3 py-2 text-right">
                {can(store.state, profile, 'users', 'edit') ? (
                  <Button variant="ghost" type="button" onClick={() => setConfirm(user)}>
                    {user.status === 'active' ? 'Deactivate' : 'Activate'}
                  </Button>
                ) : null}
              </td>
            </tr>
          )
        })}
      </Table>
      <div className="mt-3">
        <Pagination page={result.page} pageSize={result.pageSize} total={result.total} onPage={setPage} />
      </div>
      {form ? (
        <Modal title="User profile" onClose={() => setForm(null)} footer={<Button type="button" onClick={save}>Save</Button>}>
          {error ? <Alert tone="error">{error}</Alert> : null}
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Field label="Full name"><Input value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} /></Field>
            <Field label="Email"><Input value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></Field>
            <Field label="Phone"><Input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></Field>
            <Field label="Title"><Input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></Field>
            <Field label="Position">
              <Select value={form.positionId ?? ''} onChange={(event) => setForm({ ...form, positionId: event.target.value || null })}>
                <option value="">None</option>
                {store.state.lookups.filter((row) => row.list === 'staff_position').map((row) => <option key={row.id} value={row.id}>{row.label}</option>)}
              </Select>
            </Field>
            <Field label="Role">
              <Select value={form.roleId} onChange={(event) => setForm({ ...form, roleId: event.target.value })}>
                {store.state.roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
              </Select>
            </Field>
            <Field label="Status">
              <Select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as UserStatus })}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </Select>
            </Field>
            <Field label="Temporary password" hint="Required for new users.">
              <Input type="password" value={form.password ?? ''} onChange={(event) => setForm({ ...form, password: event.target.value })} />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Notes"><Textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></Field>
            </div>
          </div>
        </Modal>
      ) : null}
      {confirm ? (
        <ConfirmDialog
          title={`${confirm.status === 'active' ? 'Deactivate' : 'Activate'} user`}
          body="This changes application access. The authentication identity remains, but inactive users cannot sign in."
          onClose={() => setConfirm(null)}
          onConfirm={() => {
            store.setUserStatus(confirm.id, confirm.status === 'active' ? 'inactive' : 'active')
            refresh()
            setConfirm(null)
          }}
        />
      ) : null}
    </div>
  )
}
