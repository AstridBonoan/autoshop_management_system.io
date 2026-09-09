import { describe, expect, it } from 'vitest'
import { AppStore } from './store'
import { createSeedState, IDS } from './seed'
import { newId } from '../lib/validation'
import { vehicleLabel } from '../lib/autoshop'

async function signedIn(email = 'admin@bcsoftware.demo') {
  const store = new AppStore(createSeedState())
  await store.login(email, 'demo123')
  return store
}

describe('customer → vehicle', () => {
  it('creates a customer, adds vehicles, and keeps history on the customer record', async () => {
    const store = await signedIn()
    const customer = store.saveClient({
      id: newId(),
      type: 'individual',
      displayName: 'Alex Rivera',
      legalName: 'Alex Rivera',
      email: 'alex@demo.mail',
      phone: '555-0999',
      addressLine1: '',
      addressLine2: '',
      city: '',
      region: '',
      postalCode: '',
      country: '',
      status: 'active',
      notes: '',
      tags: [],
      assignedEmployeeId: IDS.advisor,
    })
    const accord = store.saveVehicle({
      id: newId(),
      customerId: customer.id,
      vin: '1HGCM82633A004352',
      year: 2019,
      make: 'Honda',
      model: 'Accord',
      trim: 'Sport',
      mileage: 50000,
      licensePlate: 'OR-TEST1',
      color: 'Black',
      notes: '',
      status: 'active',
    })
    const f150 = store.saveVehicle({
      id: newId(),
      customerId: customer.id,
      vin: '1FTFW1ET4EFA12345',
      year: 2022,
      make: 'Ford',
      model: 'F-150',
      trim: 'XLT',
      mileage: 18000,
      licensePlate: 'OR-TEST2',
      color: 'White',
      notes: '',
      status: 'active',
    })
    const vehicles = store.listVehicles({ customerId: customer.id, pageSize: 20 }).items
    expect(vehicles.map((row) => row.id).sort()).toEqual([accord.id, f150.id].sort())
    expect(store.vehicleHistory(accord.id)).toEqual([])
    expect(store.state.activities.some((row) => row.eventType === 'vehicle_added' && row.relatedId === accord.id)).toBe(true)
  })
})

describe('appointment', () => {
  it('creates, confirms, and checks in a vehicle appointment', async () => {
    const store = await signedIn('advisor@bcsoftware.demo')
    const appointment = store.saveAppointment({
      id: newId(),
      title: 'Oil Change',
      clientId: IDS.custJohn,
      vehicleId: IDS.vehF150,
      employeeId: IDS.employee,
      serviceAdvisorId: IDS.advisor,
      appointmentTypeId: 'atype-oil',
      customerConcern: 'Due for oil',
      date: '2026-09-12',
      startTime: '09:00',
      endTime: '09:45',
      location: 'Express bay',
      notes: '',
      status: 'requested',
    })
    store.saveAppointment({ ...appointment, status: 'confirmed' })
    store.checkInAppointment(appointment.id)
    expect(store.state.appointments.find((row) => row.id === appointment.id)?.status).toBe('checked_in')
    expect(store.state.vehicles.find((row) => row.id === IDS.vehF150)?.status).toBe('in_shop')
  })
})

