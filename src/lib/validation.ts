export function isNonEmpty(value: string, label: string): string | null {
  if (!value.trim()) return `${label} is required.`
  return null
}

export function isEmail(value: string): string | null {
  if (!value.trim()) return 'Email is required.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) return 'Enter a valid email address.'
  return null
}

export function isTimeRange(start: string, end: string): string | null {
  if (!start || !end) return 'Start and end times are required.'
  if (start >= end) return 'End time must be after start time.'
  return null
}

export function collectErrors(checks: Array<string | null>): string[] {
  return checks.filter((item): item is string => Boolean(item))
}

export function hashPassword(value: string): Promise<string> {
  return crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)).then((buffer) => {
    return Array.from(new Uint8Array(buffer))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('')
  })
}

export function newId(): string {
  return crypto.randomUUID()
}

export function nowIso(): string {
  return new Date().toISOString()
}

export function matchesSearch(haystack: string, query: string): boolean {
  if (!query.trim()) return true
  return haystack.toLowerCase().includes(query.trim().toLowerCase())
}

export function paginate<T>(items: T[], page = 1, pageSize = 10): { items: T[]; total: number; page: number; pageSize: number } {
  const safePage = Math.max(1, page)
  const start = (safePage - 1) * pageSize
  return {
    items: items.slice(start, start + pageSize),
    total: items.length,
    page: safePage,
    pageSize,
  }
}
