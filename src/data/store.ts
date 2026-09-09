import type {
  Activity,
  AppNotification,
  Appointment,
  AppState,
  Client,
  ClientContact,
  CustomerCommunication,
  DocumentRecord,
  Estimate,
  EstimateItem,
  Inspection,
  InspectionItem,
  InventoryTransaction,
  ListQuery,
  LookupOption,
  NotificationType,
  PagedResult,
  Part,
  Payment,
  Profile,
  Project,
  RepairOrder,
  RepairOrderItem,
  RepairOrderStatus,
  ServiceCatalogItem,
  Session,
  Shift,
  Supplier,
  Task,
  Vehicle,
} from '../types/domain'
import {
  IN_SHOP_STATUSES,
  OPEN_REPAIR_STATUSES,
  WORKING_STATUSES,
  isPendingEstimate,
  paymentBalance,
  repairOrderTotals,
  vehicleLabel,
} from '../lib/autoshop'
import { can } from '../lib/permissions'
import { hashPassword, matchesSearch, newId, nowIso, paginate } from '../lib/validation'
import { createSeedState } from './seed'

const STATE_KEY = 'bc.bayline.state.v1'
const SESSION_KEY = 'bc.bayline.session.v1'

function clone<T>(value: T): T {
  return structuredClone(value)
}

function applyQuery<T>(
  items: T[],
  query: ListQuery | undefined,
  toSearch: (item: T) => string,
  statusOf?: (item: T) => string | null,
  assignedOf?: (item: T) => string | null,
  archivedOf?: (item: T) => string | null,
): PagedResult<T> {
  const search = query?.search ?? ''
  const page = query?.page ?? 1
  const pageSize = query?.pageSize ?? 10
  let next = items.filter((item) => matchesSearch(toSearch(item), search))
  if (query?.status && statusOf) next = next.filter((item) => statusOf(item) === query.status)
  if (query?.assignedEmployeeId && assignedOf) next = next.filter((item) => assignedOf(item) === query.assignedEmployeeId)
  if (!query?.includeArchived && archivedOf) next = next.filter((item) => !archivedOf(item))
  return paginate(next, page, pageSize)
}

function nextNumber(prefix: string, values: string[]) {
  const max = values.reduce((current, value) => {
    const match = value.match(/(\d+)$/)
    return match ? Math.max(current, Number(match[1])) : current
  }, 1000)
  return `${prefix}-${max + 1}`
}

export class AppStore {
  state: AppState
  session: Session | null
  error: string | null = null
  private persistEnabled: boolean

  constructor(initial?: AppState, session?: Session | null, persist = false) {
    this.state = initial ? clone(initial) : createSeedState()
    this.session = session ?? null
    this.persistEnabled = persist
  }

  static load(): AppStore {
    try {
      const raw = localStorage.getItem(STATE_KEY)
      const sessionRaw = localStorage.getItem(SESSION_KEY)
      const state = raw ? (JSON.parse(raw) as AppState) : createSeedState()
      const session = sessionRaw ? (JSON.parse(sessionRaw) as Session) : null
      return new AppStore(state, session, true)
    } catch {
      return new AppStore(createSeedState(), null, true)
    }
  }

  persist() {
    if (!this.persistEnabled) return
    localStorage.setItem(STATE_KEY, JSON.stringify(this.state))
    if (this.session) localStorage.setItem(SESSION_KEY, JSON.stringify(this.session))
    else localStorage.removeItem(SESSION_KEY)
  }

  snapshot(): AppState {
    return clone(this.state)
  }

  currentProfile(): Profile | null {
    if (!this.session) return null
    return this.state.profiles.find((profile) => profile.id === this.session?.profileId) ?? null
  }

  assert(module: Parameters<typeof can>[2], action: Parameters<typeof can>[3]) {
    if (!can(this.state, this.currentProfile(), module, action)) {
      throw new Error('You do not have permission to perform this action.')
    }
  }

  private actorId() {
    return this.currentProfile()?.id ?? 'system'
  }

  private log(eventType: string, description: string, relatedType: string | null, relatedId: string | null) {
    const activity: Activity = {
      id: newId(),
      eventType,
      description,
      actorId: this.actorId(),
      relatedType,
      relatedId,
      createdAt: nowIso(),
    }
    this.state.activities = [activity, ...this.state.activities]
  }

  private notify(
    type: NotificationType,
    title: string,
    body: string,
    recipientId: string | null,
    relatedType: string | null,
    relatedId: string | null,
  ) {
    if (!recipientId) return
    const prefs = this.state.company.notificationPreferences
    if (type === 'task_assigned' && !prefs.taskAssigned) return
    if (type === 'task_due' && !prefs.taskDue) return
    if (type === 'appointment_upcoming' && !prefs.appointmentUpcoming) return
    if ((type === 'client_update' || type === 'project_update' || type === 'repair_update') && !prefs.recordUpdates) return
    if (type === 'approval_required' && !prefs.approvalRequired) return
    if (type === 'estimate_approved' && !prefs.estimateApproved) return
    if (type === 'vehicle_ready' && !prefs.vehicleReady) return
    if (type === 'low_inventory' && !prefs.lowInventory) return
    if (type === 'technician_assigned' && !prefs.technicianAssigned) return
    if (type === 'schedule_change' && !prefs.scheduleChange) return
    const notification: AppNotification = {
      id: newId(),
      type,
      title,
      body,
      recipientId,
      relatedType,
      relatedId,
      readAt: null,
      createdAt: nowIso(),
    }
    this.state.notifications = [notification, ...this.state.notifications]
  }

  notifyManagers(type: NotificationType, title: string, body: string, relatedType: string | null, relatedId: string | null) {
    const managerRoles = this.state.roles.filter((role) => ['administrator', 'manager', 'service_advisor'].includes(role.key))
    const recipients = this.state.profiles.filter((profile) => profile.status === 'active' && managerRoles.some((role) => role.id === profile.roleId))
    recipients.forEach((profile) => this.notify(type, title, body, profile.id, relatedType, relatedId))
  }

  async login(email: string, password: string): Promise<Session> {
    const normalized = email.trim().toLowerCase()
    const credential = this.state.credentials.find((row) => row.email === normalized)
    const profile = this.state.profiles.find((row) => row.email === normalized)
    if (!credential || !profile) throw new Error('Invalid email or password.')
    if (profile.status !== 'active') throw new Error('This account is inactive.')
    const hash = await hashPassword(password)
    if (hash !== credential.passwordHash) throw new Error('Invalid email or password.')
    this.session = { profileId: profile.id, email: profile.email }
    this.persist()
    return this.session
  }

