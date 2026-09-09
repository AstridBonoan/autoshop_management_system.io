import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { prettyStatus, statusTone } from '../lib/autoshop'
import { classNames } from '../lib/format'

export function Button({
  variant = 'primary',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger' }) {
  const styles = {
    primary: 'brand-gradient text-white hover:opacity-90',
    secondary: 'bg-gold-soft text-ink hover:bg-gold/20',
    ghost: 'bg-transparent text-ink hover:bg-paper-2',
    danger: 'bg-danger text-white hover:bg-danger/90',
  }[variant]
  return (
    <button
      className={classNames(
        'inline-flex items-center justify-center gap-2 rounded-md px-3.5 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50',
        styles,
        className,
      )}
      {...props}
    />
  )
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={classNames(
        'w-full rounded-md border border-line bg-card px-3 py-2 text-sm text-ink shadow-sm',
        className,
      )}
      {...props}
    />
  )
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={classNames(
        'w-full rounded-md border border-line bg-card px-3 py-2 text-sm text-ink shadow-sm',
        className,
      )}
      {...props}
    />
  )
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={classNames(
        'w-full rounded-md border border-line bg-card px-3 py-2 text-sm text-ink shadow-sm',
        className,
      )}
      {...props}
    />
  )
}

export function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-ink">{label}</span>
      {children}
      {hint ? <span className="block text-xs text-ink-soft">{hint}</span> : null}
      {error ? <span className="block text-xs text-danger">{error}</span> : null}
    </label>
  )
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={classNames('rounded-xl border border-line bg-card p-5 shadow-sm', className)}>{children}</section>
}

export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode
  tone?: 'neutral' | 'success' | 'warn' | 'danger' | 'teal'
}) {
  const styles = {
    neutral: 'bg-paper-2 text-ink-soft',
    success: 'bg-success/15 text-success',
    warn: 'bg-gold-soft text-warn',
    danger: 'bg-danger/15 text-danger',
    teal: 'bg-teal/10 text-teal-deep',
  }[tone]
  return <span className={classNames('inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold', styles)}>{children}</span>
}

export function Alert({
  children,
  tone = 'info',
}: {
  children: ReactNode
  tone?: 'info' | 'error' | 'success'
}) {
  const styles = {
    info: 'border-teal/30 bg-teal/10 text-teal-deep',
    error: 'border-danger/30 bg-danger/10 text-danger',
    success: 'border-success/30 bg-success/10 text-success',
  }[tone]
  return <div className={classNames('rounded-md border px-3 py-2 text-sm', styles)}>{children}</div>
}

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-ink-soft" role="status" aria-live="polite">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-line border-t-teal" />
      {label}
    </div>
  )
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-line bg-paper px-6 py-12 text-center">
      <h3 className="font-display text-xl text-ink">{title}</h3>
      <p className="mt-2 text-sm text-ink-soft">{body}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}

export function Modal({
  title,
  children,
  onClose,
  footer,
}: {
  title: string
  children: ReactNode
  onClose: () => void
  footer?: ReactNode
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <button className="absolute inset-0 cursor-default" aria-label="Close dialog" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl rounded-xl border border-line bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <h2 id="modal-title" className="font-display text-lg">
            {title}
          </h2>
          <Button variant="ghost" onClick={onClose} type="button">
            Close
          </Button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">{children}</div>
        {footer ? <div className="flex justify-end gap-2 border-t border-line px-5 py-3">{footer}</div> : null}
      </div>
    </div>
  )
}

export function ConfirmDialog({
  title,
  body,
  confirmLabel = 'Confirm',
  onConfirm,
  onClose,
}: {
  title: string
  body: string
  confirmLabel?: string
  onConfirm: () => void
  onClose: () => void
}) {
  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="danger" type="button" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm text-ink-soft">{body}</p>
    </Modal>
  )
}

export function Tabs({
  tabs,
  value,
  onChange,
}: {
  tabs: Array<{ id: string; label: string }>
  value: string
  onChange: (id: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-2 border-b border-line pb-2">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={classNames(
            'rounded-md px-3 py-1.5 text-sm font-medium',
            value === tab.id ? 'bg-teal text-white' : 'text-ink-soft hover:bg-paper-2',
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

export function Pagination({
  page,
  pageSize,
  total,
  onPage,
}: {
  page: number
  pageSize: number
  total: number
  onPage: (page: number) => void
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  return (
    <div className="flex items-center justify-between gap-3 text-sm text-ink-soft">
      <span>
        Showing {total === 0 ? 0 : (page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)} of {total}
      </span>
      <div className="flex gap-2">
        <Button variant="secondary" type="button" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          Previous
        </Button>
        <Button variant="secondary" type="button" disabled={page >= pages} onClick={() => onPage(page + 1)}>
          Next
        </Button>
      </div>
    </div>
  )
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string
  description?: string
  actions?: ReactNode
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-display text-3xl text-ink">{title}</h1>
        {description ? <p className="mt-1 max-w-2xl text-sm text-ink-soft">{description}</p> : null}
      </div>
      {actions}
    </div>
  )
}

export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={statusTone(status)}>{prettyStatus(status)}</Badge>
}

export function Table({ headers, children }: { headers: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-line">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-paper-2 text-ink-soft">
          <tr>
            {headers.map((header) => (
              <th key={header} className="px-3 py-2 font-semibold">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-card">{children}</tbody>
      </table>
    </div>
  )
}
