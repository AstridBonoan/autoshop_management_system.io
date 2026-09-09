import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { can } from '../lib/permissions'
import { collectErrors, isNonEmpty, newId } from '../lib/validation'
import type { Project, ProjectStatusKey } from '../types/domain'
import { Alert, Badge, Button, ConfirmDialog, Field, Input, Modal, PageHeader, Pagination, Select, Table, Textarea } from '../components/ui'

function blankProject(): Project {
  const now = new Date().toISOString()
  return {
    id: newId(),
    name: '',
    clientId: null,
    status: 'planning',
    startDate: null,
    endDate: null,
    notes: '',
    createdBy: '',
    updatedBy: '',
    createdAt: now,
    updatedAt: now,
    archivedAt: null,
  }
}

export function ProjectsPage() {
  const { store, refresh, profile } = useApp()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [form, setForm] = useState<{ project: Project; members: string[] } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [archive, setArchive] = useState<Project | null>(null)
  const result = useMemo(() => store.listProjects({ search, status: status || undefined, page, pageSize: 8 }), [store, search, status, page])

  function save() {
    if (!form) return
    const errors = collectErrors([isNonEmpty(form.project.name, 'Name')])
    if (errors.length) {
      setError(errors[0])
      return
    }
    try {
      store.saveProject(form.project, form.members)
      refresh()
      setForm(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save project.')
    }
  }

  return (
    <div>
      <PageHeader
        title="Projects / work"
        description="A general work container. Later systems can present this as jobs, cases, engagements, or service orders."
        actions={can(store.state, profile, 'projects', 'create') ? (
          <Button type="button" onClick={() => { setError(null); setForm({ project: blankProject(), members: [] }) }}>New project</Button>
        ) : null}
      />
      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <Input placeholder="Search projects" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1) }} />
        <Select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1) }}>
          <option value="">All statuses</option>
          <option value="planning">Planning</option>
          <option value="active">Active</option>
          <option value="on_hold">On Hold</option>
          <option value="completed">Completed</option>
          <option value="archived">Archived</option>
        </Select>
      </div>
      <Table headers={['Project', 'Client', 'Status', '']}>
        {result.items.map((project) => {
          const client = store.state.clients.find((row) => row.id === project.clientId)
          return (
            <tr key={project.id} className="border-t border-line">
              <td className="px-3 py-2"><Link className="font-medium text-teal" to={`/projects/${project.id}`}>{project.name}</Link></td>
              <td className="px-3 py-2">{client?.displayName ?? '—'}</td>
              <td className="px-3 py-2"><Badge tone="teal">{project.status.replace('_', ' ')}</Badge></td>
              <td className="px-3 py-2 text-right">
                {can(store.state, profile, 'projects', 'archive') && project.status !== 'archived' ? (
                  <Button variant="ghost" type="button" onClick={() => setArchive(project)}>Archive</Button>
                ) : null}
              </td>
            </tr>
          )
        })}
      </Table>
      <div className="mt-3"><Pagination page={result.page} pageSize={result.pageSize} total={result.total} onPage={setPage} /></div>
      {form ? (
        <Modal title="Project" onClose={() => setForm(null)} footer={<Button type="button" onClick={save}>Save</Button>}>
          {error ? <Alert tone="error">{error}</Alert> : null}
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2"><Field label="Name"><Input value={form.project.name} onChange={(event) => setForm({ ...form, project: { ...form.project, name: event.target.value } })} /></Field></div>
            <Field label="Client">
              <Select value={form.project.clientId ?? ''} onChange={(event) => setForm({ ...form, project: { ...form.project, clientId: event.target.value || null } })}>
                <option value="">None</option>
                {store.state.clients.filter((row) => !row.archivedAt).map((row) => <option key={row.id} value={row.id}>{row.displayName}</option>)}
              </Select>
            </Field>
            <Field label="Status">
              <Select value={form.project.status} onChange={(event) => setForm({ ...form, project: { ...form.project, status: event.target.value as ProjectStatusKey } })}>
                <option value="planning">Planning</option>
                <option value="active">Active</option>
                <option value="on_hold">On Hold</option>
                <option value="completed">Completed</option>
                <option value="archived">Archived</option>
              </Select>
            </Field>
            <Field label="Start"><Input type="date" value={form.project.startDate ?? ''} onChange={(event) => setForm({ ...form, project: { ...form.project, startDate: event.target.value || null } })} /></Field>
            <Field label="End"><Input type="date" value={form.project.endDate ?? ''} onChange={(event) => setForm({ ...form, project: { ...form.project, endDate: event.target.value || null } })} /></Field>
            <div className="sm:col-span-2">
              <Field label="Assigned employees">
                <select
                  multiple
                  className="h-28 w-full rounded-md border border-line bg-card px-3 py-2 text-sm"
                  value={form.members}
                  onChange={(event) => setForm({ ...form, members: Array.from(event.target.selectedOptions).map((option) => option.value) })}
                >
                  {store.state.profiles.filter((row) => row.status === 'active').map((row) => <option key={row.id} value={row.id}>{row.fullName}</option>)}
                </select>
              </Field>
            </div>
            <div className="sm:col-span-2"><Field label="Notes"><Textarea value={form.project.notes} onChange={(event) => setForm({ ...form, project: { ...form.project, notes: event.target.value } })} /></Field></div>
          </div>
        </Modal>
      ) : null}
      {archive ? <ConfirmDialog title="Archive project" body="Archived work remains available for history and documents." confirmLabel="Archive" onClose={() => setArchive(null)} onConfirm={() => { store.archiveProject(archive.id); refresh(); setArchive(null) }} /> : null}
    </div>
  )
}