  logout() {
    this.session = null
    this.persist()
  }

  async requestPasswordReset(email: string): Promise<{ token?: string }> {
    const normalized = email.trim().toLowerCase()
    const credential = this.state.credentials.find((row) => row.email === normalized)
    if (!credential) return {}
    const token = newId()
    credential.resetToken = token
    credential.resetTokenExpiresAt = new Date(Date.now() + 1000 * 60 * 60).toISOString()
    this.persist()
    return { token }
  }

  async resetPassword(token: string, password: string) {
    const credential = this.state.credentials.find((row) => row.resetToken === token)
    if (!credential || !credential.resetTokenExpiresAt) throw new Error('This reset link is invalid.')
    if (new Date(credential.resetTokenExpiresAt).getTime() < Date.now()) {
      throw new Error('This reset link has expired.')
    }
    credential.passwordHash = await hashPassword(password)
    credential.resetToken = null
    credential.resetTokenExpiresAt = null
    this.persist()
  }

  listUsers(query?: ListQuery) {
    this.assert('users', 'view')
    return applyQuery(this.state.profiles, query, (item) => `${item.fullName} ${item.email} ${item.title}`, (item) => item.status)
  }

  getUser(id: string) {
    this.assert('users', 'view')
    return this.state.profiles.find((profile) => profile.id === id) ?? null
  }

  async upsertUser(input: Omit<Profile, 'createdAt' | 'updatedAt'> & { createdAt?: string; password?: string; positionId?: string | null }) {
    const existing = this.state.profiles.find((profile) => profile.id === input.id)
    if (existing) this.assert('users', 'edit')
    else this.assert('users', 'create')
    const now = nowIso()
    const profile: Profile = {
      id: input.id,
      email: input.email.trim().toLowerCase(),
      fullName: input.fullName.trim(),
      phone: input.phone,
      title: input.title,
      positionId: input.positionId ?? existing?.positionId ?? null,
      roleId: input.roleId,
      status: input.status,
      notes: input.notes,
      createdAt: existing?.createdAt ?? input.createdAt ?? now,
      updatedAt: now,
    }
    this.state.profiles = existing
      ? this.state.profiles.map((row) => (row.id === profile.id ? profile : row))
      : [...this.state.profiles, profile]
    const credential = this.state.credentials.find((row) => row.profileId === profile.id)
    if (!credential) {
      this.state.credentials.push({
        profileId: profile.id,
        email: profile.email,
        passwordHash: '',
        resetToken: null,
        resetTokenExpiresAt: null,
      })
    }
    const target = this.state.credentials.find((row) => row.profileId === profile.id)!
    target.email = profile.email
    if (input.password) target.passwordHash = await hashPassword(input.password)
    else if (!existing) throw new Error('A temporary password is required for new users.')
    this.log(existing ? 'user_updated' : 'user_created', `User ${existing ? 'updated' : 'created'}: ${profile.fullName}`, 'user', profile.id)
    this.persist()
    return profile
  }

  async setUserPassword(profileId: string, password: string) {
    const credential = this.state.credentials.find((row) => row.profileId === profileId)
    if (!credential) throw new Error('User credential was not found.')
    credential.passwordHash = await hashPassword(password)
    this.persist()
  }

  setUserStatus(id: string, status: Profile['status']) {
    this.assert('users', 'edit')
    const profile = this.state.profiles.find((row) => row.id === id)
    if (!profile) throw new Error('User was not found.')
    profile.status = status
    profile.updatedAt = nowIso()
    this.log('user_status_changed', `User status changed: ${profile.fullName} → ${status}`, 'user', profile.id)
    this.persist()
  }

  technicians() {
    const techRoles = this.state.roles.filter((role) => ['technician', 'staff'].includes(role.key) || role.name.toLowerCase().includes('technician'))
    const byPosition = this.state.lookups.filter((row) => row.list === 'staff_position' && ['technician', 'mechanic'].includes(row.key)).map((row) => row.id)
    return this.state.profiles.filter((profile) =>
      profile.status === 'active' && (techRoles.some((role) => role.id === profile.roleId) || (profile.positionId && byPosition.includes(profile.positionId))),
    )
  }

  listClients(query?: ListQuery) {
    this.assert('clients', 'view')
    return applyQuery(
      this.state.clients,
      query,
      (item) => `${item.displayName} ${item.legalName} ${item.email} ${item.phone} ${item.tags.join(' ')}`,
      (item) => item.status,
      (item) => item.assignedEmployeeId,
      (item) => item.archivedAt,
    )
  }

  getClient(id: string) {
    this.assert('clients', 'view')
    return this.state.clients.find((row) => row.id === id) ?? null
  }

  saveClient(input: Omit<Client, 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy' | 'archivedAt'> & Partial<Client>) {
    const existing = this.state.clients.find((row) => row.id === input.id)
    if (existing) this.assert('clients', 'edit')
    else this.assert('clients', 'create')
    const now = nowIso()
    const client: Client = {
      id: input.id,
      type: input.type,
      displayName: input.displayName.trim(),
      legalName: input.legalName.trim() || input.displayName.trim(),
      email: input.email.trim(),
      phone: input.phone,
      addressLine1: input.addressLine1,
      addressLine2: input.addressLine2,
      city: input.city,
      region: input.region,
      postalCode: input.postalCode,
      country: input.country,
      status: input.status,
      notes: input.notes,
      tags: input.tags,
      assignedEmployeeId: input.assignedEmployeeId,
      createdBy: existing?.createdBy ?? this.actorId(),
      updatedBy: this.actorId(),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      archivedAt: input.status === 'archived' ? existing?.archivedAt ?? now : null,
    }
    this.state.clients = existing
      ? this.state.clients.map((row) => (row.id === client.id ? client : row))
      : [...this.state.clients, client]
    this.log(existing ? 'customer_updated' : 'customer_created', `Customer ${existing ? 'updated' : 'created'}: ${client.displayName}`, 'customer', client.id)
    if (existing) this.notify('client_update', 'Customer update', `${client.displayName} was updated.`, client.assignedEmployeeId, 'customer', client.id)
    this.persist()
    return client
  }

  archiveClient(id: string) {
    this.assert('clients', 'archive')
    const client = this.state.clients.find((row) => row.id === id)
    if (!client) throw new Error('Customer was not found.')
    client.status = 'archived'
    client.archivedAt = nowIso()
    client.updatedAt = nowIso()
    client.updatedBy = this.actorId()
    this.log('customer_archived', `Customer archived: ${client.displayName}`, 'customer', client.id)
    this.persist()
  }

