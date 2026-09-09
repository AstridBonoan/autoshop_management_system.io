import { describe, expect, it } from 'vitest'
import { AppStore } from './store'
import { createSeedState, IDS } from './seed'
import { newId } from '../lib/validation'

async function signedIn(email = 'admin@bcsoftware.demo') {
  const store = new AppStore(createSeedState())
  await store.login(email, 'demo123')
  return store
}

describe('authentication', () => {
  it('signs in a valid active user', async () => {
    const store = await signedIn()
    expect(store.session?.profileId).toBe(IDS.admin)
  })

  it('rejects invalid credentials without revealing which field failed', async () => {
    const store = new AppStore(createSeedState())
    await expect(store.login('nobody@bcsoftware.demo', 'demo123')).rejects.toThrow('Invalid email or password.')
  })

  it('rejects inactive users', async () => {
    const store = new AppStore(createSeedState())
    await expect(store.login('priya@bcsoftware.demo', 'demo123')).rejects.toThrow('This account is inactive.')
  })

  it('resets a password with a valid token', async () => {
    const store = new AppStore(createSeedState())
    const { token } = await store.requestPasswordReset('admin@bcsoftware.demo')
    expect(token).toBeTruthy()
    await store.resetPassword(token!, 'newpass123')
    await expect(store.login('admin@bcsoftware.demo', 'demo123')).rejects.toThrow()
    await store.login('admin@bcsoftware.demo', 'newpass123')
    expect(store.session?.email).toBe('admin@bcsoftware.demo')
  })
})

describe('authorization at the data layer', () => {
  it('stops employees from listing users', async () => {
    const store = await signedIn('employee@bcsoftware.demo')
    expect(() => store.listUsers()).toThrow('You do not have permission')
  })
})

describe('core workflows', () => {
  it('creates a client, project, and completed task', async () => {
    const store = await signedIn()
    const client = store.saveClient({
      id: newId(),
      type: 'business',
      displayName: 'Cedar Collective',
      legalName: 'Cedar Collective LLC',
      email: 'hello@cedar.demo',
      phone: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      region: '',
      postalCode: '',
      country: '',
      status: 'active',
      notes: '',
      tags: [],
      assignedEmployeeId: IDS.employee,
    })
    const project = store.saveProject({
      id: newId(),
      name: 'Cedar workspace',
      clientId: client.id,
      status: 'active',
      startDate: '2026-09-08',
      endDate: null,
      notes: '',
    }, [IDS.employee])
    const task = store.saveTask({
      id: newId(),
      title: 'Kickoff checklist',
      description: 'Confirm scope',
      status: 'todo',
      priority: 'high',
      assignedEmployeeId: IDS.employee,
      clientId: client.id,
      projectId: project.id,
      vehicleId: null,
      repairOrderId: null,
      dueDate: '2026-09-20',
    })
    store.saveTask({ ...task, status: 'completed' })
    expect(store.state.tasks.find((row) => row.id === task.id)?.completedAt).toBeTruthy()
    expect(store.state.activities.some((row) => row.eventType === 'task_completed')).toBe(true)
  })

  it('searches a subset of records instead of returning the full catalog blindly', async () => {
    const store = await signedIn()
    const results = store.globalSearch('John')
    expect(results.clients.length).toBeGreaterThan(0)
    expect(results.clients.every((row) => row.displayName.includes('John'))).toBe(true)
    expect(results.tasks.length).toBeLessThanOrEqual(8)
  })
})
