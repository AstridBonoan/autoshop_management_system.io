import { describe, expect, it } from 'vitest'
import { AppStore } from '../data/store'
import { createSeedState, IDS } from '../data/seed'
import { can, canViewModule } from './permissions'

describe('permissions', () => {
  it('gives administrators module access', () => {
    const store = new AppStore(createSeedState())
    const admin = store.state.profiles.find((row) => row.id === IDS.admin) ?? null
    expect(canViewModule(store.state, admin, 'settings')).toBe(true)
    expect(can(store.state, admin, 'users', 'create')).toBe(true)
  })

  it('prevents employees from managing users', () => {
    const store = new AppStore(createSeedState())
    const employee = store.state.profiles.find((row) => row.id === IDS.employee) ?? null
    expect(can(store.state, employee, 'users', 'view')).toBe(false)
    expect(canViewModule(store.state, employee, 'clients')).toBe(true)
  })

  it('blocks inactive users even if a role would allow access', () => {
    const store = new AppStore(createSeedState())
    const inactive = store.state.profiles.find((row) => row.id === IDS.employee2) ?? null
    expect(canViewModule(store.state, inactive, 'clients')).toBe(false)
  })
})