  saveContact(contact: ClientContact) {
    this.assert('clients', 'edit')
    const existing = this.state.clientContacts.find((row) => row.id === contact.id)
    this.state.clientContacts = existing
      ? this.state.clientContacts.map((row) => (row.id === contact.id ? contact : row))
      : [...this.state.clientContacts, contact]
    this.persist()
    return contact
  }

  listProjects(query?: ListQuery) {
    this.assert('projects', 'view')
    return applyQuery(this.state.projects, query, (item) => item.name, (item) => item.status, undefined, (item) => item.archivedAt)
  }

  saveProject(input: Omit<Project, 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy' | 'archivedAt'> & Partial<Project>, memberIds: string[]) {
    const existing = this.state.projects.find((row) => row.id === input.id)
    if (existing) this.assert('projects', 'edit')
    else this.assert('projects', 'create')
    const now = nowIso()
    const project: Project = {
      id: input.id,
      name: input.name.trim(),
      clientId: input.clientId,
      status: input.status,
      startDate: input.startDate,
      endDate: input.endDate,
      notes: input.notes,
      createdBy: existing?.createdBy ?? this.actorId(),
      updatedBy: this.actorId(),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      archivedAt: input.status === 'archived' ? existing?.archivedAt ?? now : null,
    }
    this.state.projects = existing
      ? this.state.projects.map((row) => (row.id === project.id ? project : row))
      : [...this.state.projects, project]
    this.state.projectMembers = [
      ...this.state.projectMembers.filter((row) => row.projectId !== project.id),
      ...memberIds.map((profileId) => ({ projectId: project.id, profileId })),
    ]
    this.log(existing ? 'project_updated' : 'project_created', `Project ${existing ? 'updated' : 'created'}: ${project.name}`, 'project', project.id)
    this.notify('project_update', 'Project update', `${project.name} was ${existing ? 'updated' : 'created'}.`, memberIds[0] ?? this.actorId(), 'project', project.id)
    this.persist()
    return project
  }

  archiveProject(id: string) {
    this.assert('projects', 'archive')
    const project = this.state.projects.find((row) => row.id === id)
    if (!project) throw new Error('Project was not found.')
    project.status = 'archived'
    project.archivedAt = nowIso()
    project.updatedAt = nowIso()
    this.log('project_archived', `Project archived: ${project.name}`, 'project', project.id)
    this.persist()
  }

  listTasks(query?: ListQuery) {
    this.assert('tasks', 'view')
    return applyQuery(
      this.state.tasks,
      query,
      (item) => `${item.title} ${item.description}`,
      (item) => item.status,
      (item) => item.assignedEmployeeId,
      (item) => item.archivedAt,
    )
  }

  saveTask(input: Omit<Task, 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy' | 'completedAt' | 'archivedAt'> & Partial<Task>) {
    const existing = this.state.tasks.find((row) => row.id === input.id)
    if (existing) this.assert('tasks', 'edit')
    else this.assert('tasks', 'create')
    const now = nowIso()
    const completedAt = input.status === 'completed' ? existing?.completedAt ?? input.completedAt ?? now : null
    const task: Task = {
      id: input.id,
      title: input.title.trim(),
      description: input.description,
      status: input.status,
      priority: input.priority,
      assignedEmployeeId: input.assignedEmployeeId,
      clientId: input.clientId,
      projectId: input.projectId ?? null,
      vehicleId: input.vehicleId ?? existing?.vehicleId ?? null,
      repairOrderId: input.repairOrderId ?? existing?.repairOrderId ?? null,
      dueDate: input.dueDate,
      completedAt,
      createdBy: existing?.createdBy ?? this.actorId(),
      updatedBy: this.actorId(),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      archivedAt: existing?.archivedAt ?? null,
    }
    this.state.tasks = existing
      ? this.state.tasks.map((row) => (row.id === task.id ? task : row))
      : [...this.state.tasks, task]
    if (!existing) this.log('task_created', `Task created: ${task.title}`, 'task', task.id)
    else if (task.status === 'completed' && existing.status !== 'completed') this.log('task_completed', `Task completed: ${task.title}`, 'task', task.id)
    else if (existing.status !== task.status) this.log('status_changed', `Task status changed: ${task.title} → ${task.status}`, 'task', task.id)
    else this.log('task_updated', `Task updated: ${task.title}`, 'task', task.id)
    if (!existing || existing.assignedEmployeeId !== task.assignedEmployeeId) {
      this.notify('task_assigned', 'Task assigned', `${task.title} was assigned.`, task.assignedEmployeeId, 'task', task.id)
    }
    this.persist()
    return task
  }

  archiveTask(id: string) {
    this.assert('tasks', 'archive')
    const task = this.state.tasks.find((row) => row.id === id)
    if (!task) throw new Error('Task was not found.')
    task.archivedAt = nowIso()
    this.log('task_archived', `Task archived: ${task.title}`, 'task', task.id)
    this.persist()
  }

  listAppointments(query?: ListQuery) {
    this.assert('appointments', 'view')
    let items = this.state.appointments
    if (query?.customerId) items = items.filter((row) => row.clientId === query.customerId)
    if (query?.vehicleId) items = items.filter((row) => row.vehicleId === query.vehicleId)
    return applyQuery(
      items,
      query,
      (item) => {
        const customer = this.state.clients.find((row) => row.id === item.clientId)
        const vehicle = this.state.vehicles.find((row) => row.id === item.vehicleId)
        return `${item.title} ${item.location} ${item.customerConcern} ${customer?.displayName ?? ''} ${vehicle ? vehicleLabel(vehicle) : ''} ${vehicle?.vin ?? ''} ${vehicle?.licensePlate ?? ''}`
      },
      (item) => item.status,
      (item) => item.employeeId,
    )
  }

