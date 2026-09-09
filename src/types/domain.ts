export const ROLES = {
  administrator: 'administrator',
  manager: 'manager',
  service_advisor: 'service_advisor',
  technician: 'technician',
  staff: 'staff',
} as const

export type RoleKey = (typeof ROLES)[keyof typeof ROLES]

export const MODULES = [
  'dashboard',
  'users',
  'roles',
  'clients',
  'tasks',
  'projects',
  'appointments',
  'documents',
  'activity',
  'notifications',
  'reports',
  'settings',
  'vehicles',
  'repair_orders',
  'estimates',
  'inspections',
  'parts',
  'inventory',
  'scheduling',
  'payments',
  'technicians',
] as const

export type ModuleKey = (typeof MODULES)[number]

export const ACTIONS = ['view', 'create', 'edit', 'archive', 'delete', 'manage'] as const
export type ActionKey = (typeof ACTIONS)[number]

export type PermissionKey = `${ModuleKey}.${ActionKey}`

export interface Role {
  id: string
  key: RoleKey | string
  name: string
  description: string
  isSystem: boolean
}

export interface Permission {
  id: string
  key: PermissionKey | string
  module: ModuleKey | string
  action: ActionKey | string
  description: string
}

export interface RolePermission {
  roleId: string
  permissionId: string
}

export type UserStatus = 'active' | 'inactive'

export interface Profile {
  id: string
  email: string
  fullName: string
  phone: string
  title: string
  positionId: string | null
  roleId: string
  status: UserStatus
  notes: string
  createdAt: string
  updatedAt: string
}

export interface Credential {
  profileId: string
  email: string
  passwordHash: string
  resetToken: string | null
  resetTokenExpiresAt: string | null
}

export type ClientType = 'individual' | 'business'
export type ClientStatus = 'active' | 'inactive' | 'archived'

export interface Client {
  id: string
  type: ClientType
  displayName: string
  legalName: string
  email: string
  phone: string
  addressLine1: string
  addressLine2: string
  city: string
  region: string
  postalCode: string
  country: string
  status: ClientStatus
  notes: string
  tags: string[]
  assignedEmployeeId: string | null
  createdBy: string
  updatedBy: string
  createdAt: string
  updatedAt: string
  archivedAt: string | null
}

export interface ClientContact {
  id: string
  clientId: string
  fullName: string
  email: string
  phone: string
  title: string
  isPrimary: boolean
}

export type StatusEntity =
  | 'task'
  | 'project'
  | 'appointment'
  | 'client'
  | 'document'
  | 'repair_order'
  | 'estimate'
  | 'inspection'
  | 'vehicle'
  | 'payment'
  | 'shift'

export interface StatusOption {
  id: string
  entity: StatusEntity
  key: string
  label: string
  sortOrder: number
  isClosed?: boolean
}

export type ProjectStatusKey = 'planning' | 'active' | 'on_hold' | 'completed' | 'archived'

export interface Project {
  id: string
  name: string
  clientId: string | null
  status: ProjectStatusKey
  startDate: string | null
  endDate: string | null
  notes: string
  createdBy: string
  updatedBy: string
  createdAt: string
  updatedAt: string
  archivedAt: string | null
}

export interface ProjectMember {
  projectId: string
  profileId: string
}

export type TaskStatusKey = 'todo' | 'in_progress' | 'completed'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface Task {
  id: string
  title: string
  description: string
  status: TaskStatusKey
  priority: TaskPriority
  assignedEmployeeId: string | null
  clientId: string | null
  projectId: string | null
  vehicleId: string | null
  repairOrderId: string | null
  dueDate: string | null
  completedAt: string | null
  createdBy: string
  updatedBy: string
  createdAt: string
  updatedAt: string
  archivedAt: string | null
}

export type AppointmentStatus =
  | 'requested'
  | 'confirmed'
  | 'checked_in'
  | 'in_service'
  | 'completed'
  | 'cancelled'
  | 'no_show'
  | 'scheduled'

export interface Appointment {
  id: string
  title: string
  clientId: string | null
  vehicleId: string | null
  employeeId: string | null
  serviceAdvisorId: string | null
  appointmentTypeId: string | null
  customerConcern: string
  date: string
  startTime: string
  endTime: string
  location: string
  notes: string
  status: AppointmentStatus
  createdBy: string
  updatedBy: string
  createdAt: string
  updatedAt: string
}

