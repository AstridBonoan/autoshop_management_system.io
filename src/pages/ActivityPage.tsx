import { useApp } from '../context/AppContext'
import { formatDateTime } from '../lib/format'
import { PageHeader, Table } from '../components/ui'

export function ActivityPage() {
  const { store } = useApp()
  return (
    <div>
      <PageHeader title="Activity history" description="Append-only operational events. Ordinary users cannot edit or delete this history." />
      <Table headers={['Event', 'Description', 'When']}>
        {store.state.activities.map((item) => (
          <tr key={item.id} className="border-t border-line">
            <td className="px-3 py-2 font-mono text-xs">{item.eventType}</td>
            <td className="px-3 py-2">{item.description}</td>
            <td className="px-3 py-2 text-sm text-ink-soft">{formatDateTime(item.createdAt)}</td>
          </tr>
        ))}
      </Table>
    </div>
  )
}
