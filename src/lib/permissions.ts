import type { ActionKey, AppState, ModuleKey, PermissionKey, Profile } from '../types/domain'

export function permissionKey(module: ModuleKey, action: ActionKey): PermissionKey {
  return `${module}.${action}`
}

export function getProfilePermissions(state: AppState, profile: Profile | null): Set<string> {
  if (!profile || profile.status !== 'active') return new Set()
  const permissionIds = state.rolePermissions
    .filter((row) => row.roleId === profile.roleId)
    .map((row) => row.permissionId)
  return new Set(
    state.permissions.filter((permission) => permissionIds.includes(permission.id)).map((p) => p.key),
  )
}

export function can(
  state: AppState,
  profile: Profile | null,
  module: ModuleKey,
  action: ActionKey,
): boolean {
  const granted = getProfilePermissions(state, profile)
  if (granted.has(permissionKey(module, 'manage'))) return true
  if (action !== 'view' && granted.has(permissionKey(module, 'manage'))) return true
  return granted.has(permissionKey(module, action))
}

export function canViewModule(state: AppState, profile: Profile | null, module: ModuleKey): boolean {
  return can(state, profile, module, 'view') || can(state, profile, module, 'manage')
}
