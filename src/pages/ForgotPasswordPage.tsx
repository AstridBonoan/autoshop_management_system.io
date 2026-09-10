import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { isEmail } from '../lib/validation'
import { BrandLogo } from '../components/BrandLogo'
import { Alert, Button, Field, Input } from '../components/ui'

export function ForgotPasswordPage() {
  const { store, refresh } = useApp()
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    const invalid = isEmail(email)
    if (invalid) {
      setError(invalid)
      return
    }
    setError(null)
    const result = await store.requestPasswordReset(email)
    refresh()
    setMessage('If that account exists, a reset link has been issued. Demo mode shows the token below so you can continue without email delivery.')
    setToken(result.token ?? null)
  }

  return (
    <div className="flex min-h-svh items-center bg-paper p-6">
      <form onSubmit={onSubmit} className="mx-auto w-full max-w-lg space-y-4 rounded-2xl border border-line bg-card p-8">
        <BrandLogo variant="onLight" className="h-14 w-auto max-w-[220px] object-contain object-left" />
        <h1 className="font-display text-3xl">Reset password</h1>
        {error ? <Alert tone="error">{error}</Alert> : null}
        {message ? <Alert tone="success">{message}</Alert> : null}
        <Field label="Email">
          <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        </Field>
        <Button type="submit" className="w-full">
          Send reset link
        </Button>
        {token ? (
          <Link className="block text-sm text-teal underline" to={`/reset-password?token=${token}`}>
            Continue with demo reset token
          </Link>
        ) : null}
        <Link className="block text-sm text-ink-soft underline" to="/login">
          Back to sign in
        </Link>
      </form>
    </div>
  )
}
