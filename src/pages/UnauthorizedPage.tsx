import { Link } from 'react-router-dom'

export function UnauthorizedPage() {
  return (
    <div className="mx-auto max-w-lg py-24 text-center">
      <h1 className="font-display text-4xl">Access denied</h1>
      <p className="mt-3 text-ink-soft">Your role does not include this module. Ask an administrator if you need additional access.</p>
      <Link className="mt-6 inline-block text-teal underline" to="/">
        Return to dashboard
      </Link>
    </div>
  )
}
