import { Link, useParams } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { formatDate } from '../lib/format'
import { Badge, Card, PageHeader, Tabs } from '../components/ui'
import { useState } from 'react'

export function ProjectDetailPage() {
  const { id } = useParams()
  const { store } = useApp()
  const [tab, setTab] = useState('overview')
  const project = store.state.projects.find((row) => row.id === id)
  if (!project) return <p>Project not found.</p>
  const client = store.state.clients.find((row) => row.id === project.clientId)
  const members = store.state.projectMembers.filter((row) => row.projectId === project.id)
  const tasks = store.state.tasks.filter((row) => row.projectId === project.id)
  const documents = store.state.documents.filter((row) => row.projectId === project.id)
  const activity = store.state.activities.filter((row) => row.relatedId === project.id)

  return (
    <div>
      <PageHeader title={project.name} description="Work record with shared tasks, documents, and activity." actions={<Badge tone="teal">{project.status.replace('_', ' ')}</Badge>} />
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'overview', label: 'Overview' },
          { id: 'tasks', label: 'Tasks' },
          { id: 'documents', label: 'Documents' },
          { id: 'notes', label: 'Notes' },
          { id: 'activity', label: 'Activity' },
        ]}
      />
      <div className="mt-4">
        {tab === 'overview' ? (
          <Card>
            <p>Client: {client ? <Link className="text-teal" to={`/clients/${client.id}`}>{client.displayName}</Link> : '—'}</p>
            <p className="mt-2 text-sm text-ink-soft">{formatDate(project.startDate)} → {formatDate(project.endDate)}</p>
            <p className="mt-2 text-sm">Team: {members.map((row) => store.state.profiles.find((profile) => profile.id === row.profileId)?.fullName).filter(Boolean).join(', ') || '—'}</p>
          </Card>
        ) : null}
        {tab === 'tasks' ? <Card><ul className="space-y-2">{tasks.map((task) => <li key={task.id}>{task.title}</li>)}</ul></Card> : null}
        {tab === 'documents' ? <Card><ul className="space-y-2">{documents.map((doc) => <li key={doc.id}>{doc.name}</li>)}</ul></Card> : null}
        {tab === 'notes' ? <Card><p className="whitespace-pre-wrap text-sm">{project.notes || 'No notes.'}</p></Card> : null}
        {tab === 'activity' ? <Card><ul className="space-y-2 text-sm">{activity.map((item) => <li key={item.id}>{item.description}</li>)}</ul></Card> : null}
      </div>
    </div>
  )
}