export type DocumentCategory =
  | 'general'
  | 'contract'
  | 'invoice'
  | 'correspondence'
  | 'receipt'
  | 'inspection'
  | 'estimate'
  | 'repair'
  | 'vehicle'
  | 'customer'
  | 'supplier'
  | 'employee'
  | 'other'

export interface DocumentRecord {
  id: string
  name: string
  category: DocumentCategory
  mimeType: string
  sizeBytes: number
  dataUrl: string
  clientId: string | null
  projectId: string | null
  vehicleId: string | null
  repairOrderId: string | null
  estimateId: string | null
  inspectionId: string | null
  uploadedBy: string
  createdAt: string
  archivedAt: string | null
}

export type NotificationType =
  | 'task_assigned'
  | 'task_due'
  | 'appointment_upcoming'
  | 'client_update'
  | 'project_update'
  | 'approval_required'
  | 'estimate_approved'
  | 'vehicle_ready'
  | 'technician_assigned'
  | 'part_needed'
  | 'low_inventory'
  | 'schedule_change'
  | 'repair_update'
  | 'system'

export interface AppNotification {
  id: string
  type: NotificationType
  title: string
  body: string
  recipientId: string
  relatedType: string | null
  relatedId: string | null
  readAt: string | null
  createdAt: string
}

export interface Activity {
  id: string
  eventType: string
  description: string
  actorId: string
  relatedType: string | null
  relatedId: string | null
  createdAt: string
}

export interface CompanySettings {
  name: string
  email: string
  phone: string
  website: string
  address: string
  taxRate: number
  defaultLaborRate: number
  paymentNote: string
  notificationPreferences: {
    taskAssigned: boolean
    taskDue: boolean
    appointmentUpcoming: boolean
    recordUpdates: boolean
    approvalRequired: boolean
    estimateApproved: boolean
    vehicleReady: boolean
    lowInventory: boolean
    technicianAssigned: boolean
    scheduleChange: boolean
  }
}

export interface TagOption {
  id: string
  name: string
}

export type LookupList =
  | 'staff_position'
  | 'appointment_type'
  | 'service_category'
  | 'inspection_category'
  | 'parts_category'

export interface LookupOption {
  id: string
  list: LookupList
  key: string
  label: string
  sortOrder: number
  active: boolean
}

export type VehicleStatus = 'active' | 'in_shop' | 'awaiting_approval' | 'ready_for_pickup' | 'inactive'

export interface Vehicle {
  id: string
  customerId: string
  vin: string
  year: number
  make: string
  model: string
  trim: string
  mileage: number
  licensePlate: string
  color: string
  notes: string
  status: VehicleStatus
  createdBy: string
  updatedBy: string
  createdAt: string
  updatedAt: string
}

export type RepairOrderStatus =
  | 'draft'
  | 'checked_in'
  | 'diagnosing'
  | 'awaiting_approval'
  | 'approved'
  | 'in_progress'
  | 'waiting_for_parts'
  | 'quality_check'
  | 'ready_for_pickup'
  | 'completed'
  | 'cancelled'

export interface RepairOrder {
  id: string
  number: string
  customerId: string
  vehicleId: string
  mileage: number
  serviceAdvisorId: string | null
  technicianId: string | null
  openedAt: string
  estimatedCompletion: string | null
  completedAt: string | null
  customerConcern: string
  diagnosis: string
  recommendedWork: string
  approvedWork: string
  declinedWork: string
  notes: string
  status: RepairOrderStatus
  discount: number
  taxRate: number
  createdBy: string
  updatedBy: string
  createdAt: string
  updatedAt: string
}

export type LineKind = 'labor' | 'part' | 'fee' | 'service'

export interface RepairOrderItem {
  id: string
  repairOrderId: string
  kind: LineKind
  description: string
  serviceId: string | null
  partId: string | null
  quantity: number
  unitCost: number
  unitPrice: number
  hours: number
  approved: boolean
  declined: boolean
  technicianId: string | null
}

export type EstimateStatus = 'draft' | 'sent' | 'pending_approval' | 'approved' | 'declined' | 'expired'

export interface Estimate {
  id: string
  number: string
  customerId: string
  vehicleId: string
  repairOrderId: string | null
  notes: string
  status: EstimateStatus
  discount: number
  taxRate: number
  expiresAt: string | null
  createdBy: string
  updatedBy: string
  createdAt: string
  updatedAt: string
}