  saveAppointment(input: Omit<Appointment, 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'> & Partial<Appointment>) {
    const existing = this.state.appointments.find((row) => row.id === input.id)
    if (existing) this.assert('appointments', 'edit')
    else this.assert('appointments', 'create')
    const now = nowIso()
    const appointment: Appointment = {
      id: input.id,
      title: input.title.trim(),
      clientId: input.clientId,
      vehicleId: input.vehicleId ?? existing?.vehicleId ?? null,
      employeeId: input.employeeId,
      serviceAdvisorId: input.serviceAdvisorId ?? existing?.serviceAdvisorId ?? null,
      appointmentTypeId: input.appointmentTypeId ?? existing?.appointmentTypeId ?? null,
      customerConcern: input.customerConcern ?? existing?.customerConcern ?? '',
      date: input.date,
      startTime: input.startTime,
      endTime: input.endTime,
      location: input.location,
      notes: input.notes,
      status: input.status === 'scheduled' ? 'confirmed' : input.status,
      createdBy: existing?.createdBy ?? this.actorId(),
      updatedBy: this.actorId(),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    }
    this.state.appointments = existing
      ? this.state.appointments.map((row) => (row.id === appointment.id ? appointment : row))
      : [...this.state.appointments, appointment]
    this.log(existing ? 'appointment_updated' : 'appointment_created', `Appointment ${existing ? 'updated' : 'created'}: ${appointment.title}`, 'appointment', appointment.id)
    this.notify('appointment_upcoming', 'Appointment saved', `${appointment.title} on ${appointment.date}`, appointment.employeeId, 'appointment', appointment.id)
    this.persist()
    return appointment
  }

  cancelAppointment(id: string) {
    this.assert('appointments', 'edit')
    const appointment = this.state.appointments.find((row) => row.id === id)
    if (!appointment) throw new Error('Appointment was not found.')
    appointment.status = 'cancelled'
    appointment.updatedAt = nowIso()
    this.log('appointment_cancelled', `Appointment cancelled: ${appointment.title}`, 'appointment', appointment.id)
    this.persist()
  }

  checkInAppointment(id: string) {
    this.assert('appointments', 'edit')
    const appointment = this.state.appointments.find((row) => row.id === id)
    if (!appointment) throw new Error('Appointment was not found.')
    appointment.status = 'checked_in'
    appointment.updatedAt = nowIso()
    if (appointment.vehicleId) {
      const vehicle = this.state.vehicles.find((row) => row.id === appointment.vehicleId)
      if (vehicle) vehicle.status = 'in_shop'
    }
    this.log('appointment_checked_in', `Vehicle checked in: ${appointment.title}`, 'appointment', appointment.id)
    this.persist()
    return appointment
  }

  saveDocument(doc: Omit<DocumentRecord, 'createdAt' | 'archivedAt' | 'uploadedBy'> & Partial<DocumentRecord>) {
    const existing = this.state.documents.find((row) => row.id === doc.id)
    if (existing) this.assert('documents', 'edit')
    else this.assert('documents', 'create')
    const record: DocumentRecord = {
      id: doc.id,
      name: doc.name,
      category: doc.category,
      mimeType: doc.mimeType,
      sizeBytes: doc.sizeBytes,
      dataUrl: doc.dataUrl,
      clientId: doc.clientId ?? null,
      projectId: doc.projectId ?? null,
      vehicleId: doc.vehicleId ?? existing?.vehicleId ?? null,
      repairOrderId: doc.repairOrderId ?? existing?.repairOrderId ?? null,
      estimateId: doc.estimateId ?? existing?.estimateId ?? null,
      inspectionId: doc.inspectionId ?? existing?.inspectionId ?? null,
      uploadedBy: existing?.uploadedBy ?? this.actorId(),
      createdAt: existing?.createdAt ?? nowIso(),
      archivedAt: existing?.archivedAt ?? null,
    }
    this.state.documents = existing
      ? this.state.documents.map((row) => (row.id === record.id ? record : row))
      : [...this.state.documents, record]
    this.log('document_uploaded', `Document uploaded: ${record.name}`, 'document', record.id)
    this.persist()
    return record
  }

  archiveDocument(id: string) {
    this.assert('documents', 'archive')
    const doc = this.state.documents.find((row) => row.id === id)
    if (!doc) throw new Error('Document was not found.')
    doc.archivedAt = nowIso()
    this.log('document_archived', `Document archived: ${doc.name}`, 'document', doc.id)
    this.persist()
  }

  markNotificationRead(id: string) {
    this.assert('notifications', 'edit')
    const notification = this.state.notifications.find((row) => row.id === id)
    if (!notification) return
    notification.readAt = nowIso()
    this.persist()
  }

  saveCompany(company: AppState['company']) {
    this.assert('settings', 'edit')
    this.state.company = company
    this.log('settings_updated', 'Shop settings updated', 'settings', 'company')
    this.persist()
  }

  saveRolePermissions(roleId: string, permissionIds: string[]) {
    this.assert('roles', 'manage')
    this.state.rolePermissions = [
      ...this.state.rolePermissions.filter((row) => row.roleId !== roleId),
      ...permissionIds.map((permissionId) => ({ roleId, permissionId })),
    ]
    this.log('roles_updated', 'Role permissions updated', 'role', roleId)
    this.persist()
  }

  addStatus(entity: AppState['statuses'][number]['entity'], key: string, label: string) {
    this.assert('settings', 'edit')
    this.state.statuses.push({
      id: newId(),
      entity,
      key,
      label,
      sortOrder: this.state.statuses.filter((row) => row.entity === entity).length + 1,
    })
    this.persist()
  }

  addTag(name: string) {
    this.assert('settings', 'edit')
    this.state.tags.push({ id: newId(), name })
    this.persist()
  }

  addLookup(list: LookupOption['list'], label: string) {
    this.assert('settings', 'edit')
    const key = label.toLowerCase().replace(/\s+/g, '_')
    this.state.lookups.push({
      id: newId(),
      list,
      key,
      label,
      sortOrder: this.state.lookups.filter((row) => row.list === list).length + 1,
      active: true,
    })
    this.log('settings_updated', `Lookup added: ${label}`, 'settings', list)
    this.persist()
  }

  listVehicles(query?: ListQuery) {
    this.assert('vehicles', 'view')
    let items = this.state.vehicles
    if (query?.customerId) items = items.filter((row) => row.customerId === query.customerId)
    return applyQuery(
      items,
      query,
      (item) => {
        const customer = this.state.clients.find((row) => row.id === item.customerId)
        return `${vehicleLabel(item)} ${item.vin} ${item.licensePlate} ${item.color} ${customer?.displayName ?? ''} ${customer?.phone ?? ''}`
      },
      (item) => item.status,
    )
  }

  getVehicle(id: string) {
    this.assert('vehicles', 'view')
    return this.state.vehicles.find((row) => row.id === id) ?? null
  }

