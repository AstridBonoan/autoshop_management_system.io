import { useApp } from '../context/AppContext'
import { formatDateTime } from '../lib/format'
import { Badge, Button, Card, PageHeader } from '../components/ui'

export function NotificationsPage() {
  const { store, refresh, profile } = useApp()
  const items = store.state.notifications.filter((item) => item.recipientId === profile?.id)
  return (
    <div>
      <PageHeader title="Notifications" description="Reusable notification records that industry systems can extend with additional types." />
      <div className="space-y-3">
        {items.length === 0 ? <p className="text-sm text-ink-soft">No notifications.</p> : null}
        {items.map((item) => (
          <Card key={item.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{item.title}</p>
                <p className="text-sm text-ink-soft">{item.body}</p>
                <p className="mt-1 text-xs text-ink-soft">{formatDateTime(item.createdAt)}</p>
              </div>
              {item.readAt ? <Badge>Read</Badge> : (
                <Button variant="secondary" type="button" onClick={() => { store.markNotificationRead(item.id); refresh() }}>
                  Mark read
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