export interface EstimateItem {
  id: string
  estimateId: string
  kind: LineKind
  description: string
  serviceId: string | null
  partId: string | null
  quantity: number
  unitCost: number
  unitPrice: number
  hours: number
}

export type InspectionResult = 'good' | 'attention' | 'recommended' | 'urgent' | 'na'

export interface Inspection {
  id: string
  number: string
  customerId: string
  vehicleId: string
  repairOrderId: string | null
  technicianId: string | null
  mileage: number
  notes: string
  recommendations: string
  status: 'in_progress' | 'completed'
  createdBy: string
  updatedBy: string
  createdAt: string
  updatedAt: string
}

export interface InspectionItem {
  id: string
  inspectionId: string
  categoryId: string
  result: InspectionResult
  measurement: string
  notes: string
  recommendation: string
}

export interface ServiceCatalogItem {
  id: string
  name: string
  categoryId: string | null
  defaultHours: number
  defaultPrice: number
  active: boolean
}

export type PartKind = 'part' | 'supply'

export interface Part {
  id: string
  name: string
  partNumber: string
  description: string
  supplierId: string | null
  categoryId: string | null
  kind: PartKind
  cost: number
  price: number
  quantity: number
  minQuantity: number
  unit: string
  location: string
  compatibility: string
  active: boolean
}

export interface Supplier {
  id: string
  name: string
  phone: string
  email: string
  notes: string
}

export type InventoryTxnType = 'receiving' | 'usage' | 'adjustment' | 'return' | 'waste'

export interface InventoryTransaction {
  id: string
  partId: string
  type: InventoryTxnType
  quantity: number
  note: string
  repairOrderId: string | null
  createdBy: string
  createdAt: string
}

export interface TechnicianAssignment {
  id: string
  technicianId: string
  repairOrderId: string
  vehicleId: string
  priority: TaskPriority
  createdAt: string
}

export type ShiftStatus = 'scheduled' | 'available' | 'time_off'

export interface Shift {
  id: string
  employeeId: string
  date: string
  startTime: string
  endTime: string
  label: string
  status: ShiftStatus
  notes: string
}

export type PaymentStatus = 'unpaid' | 'partial' | 'paid' | 'refunded'
export type PaymentMethod = 'cash' | 'card' | 'check' | 'other'

export interface Payment {
  id: string
  repairOrderId: string
  method: PaymentMethod
  amount: number
  status: 'recorded' | 'refunded'
  note: string
  createdBy: string
  createdAt: string
}

export type CommunicationType =
  | 'note'
  | 'call'
  | 'message'
  | 'approval_request'
  | 'appointment'
  | 'repair_update'
  | 'pickup'

export interface CustomerCommunication {
  id: string
  customerId: string
  vehicleId: string | null
  repairOrderId: string | null
  type: CommunicationType
  subject: string
  body: string
  createdBy: string
  createdAt: string
}

export interface AppState {
  roles: Role[]
  permissions: Permission[]
  rolePermissions: RolePermission[]
  profiles: Profile[]
  credentials: Credential[]
  clients: Client[]
  clientContacts: ClientContact[]
  statuses: StatusOption[]
  projects: Project[]
  projectMembers: ProjectMember[]
  tasks: Task[]
  appointments: Appointment[]
  documents: DocumentRecord[]
  notifications: AppNotification[]
  activities: Activity[]
  tags: TagOption[]
  lookups: LookupOption[]
  company: CompanySettings
  vehicles: Vehicle[]
  repairOrders: RepairOrder[]
  repairOrderItems: RepairOrderItem[]
  estimates: Estimate[]
  estimateItems: EstimateItem[]
  inspections: Inspection[]
  inspectionItems: InspectionItem[]
  services: ServiceCatalogItem[]
  parts: Part[]
  suppliers: Supplier[]
  inventoryTransactions: InventoryTransaction[]
  technicianAssignments: TechnicianAssignment[]
  shifts: Shift[]
  payments: Payment[]
  communications: CustomerCommunication[]
}

export interface Session {
  profileId: string
  email: string
}

export interface ListQuery {
  search?: string
  page?: number
  pageSize?: number
  status?: string
  assignedEmployeeId?: string
  includeArchived?: boolean
  customerId?: string
  vehicleId?: string
  technicianId?: string
  advisorId?: string
}

export interface PagedResult<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

export interface LineTotals {
  labor: number
  parts: number
  fees: number
  subtotal: number
  discount: number
  tax: number
  total: number
}
