import { describe, expect, it } from 'vitest'
import { collectErrors, isEmail, isNonEmpty, isTimeRange, matchesSearch, paginate } from './validation'

describe('validation', () => {
  it('requires non-empty values', () => {
    expect(isNonEmpty('  ', 'Name')).toBe('Name is required.')
    expect(isNonEmpty('Apex', 'Name')).toBeNull()
  })

  it('validates email addresses', () => {
    expect(isEmail('not-an-email')).toBe('Enter a valid email address.')
    expect(isEmail('admin@bcsoftware.demo')).toBeNull()
  })

  it('validates appointment time ranges', () => {
    expect(isTimeRange('10:00', '10:00')).toBe('End time must be after start time.')
    expect(isTimeRange('09:00', '09:30')).toBeNull()
  })

  it('collects only failed checks', () => {
    expect(collectErrors([null, 'Broken'])).toEqual(['Broken'])
  })

  it('paginates without loading extra pages', () => {
    const result = paginate([1, 2, 3, 4, 5], 2, 2)
    expect(result.items).toEqual([3, 4])
    expect(result.total).toBe(5)
  })

  it('matches search terms case-insensitively', () => {
    expect(matchesSearch('Apex Studio', 'apex')).toBe(true)
    expect(matchesSearch('Apex Studio', 'zzz')).toBe(false)
  })
})