  saveVehicle(input: Omit<Vehicle, 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'> & Partial<Vehicle>) {
    const existing = this.state.vehicles.find((row) => row.id === input.id)
    if (existing) this.assert('vehicles', 'edit')
    else this.assert('vehicles', 'create')
    if (!input.customerId) throw new Error('A customer is required for every vehicle.')
    const now = nowIso()
    const vehicle: Vehicle = {
      id: input.id,
      customerId: input.customerId,
      vin: input.vin.trim().toUpperCase(),
      year: Number(input.year) || new Date().getFullYear(),
      make: input.make.trim(),
      model: input.model.trim(),
      trim: input.trim,
      mileage: Number(input.mileage) || 0,
      licensePlate: input.licensePlate.trim().toUpperCase(),
      color: input.color,
      notes: input.notes,
      status: input.status,
      createdBy: existing?.createdBy ?? this.actorId(),
      updatedBy: this.actorId(),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    }
    this.state.vehicles = existing
      ? this.state.vehicles.map((row) => (row.id === vehicle.id ? vehicle : row))
      : [...this.state.vehicles, vehicle]
    this.log(existing ? 'vehicle_updated' : 'vehicle_added', `Vehicle ${existing ? 'updated' : 'added'}: ${vehicleLabel(vehicle)}`, 'vehicle', vehicle.id)
    this.persist()
    return vehicle
  }

  vehicleHistory(vehicleId: string) {
    this.assert('vehicles', 'view')
    const orders = this.state.repairOrders.filter((row) => row.vehicleId === vehicleId)
    return orders.map((order) => ({
      order,
      items: this.state.repairOrderItems.filter((item) => item.repairOrderId === order.id),
      inspections: this.state.inspections.filter((item) => item.vehicleId === vehicleId && item.repairOrderId === order.id),
      payments: this.state.payments.filter((item) => item.repairOrderId === order.id),
    }))
  }

  listRepairOrders(query?: ListQuery) {
    this.assert('repair_orders', 'view')
    let items = this.state.repairOrders
    if (query?.customerId) items = items.filter((row) => row.customerId === query.customerId)
    if (query?.vehicleId) items = items.filter((row) => row.vehicleId === query.vehicleId)
    if (query?.technicianId) items = items.filter((row) => row.technicianId === query.technicianId)
    if (query?.advisorId) items = items.filter((row) => row.serviceAdvisorId === query.advisorId)
    return applyQuery(
      items,
      query,
      (item) => {
        const customer = this.state.clients.find((row) => row.id === item.customerId)
        const vehicle = this.state.vehicles.find((row) => row.id === item.vehicleId)
        return `${item.number} ${item.customerConcern} ${customer?.displayName ?? ''} ${vehicle ? vehicleLabel(vehicle) : ''} ${vehicle?.vin ?? ''} ${vehicle?.licensePlate ?? ''}`
      },
      (item) => item.status,
      (item) => item.technicianId,
    )
  }

  getRepairOrder(id: string) {
    this.assert('repair_orders', 'view')
    return this.state.repairOrders.find((row) => row.id === id) ?? null
  }

  saveRepairOrder(input: Partial<RepairOrder> & Pick<RepairOrder, 'id' | 'customerId' | 'vehicleId'>) {
    const existing = this.state.repairOrders.find((row) => row.id === input.id)
    if (existing) this.assert('repair_orders', 'edit')
    else this.assert('repair_orders', 'create')
    if (!input.customerId || !input.vehicleId) throw new Error('A customer and vehicle are required.')
    const now = nowIso()
    const order: RepairOrder = {
      id: input.id,
      number: existing?.number ?? input.number ?? nextNumber('RO', this.state.repairOrders.map((row) => row.number)),
      customerId: input.customerId,
      vehicleId: input.vehicleId,
      mileage: Number(input.mileage) || 0,
      serviceAdvisorId: input.serviceAdvisorId ?? null,
      technicianId: input.technicianId ?? null,
      openedAt: existing?.openedAt ?? input.openedAt ?? now,
      estimatedCompletion: input.estimatedCompletion ?? null,
      completedAt: input.status === 'completed' ? existing?.completedAt ?? now : input.completedAt ?? null,
      customerConcern: input.customerConcern ?? existing?.customerConcern ?? '',
      diagnosis: input.diagnosis ?? existing?.diagnosis ?? '',
      recommendedWork: input.recommendedWork ?? existing?.recommendedWork ?? '',
      approvedWork: input.approvedWork ?? existing?.approvedWork ?? '',
      declinedWork: input.declinedWork ?? existing?.declinedWork ?? '',
      notes: input.notes ?? existing?.notes ?? '',
      status: input.status ?? existing?.status ?? 'draft',
      discount: Number(input.discount) || 0,
      taxRate: input.taxRate ?? this.state.company.taxRate,
      createdBy: existing?.createdBy ?? this.actorId(),
      updatedBy: this.actorId(),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    }
    this.state.repairOrders = existing
      ? this.state.repairOrders.map((row) => (row.id === order.id ? order : row))
      : [...this.state.repairOrders, order]
    this.syncVehicleFromOrders(order.vehicleId)
    if (!existing) this.log('repair_order_created', `Repair order created: ${order.number}`, 'repair_order', order.id)
    else if (existing.status !== order.status) {
      this.log('repair_status_changed', `Repair status changed: ${order.number} → ${order.status}`, 'repair_order', order.id)
      this.notify('repair_update', 'Repair order updated', `${order.number} is now ${order.status.replace(/_/g, ' ')}.`, order.serviceAdvisorId, 'repair_order', order.id)
      if (order.status === 'awaiting_approval') {
        this.notifyManagers('approval_required', 'Customer approval required', `${order.number} is awaiting approval.`, 'repair_order', order.id)
      }
      if (order.status === 'ready_for_pickup') {
        this.notifyManagers('vehicle_ready', 'Vehicle ready for pickup', `${order.number} is ready for pickup.`, 'repair_order', order.id)
      }
    } else this.log('repair_order_updated', `Repair order updated: ${order.number}`, 'repair_order', order.id)
    if (!existing || existing.technicianId !== order.technicianId) {
      if (order.technicianId) {
        this.state.technicianAssignments = [
          ...this.state.technicianAssignments.filter((row) => !(row.repairOrderId === order.id && row.technicianId === order.technicianId)),
          { id: newId(), technicianId: order.technicianId, repairOrderId: order.id, vehicleId: order.vehicleId, priority: 'medium', createdAt: now },
        ]
        this.notify('technician_assigned', 'Technician assigned', `${order.number} was assigned.`, order.technicianId, 'repair_order', order.id)
        this.log('technician_assigned', `Technician assigned: ${this.state.profiles.find((row) => row.id === order.technicianId)?.fullName ?? ''} → ${order.number}`, 'repair_order', order.id)
      }
    }
    this.persist()
    return order
  }

  setRepairOrderStatus(id: string, status: RepairOrderStatus) {
    const order = this.getRepairOrder(id)
    if (!order) throw new Error('Repair order was not found.')
    return this.saveRepairOrder({ ...order, status })
  }

