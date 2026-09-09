import type {
  AppointmentStatus,
  EstimateStatus,
  InspectionResult,
  LineTotals,
  LookupOption,
  PaymentStatus,
  RepairOrder,
  RepairOrderItem,
  RepairOrderStatus,
  Vehicle,
} from '../types/domain'

export const PRODUCT = {
  name: 'Bayline',
  tagline: 'From check-in to keys back.',
  description:
    'Vehicle-first operations software for independent repair shops, mechanics, and automotive service centers.',
  developer: 'B&C Software & Web',
} as const

export function vehicleLabel(vehicle: Pick<Vehicle, 'year' | 'make' | 'model' | 'trim'> | null | undefined): string {
  if (!vehicle) return 'Unknown vehicle'
  return [vehicle.year, vehicle.make, vehicle.model, vehicle.trim].filter(Boolean).join(' ')
}

export function lookupLabel(lookups: LookupOption[], id: string | null | undefined): string {
  if (!id) return '—'
  return lookups.find((row) => row.id === id)?.label ?? '—'
}

export function lookupsFor(lookups: LookupOption[], list: LookupOption['list']) {
  return lookups.filter((row) => row.list === list && row.active).sort((a, b) => a.sortOrder - b.sortOrder)
}

export function lineTotals(
  items: Array<Pick<RepairOrderItem, 'kind' | 'quantity' | 'unitPrice' | 'hours'> & { declined?: boolean }>,
  discount = 0,
  taxRate = 0,
): LineTotals {
  const active = items.filter((item) => !item.declined)
  const labor = active
    .filter((item) => item.kind === 'labor' || item.kind === 'service')
    .reduce((sum, item) => sum + (item.hours || item.quantity) * item.unitPrice, 0)
  const parts = active.filter((item) => item.kind === 'part').reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
  const fees = active.filter((item) => item.kind === 'fee').reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
  const subtotal = labor + parts + fees
  const safeDiscount = Math.min(discount, subtotal)
  const taxable = Math.max(0, subtotal - safeDiscount)
  const tax = taxable * (taxRate / 100)
  return { labor, parts, fees, subtotal, discount: safeDiscount, tax, total: taxable + tax }
}

export function repairOrderTotals(order: RepairOrder, items: RepairOrderItem[]) {
  return lineTotals(
    items.filter((item) => item.repairOrderId === order.id),
    order.discount,
    order.taxRate,
  )
}

export function paymentBalance(total: number, paid: number): { amountPaid: number; balance: number; status: PaymentStatus } {
  const amountPaid = Math.max(0, paid)
  const balance = Math.max(0, Number((total - amountPaid).toFixed(2)))
  let status: PaymentStatus = 'unpaid'
  if (amountPaid > 0 && balance > 0) status = 'partial'
  if (balance === 0 && amountPaid > 0) status = 'paid'
  return { amountPaid, balance, status }
}

export function statusTone(
  status: string,
): 'neutral' | 'success' | 'warn' | 'danger' | 'teal' {
  if (['completed', 'paid', 'approved', 'good', 'ready_for_pickup', 'active', 'confirmed'].includes(status)) return 'success'
  if (['awaiting_approval', 'pending_approval', 'attention', 'recommended', 'waiting_for_parts', 'partial', 'quality_check'].includes(status)) return 'warn'
  if (['cancelled', 'declined', 'urgent', 'no_show', 'refunded', 'expired'].includes(status)) return 'danger'
  if (['in_progress', 'in_service', 'diagnosing', 'checked_in', 'in_shop'].includes(status)) return 'teal'
  return 'neutral'
}

export function prettyStatus(value: string) {
  return value.replace(/_/g, ' ')
}

export const OPEN_REPAIR_STATUSES: RepairOrderStatus[] = [
  'draft',
  'checked_in',
  'diagnosing',
  'awaiting_approval',
  'approved',
  'in_progress',
  'waiting_for_parts',
  'quality_check',
  'ready_for_pickup',
]

export const IN_SHOP_STATUSES: RepairOrderStatus[] = [
  'checked_in',
  'diagnosing',
  'awaiting_approval',
  'approved',
  'in_progress',
  'waiting_for_parts',
  'quality_check',
]

export const WORKING_STATUSES: RepairOrderStatus[] = ['diagnosing', 'in_progress', 'quality_check']

export function isOpenAppointment(status: AppointmentStatus) {
  return ['requested', 'confirmed', 'checked_in', 'in_service', 'scheduled'].includes(status)
}

export function isPendingEstimate(status: EstimateStatus) {
  return ['draft', 'sent', 'pending_approval'].includes(status)
}

export function inspectionTone(result: InspectionResult) {
  if (result === 'good') return 'success' as const
  if (result === 'urgent') return 'danger' as const
  if (result === 'attention' || result === 'recommended') return 'warn' as const
  return 'neutral' as const
}
