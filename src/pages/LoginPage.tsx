import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { BrandLogo } from '../components/BrandLogo'
import { Alert, Button, Field, Input } from '../components/ui'
import { useApp } from '../context/AppContext'
import { PRODUCT } from '../lib/autoshop'
import { collectErrors, isEmail, isNonEmpty } from '../lib/validation'

export function LoginPage() {
  const { store, refresh } = useApp()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('admin@bcsoftware.demo')
  const [password, setPassword] = useState('demo123')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    const errors = collectErrors([isEmail(email), isNonEmpty(password, 'Password')])
    if (errors.length) {
      setError(errors[0])
      return
    }
    setLoading(true)
    setError(null)
    try {
      await store.login(email, password)
      refresh()
      const from = (location.state as { from?: string } | null)?.from
      navigate(from && from !== '/login' ? from : '/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="brand-panel hidden p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <BrandLogo variant="onDark" className="h-16 w-auto max-w-xs object-contain object-left" />
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-gold">{PRODUCT.name}</p>
          <h1 className="mt-3 font-display text-4xl uppercase leading-tight lg:text-5xl">{PRODUCT.tagline}</h1>
          <p className="brand-muted mt-4 max-w-md">{PRODUCT.description}</p>
          <p className="brand-muted mt-6 text-sm">Built by {PRODUCT.developer}.</p>
        </div>
        <p className="brand-muted text-sm">Demo accounts use the password demo123.</p>
      </div>
      <div className="flex items-center justify-center bg-paper p-6">
        <form onSubmit={onSubmit} className="w-full max-w-md space-y-4 rounded-2xl border border-line bg-card p-8 shadow-sm">
          <div className="lg:hidden">
            <BrandLogo variant="onLight" className="h-14 w-auto max-w-[220px] object-contain object-left" />
          </div>
          <h2 className="font-display text-3xl">Sign in</h2>
          <p className="text-sm text-ink-soft">Use your shop account to continue.</p>
          {error ? <Alert tone="error">{error}</Alert> : null}
          <Field label="Email">
            <Input type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} />
          </Field>
          <Field label="Password">
            <Input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </Field>
          <Button type="submit" disabled={loading} className="w-full min-h-11">
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>
          <Link className="block text-sm text-teal underline" to="/forgot-password">
            Forgot password
          </Link>
        </form>
      </div>
    </div>
  )
}