  saveRepairOrderItem(item: RepairOrderItem) {
    this.assert('repair_orders', 'edit')
    const existing = this.state.repairOrderItems.find((row) => row.id === item.id)
    this.state.repairOrderItems = existing
      ? this.state.repairOrderItems.map((row) => (row.id === item.id ? item : row))
      : [...this.state.repairOrderItems, item]
    if (item.kind === 'part' && item.partId && !existing) {
      this.adjustInventory(item.partId, 'usage', -Math.abs(item.quantity), `Used on repair order`, item.repairOrderId)
    }
    this.log('part_added', `${item.kind} added to repair order`, 'repair_order', item.repairOrderId)
    this.persist()
    return item
  }

  removeRepairOrderItem(id: string) {
    this.assert('repair_orders', 'edit')
    this.state.repairOrderItems = this.state.repairOrderItems.filter((row) => row.id !== id)
    this.persist()
  }

  listEstimates(query?: ListQuery) {
    this.assert('estimates', 'view')
    let items = this.state.estimates
    if (query?.customerId) items = items.filter((row) => row.customerId === query.customerId)
    if (query?.vehicleId) items = items.filter((row) => row.vehicleId === query.vehicleId)
    return applyQuery(items, query, (item) => `${item.number} ${item.notes}`, (item) => item.status)
  }

  saveEstimate(input: Omit<Estimate, 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy' | 'number'> & Partial<Estimate>) {
    const existing = this.state.estimates.find((row) => row.id === input.id)
    if (existing) this.assert('estimates', 'edit')
    else this.assert('estimates', 'create')
    const now = nowIso()
    const estimate: Estimate = {
      id: input.id,
      number: existing?.number ?? input.number ?? nextNumber('EST', this.state.estimates.map((row) => row.number)),
      customerId: input.customerId,
      vehicleId: input.vehicleId,
      repairOrderId: input.repairOrderId ?? null,
      notes: input.notes,
      status: input.status,
      discount: Number(input.discount) || 0,
      taxRate: input.taxRate ?? this.state.company.taxRate,
      expiresAt: input.expiresAt ?? null,
      createdBy: existing?.createdBy ?? this.actorId(),
      updatedBy: this.actorId(),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    }
    this.state.estimates = existing
      ? this.state.estimates.map((row) => (row.id === estimate.id ? estimate : row))
      : [...this.state.estimates, estimate]
    if (!existing) this.log('estimate_created', `Estimate created: ${estimate.number}`, 'estimate', estimate.id)
    else if (existing.status !== estimate.status && estimate.status === 'approved') {
      this.log('estimate_approved', `Estimate approved: ${estimate.number}`, 'estimate', estimate.id)
      this.notifyManagers('estimate_approved', 'Estimate approved', `${estimate.number} was approved.`, 'estimate', estimate.id)
    } else this.log('estimate_updated', `Estimate updated: ${estimate.number}`, 'estimate', estimate.id)
    if (estimate.status === 'pending_approval' || estimate.status === 'sent') {
      this.notifyManagers('approval_required', 'Estimate pending approval', `${estimate.number} is waiting on the customer.`, 'estimate', estimate.id)
    }
    this.persist()
    return estimate
  }

  saveEstimateItem(item: EstimateItem) {
    this.assert('estimates', 'edit')
    const existing = this.state.estimateItems.find((row) => row.id === item.id)
    this.state.estimateItems = existing
      ? this.state.estimateItems.map((row) => (row.id === item.id ? item : row))
      : [...this.state.estimateItems, item]
    this.persist()
    return item
  }

  convertEstimateToRepairOrder(estimateId: string, existingRepairOrderId?: string | null) {
    this.assert('repair_orders', 'create')
    const estimate = this.state.estimates.find((row) => row.id === estimateId)
    if (!estimate) throw new Error('Estimate was not found.')
    const items = this.state.estimateItems.filter((row) => row.estimateId === estimate.id)
    const vehicle = this.state.vehicles.find((row) => row.id === estimate.vehicleId)
    let order = existingRepairOrderId ? this.state.repairOrders.find((row) => row.id === existingRepairOrderId) : null
    if (!order) {
      order = this.saveRepairOrder({
        id: newId(),
        customerId: estimate.customerId,
        vehicleId: estimate.vehicleId,
        mileage: vehicle?.mileage ?? 0,
        serviceAdvisorId: this.actorId(),
        technicianId: null,
        openedAt: nowIso(),
        estimatedCompletion: null,
        completedAt: null,
        customerConcern: estimate.notes,
        diagnosis: '',
        recommendedWork: items.map((item) => item.description).join(', '),
        approvedWork: items.map((item) => item.description).join(', '),
        declinedWork: '',
        notes: `Converted from ${estimate.number}`,
        status: 'approved',
        discount: estimate.discount,
        taxRate: estimate.taxRate,
      })
    } else {
      order = this.saveRepairOrder({
        ...order,
        status: order.status === 'awaiting_approval' || order.status === 'draft' ? 'approved' : order.status,
        approvedWork: [order.approvedWork, items.map((item) => item.description).join(', ')].filter(Boolean).join('\n'),
      })
    }
    items.forEach((item) => {
      this.saveRepairOrderItem({
        id: newId(),
        repairOrderId: order!.id,
        kind: item.kind,
        description: item.description,
        serviceId: item.serviceId,
        partId: item.partId,
        quantity: item.quantity,
        unitCost: item.unitCost,
        unitPrice: item.unitPrice,
        hours: item.hours,
        approved: true,
        declined: false,
        technicianId: null,
      })
    })
    this.saveEstimate({ ...estimate, status: 'approved', repairOrderId: order.id })
    return order
  }

  listInspections(query?: ListQuery) {
    this.assert('inspections', 'view')
    let items = this.state.inspections
    if (query?.vehicleId) items = items.filter((row) => row.vehicleId === query.vehicleId)
    return applyQuery(items, query, (item) => `${item.number} ${item.notes} ${item.recommendations}`, (item) => item.status)
  }

