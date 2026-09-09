import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { collectErrors, isNonEmpty } from '../lib/validation'
import { BrandLockup } from '../components/BrandLogo'
import { Alert, Button, Field, Input } from '../components/ui'

export function ResetPasswordPage() {
  const { store } = useApp()
  const [params] = useSearchParams()
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    const token = params.get('token') ?? ''
    const errors = collectErrors([isNonEmpty(token, 'Reset token'), isNonEmpty(password, 'Password')])
    if (password.length < 6) errors.push('Password must be at least 6 characters.')
    if (errors.length) {
      setError(errors[0])
      return
    }
    try {
      await store.resetPassword(token, password)
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to reset password.')
    }
  }

  return (
    <div className="flex min-h-svh items-center bg-paper p-6">
      <form onSubmit={onSubmit} className="mx-auto w-full max-w-lg space-y-4 rounded-2xl border border-line bg-card p-8">
        <BrandLockup />
        <h1 className="font-display text-3xl">Choose a new password</h1>
        {error ? <Alert tone="error">{error}</Alert> : null}
        {done ? (
          <Alert tone="success">
            Password updated. <Link to="/login">Sign in</Link>
          </Alert>
        ) : (
          <>
            <Field label="New password">
              <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
            </Field>
            <Button type="submit" className="w-full">
              Update password
            </Button>
          </>
        )}
      </form>
    </div>
  )
}