describe('repair workflow', () => {
  it('runs check-in through payment and close', async () => {
    const store = await signedIn()
    const order = store.saveRepairOrder({
      id: newId(),
      customerId: IDS.custJohn,
      vehicleId: IDS.vehF150,
      mileage: 22000,
      serviceAdvisorId: IDS.advisor,
      technicianId: IDS.technician2,
      openedAt: new Date().toISOString(),
      estimatedCompletion: '2026-09-10',
      completedAt: null,
      customerConcern: 'Noise under load',
      diagnosis: '',
      recommendedWork: '',
      approvedWork: '',
      declinedWork: '',
      notes: '',
      status: 'checked_in',
      discount: 0,
      taxRate: 8.5,
    })
    store.saveInspection({
      id: newId(),
      customerId: IDS.custJohn,
      vehicleId: IDS.vehF150,
      repairOrderId: order.id,
      technicianId: IDS.technician2,
      mileage: 22000,
      notes: 'Inspected',
      recommendations: 'Service advised',
      status: 'completed',
    })
    const estimate = store.saveEstimate({
      id: newId(),
      customerId: IDS.custJohn,
      vehicleId: IDS.vehF150,
      repairOrderId: order.id,
      notes: 'Labor and parts',
      status: 'pending_approval',
      discount: 0,
      taxRate: 8.5,
      expiresAt: null,
    })
    store.saveEstimateItem({
      id: newId(),
      estimateId: estimate.id,
      kind: 'labor',
      description: 'Diagnostic labor',
      serviceId: IDS.svcDiag,
      partId: null,
      quantity: 1,
      unitCost: 0,
      unitPrice: 145,
      hours: 1,
    })
    store.convertEstimateToRepairOrder(estimate.id, order.id)
    store.saveRepairOrderItem({
      id: newId(),
      repairOrderId: order.id,
      kind: 'part',
      description: 'Front brake pads',
      serviceId: null,
      partId: IDS.partPads,
      quantity: 1,
      unitCost: 42,
      unitPrice: 89,
      hours: 0,
      approved: true,
      declined: false,
      technicianId: IDS.technician2,
    })
    store.setRepairOrderStatus(order.id, 'in_progress')
    store.setRepairOrderStatus(order.id, 'quality_check')
    store.setRepairOrderStatus(order.id, 'ready_for_pickup')
    const money = store.orderMoney(store.getRepairOrder(order.id)!)
    store.savePayment({ id: newId(), repairOrderId: order.id, method: 'card', amount: money.total, note: 'Paid in full', status: 'recorded' })
    store.setRepairOrderStatus(order.id, 'completed')
    const closed = store.getRepairOrder(order.id)!
    expect(closed.status).toBe('completed')
    expect(store.orderMoney(closed).status).toBe('paid')
    expect(store.state.vehicles.find((row) => row.id === IDS.vehF150)?.status).toBe('active')
    expect(store.vehicleHistory(IDS.vehF150).some((row) => row.order.id === order.id)).toBe(true)
  })
})

describe('inventory', () => {
  it('receives stock, uses a part on a repair order, and raises a low-stock alert', async () => {
    const store = await signedIn()
    const part = store.savePart({
      id: newId(),
      name: 'Cabin filter',
      partNumber: 'CF-100',
      description: '',
      supplierId: null,
      categoryId: 'pcat-fluids',
      kind: 'part',
      cost: 8,
      price: 22,
      quantity: 1,
      minQuantity: 2,
      unit: 'each',
      location: 'Bin C',
      compatibility: '',
      active: true,
    })
    store.receiveInventory(part.id, 1, 'Initial receive')
    expect(store.state.parts.find((row) => row.id === part.id)?.quantity).toBe(2)
    store.saveRepairOrderItem({
      id: newId(),
      repairOrderId: IDS.roBrake,
      kind: 'part',
      description: 'Cabin filter',
      serviceId: null,
      partId: part.id,
      quantity: 1,
      unitCost: 8,
      unitPrice: 22,
      hours: 0,
      approved: true,
      declined: false,
      technicianId: null,
    })
    const after = store.state.parts.find((row) => row.id === part.id)
    expect(after?.quantity).toBe(1)
    expect(store.state.notifications.some((row) => row.type === 'low_inventory' && row.relatedId === part.id)).toBe(true)
  })
})

describe('permissions', () => {
  it('keeps technicians out of settings and user administration', async () => {
    const store = await signedIn('employee@bcsoftware.demo')
    expect(() => store.listUsers()).toThrow('You do not have permission')
    expect(() => store.saveCompany(store.state.company)).toThrow('You do not have permission')
    expect(store.listRepairOrders().items.length).toBeGreaterThan(0)
    expect(store.listVehicles().items.some((row) => vehicleLabel(row).includes('Honda'))).toBe(true)
  })

  it('lets a service advisor manage customers and estimates but not roles', async () => {
    const store = await signedIn('advisor@bcsoftware.demo')
    expect(store.listClients().total).toBeGreaterThan(0)
    expect(() => store.saveRolePermissions(IDS.roleAdvisor, [])).toThrow('You do not have permission')
  })
})