  saveInspection(input: Omit<Inspection, 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy' | 'number'> & Partial<Inspection>) {
    const existing = this.state.inspections.find((row) => row.id === input.id)
    if (existing) this.assert('inspections', 'edit')
    else this.assert('inspections', 'create')
    const now = nowIso()
    const inspection: Inspection = {
      id: input.id,
      number: existing?.number ?? input.number ?? nextNumber('INS', this.state.inspections.map((row) => row.number)),
      customerId: input.customerId,
      vehicleId: input.vehicleId,
      repairOrderId: input.repairOrderId ?? null,
      technicianId: input.technicianId ?? null,
      mileage: Number(input.mileage) || 0,
      notes: input.notes,
      recommendations: input.recommendations,
      status: input.status,
      createdBy: existing?.createdBy ?? this.actorId(),
      updatedBy: this.actorId(),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    }
    this.state.inspections = existing
      ? this.state.inspections.map((row) => (row.id === inspection.id ? inspection : row))
      : [...this.state.inspections, inspection]
    this.log(inspection.status === 'completed' ? 'inspection_completed' : 'inspection_updated', `Inspection ${inspection.status}: ${inspection.number}`, 'inspection', inspection.id)
    this.persist()
    return inspection
  }

  saveInspectionItem(item: InspectionItem) {
    this.assert('inspections', 'edit')
    const existing = this.state.inspectionItems.find((row) => row.id === item.id)
    this.state.inspectionItems = existing
      ? this.state.inspectionItems.map((row) => (row.id === item.id ? item : row))
      : [...this.state.inspectionItems, item]
    this.persist()
    return item
  }

  saveService(service: ServiceCatalogItem) {
    this.assert('settings', 'edit')
    const existing = this.state.services.find((row) => row.id === service.id)
    this.state.services = existing
      ? this.state.services.map((row) => (row.id === service.id ? service : row))
      : [...this.state.services, service]
    this.persist()
    return service
  }

  listParts(query?: ListQuery) {
    this.assert('parts', 'view')
    return applyQuery(
      this.state.parts,
      query,
      (item) => `${item.name} ${item.partNumber} ${item.description} ${item.compatibility} ${item.location}`,
      (item) => (item.active ? 'active' : 'inactive'),
    )
  }

  savePart(part: Part) {
    const existing = this.state.parts.find((row) => row.id === part.id)
    if (existing) this.assert('parts', 'edit')
    else this.assert('parts', 'create')
    this.state.parts = existing
      ? this.state.parts.map((row) => (row.id === part.id ? part : row))
      : [...this.state.parts, part]
    this.log(existing ? 'part_updated' : 'part_created', `Part ${existing ? 'updated' : 'created'}: ${part.name}`, 'part', part.id)
    this.persist()
    return part
  }

  saveSupplier(supplier: Supplier) {
    this.assert('parts', 'edit')
    const existing = this.state.suppliers.find((row) => row.id === supplier.id)
    this.state.suppliers = existing
      ? this.state.suppliers.map((row) => (row.id === supplier.id ? supplier : row))
      : [...this.state.suppliers, supplier]
    this.persist()
    return supplier
  }

  adjustInventory(partId: string, type: InventoryTransaction['type'], quantity: number, note: string, repairOrderId: string | null = null) {
    this.assert(type === 'usage' ? 'inventory' : 'inventory', type === 'usage' ? 'view' : 'edit')
    const part = this.state.parts.find((row) => row.id === partId)
    if (!part) throw new Error('Part was not found.')
    if (type === 'usage' && !can(this.state, this.currentProfile(), 'repair_orders', 'edit') && !can(this.state, this.currentProfile(), 'inventory', 'edit')) {
      throw new Error('You do not have permission to perform this action.')
    }
    part.quantity = Number((part.quantity + quantity).toFixed(2))
    const txn: InventoryTransaction = {
      id: newId(),
      partId,
      type,
      quantity,
      note,
      repairOrderId,
      createdBy: this.actorId(),
      createdAt: nowIso(),
    }
    this.state.inventoryTransactions = [txn, ...this.state.inventoryTransactions]
    this.log('inventory_adjusted', `Inventory ${type}: ${part.name} (${quantity})`, 'part', part.id)
    if (part.quantity <= part.minQuantity) {
      this.notifyManagers('low_inventory', 'Low inventory', `${part.name} is at or below the minimum quantity.`, 'part', part.id)
    }
    this.persist()
    return part
  }

  receiveInventory(partId: string, quantity: number, note: string) {
    this.assert('inventory', 'edit')
    return this.adjustInventory(partId, 'receiving', Math.abs(quantity), note)
  }

  saveShift(shift: Shift) {
    const existing = this.state.shifts.find((row) => row.id === shift.id)
    if (existing) this.assert('scheduling', 'edit')
    else this.assert('scheduling', 'create')
    this.state.shifts = existing
      ? this.state.shifts.map((row) => (row.id === shift.id ? shift : row))
      : [...this.state.shifts, shift]
    this.log('schedule_changed', `Schedule ${existing ? 'updated' : 'created'} for ${this.state.profiles.find((row) => row.id === shift.employeeId)?.fullName ?? 'staff'}`, 'shift', shift.id)
    this.notify('schedule_change', 'Schedule change', `${shift.label} on ${shift.date}`, shift.employeeId, 'shift', shift.id)
    this.persist()
    return shift
  }

  savePayment(input: Omit<Payment, 'createdAt' | 'createdBy'> & Partial<Payment>) {
    this.assert('payments', 'create')
    const payment: Payment = {
      id: input.id,
      repairOrderId: input.repairOrderId,
      method: input.method,
      amount: Number(input.amount) || 0,
      status: input.status ?? 'recorded',
      note: input.note ?? '',
      createdBy: this.actorId(),
      createdAt: input.createdAt ?? nowIso(),
    }
    this.state.payments = [payment, ...this.state.payments]
    this.log('payment_recorded', `Payment recorded on repair order`, 'payment', payment.id)
    this.persist()
    return payment
  }

  saveCommunication(input: Omit<CustomerCommunication, 'createdAt' | 'createdBy'> & Partial<CustomerCommunication>) {
    this.assert('clients', 'edit')
    const row: CustomerCommunication = {
      id: input.id,
      customerId: input.customerId,
      vehicleId: input.vehicleId ?? null,
      repairOrderId: input.repairOrderId ?? null,
      type: input.type,
      subject: input.subject,
      body: input.body,
      createdBy: this.actorId(),
      createdAt: input.createdAt ?? nowIso(),
    }
    this.state.communications = [row, ...this.state.communications]
    this.log('communication_logged', `Communication logged: ${row.subject}`, 'communication', row.id)
    this.persist()
    return row
  }

  orderMoney(order: RepairOrder) {
    const totals = repairOrderTotals(order, this.state.repairOrderItems)
    const paid = this.state.payments
      .filter((row) => row.repairOrderId === order.id && row.status === 'recorded')
      .reduce((sum, row) => sum + row.amount, 0)
    return { ...totals, ...paymentBalance(totals.total, paid) }
  }

  private syncVehicleFromOrders(vehicleId: string) {
    const vehicle = this.state.vehicles.find((row) => row.id === vehicleId)
    if (!vehicle) return
    const open = this.state.repairOrders.filter((row) => row.vehicleId === vehicleId && OPEN_REPAIR_STATUSES.includes(row.status))
    if (open.some((row) => row.status === 'ready_for_pickup')) vehicle.status = 'ready_for_pickup'
    else if (open.some((row) => row.status === 'awaiting_approval')) vehicle.status = 'awaiting_approval'
    else if (open.some((row) => IN_SHOP_STATUSES.includes(row.status))) vehicle.status = 'in_shop'
    else if (vehicle.status !== 'inactive') vehicle.status = 'active'
  }

  shopDashboard() {
    this.assert('dashboard', 'view')
    const today = new Date().toISOString().slice(0, 10)
    const appointmentsToday = this.state.appointments.filter((row) => row.date === today && !['cancelled', 'no_show'].includes(row.status))
    const openOrders = this.state.repairOrders.filter((row) => OPEN_REPAIR_STATUSES.includes(row.status))
    const inShop = this.state.vehicles.filter((row) => ['in_shop', 'awaiting_approval', 'ready_for_pickup'].includes(row.status))
    const awaiting = openOrders.filter((row) => row.status === 'awaiting_approval')
    const ready = openOrders.filter((row) => row.status === 'ready_for_pickup')
    const working = openOrders.filter((row) => WORKING_STATUSES.includes(row.status))
    const pendingEstimates = this.state.estimates.filter((row) => isPendingEstimate(row.status))
    const lowStock = this.state.parts.filter((row) => row.active && row.quantity <= row.minQuantity)
    const workload = this.technicians().map((profile) => ({
      profile,
      jobs: openOrders.filter((row) => row.technicianId === profile.id),
      tasks: this.state.tasks.filter((row) => row.assignedEmployeeId === profile.id && !row.archivedAt && row.status !== 'completed'),
    }))
    return {
      appointmentsToday,
      inShop,
      openOrders,
      awaiting,
      ready,
      working,
      pendingEstimates,
      lowStock,
      workload,
      recentCustomers: [...this.state.clients].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 6),
      recentRepairs: [...this.state.repairOrders].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 6),
      notifications: this.state.notifications.filter((row) => row.recipientId === this.session?.profileId).slice(0, 6),
    }
  }

  globalSearch(term: string, limit = 8) {
    const q = term.trim()
    if (!q) {
      return { clients: [], users: [], projects: [], tasks: [], vehicles: [], repairOrders: [], appointments: [], parts: [], estimates: [] }
    }
    const take = <T,>(items: T[], test: (item: T) => boolean) => items.filter(test).slice(0, limit)
    return {
      clients: take(this.state.clients, (item) => matchesSearch(`${item.displayName} ${item.email} ${item.phone}`, q)),
      users: take(this.state.profiles, (item) => matchesSearch(`${item.fullName} ${item.email} ${item.title}`, q)),
      projects: take(this.state.projects, (item) => matchesSearch(item.name, q)),
      tasks: take(this.state.tasks, (item) => matchesSearch(item.title, q)),
      vehicles: take(this.state.vehicles, (item) => matchesSearch(`${vehicleLabel(item)} ${item.vin} ${item.licensePlate}`, q)),
      repairOrders: take(this.state.repairOrders, (item) => matchesSearch(`${item.number} ${item.customerConcern}`, q)),
      appointments: take(this.state.appointments, (item) => matchesSearch(item.title, q)),
      parts: take(this.state.parts, (item) => matchesSearch(`${item.name} ${item.partNumber}`, q)),
      estimates: take(this.state.estimates, (item) => matchesSearch(item.number, q)),
    }
  }

  reports(from?: string, to?: string) {
    this.assert('reports', 'view')
    const inRange = (iso: string) => {
      const day = iso.slice(0, 10)
      if (from && day < from) return false
      if (to && day > to) return false
      return true
    }
    const clients = this.state.clients.filter((row) => !row.archivedAt)
    const tasks = this.state.tasks.filter((row) => !row.archivedAt)
    const projects = this.state.projects.filter((row) => !row.archivedAt)
    const appointments = this.state.appointments.filter((row) => inRange(row.date))
    const orders = this.state.repairOrders.filter((row) => inRange(row.openedAt))
    const estimates = this.state.estimates.filter((row) => inRange(row.createdAt))
    const partsUsed = this.state.inventoryTransactions.filter((row) => row.type === 'usage' && inRange(row.createdAt))
    const workload = this.state.profiles.map((profile) => ({
      profile,
      openTasks: tasks.filter((task) => task.assignedEmployeeId === profile.id && task.status !== 'completed').length,
      projects: this.state.projectMembers.filter((row) => row.profileId === profile.id).length,
      appointments: appointments.filter((row) => row.employeeId === profile.id && !['cancelled', 'completed', 'no_show'].includes(row.status)).length,
      repairOrders: this.state.repairOrders.filter((row) => row.technicianId === profile.id && OPEN_REPAIR_STATUSES.includes(row.status)).length,
    }))
    return {
      clientCount: clients.length,
      activeClients: clients.filter((row) => row.status === 'active').length,
      projectCount: projects.length,
      openTasks: tasks.filter((row) => row.status !== 'completed').length,
      completedTasks: tasks.filter((row) => row.status === 'completed').length,
      upcomingAppointments: appointments.filter((row) => !['cancelled', 'completed', 'no_show'].includes(row.status)).length,
      projectsByStatus: projects.reduce<Record<string, number>>((acc, project) => {
        acc[project.status] = (acc[project.status] ?? 0) + 1
        return acc
      }, {}),
      repairOrdersByStatus: this.state.repairOrders.reduce<Record<string, number>>((acc, order) => {
        acc[order.status] = (acc[order.status] ?? 0) + 1
        return acc
      }, {}),
      appointmentCount: appointments.length,
      completedWork: orders.filter((row) => row.status === 'completed').length,
      estimateCount: estimates.length,
      approvedEstimates: estimates.filter((row) => row.status === 'approved').length,
      partsUsageCount: partsUsed.reduce((sum, row) => sum + Math.abs(row.quantity), 0),
      lowStock: this.state.parts.filter((row) => row.active && row.quantity <= row.minQuantity),
      vehicleCount: this.state.vehicles.length,
      openRepairOrders: this.state.repairOrders.filter((row) => OPEN_REPAIR_STATUSES.includes(row.status)).length,
      workload,
      recentActivity: this.state.activities.slice(0, 12),
    }
  }
}
