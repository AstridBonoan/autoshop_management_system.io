import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HashRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { AppProvider } from '../context/AppContext'
import { LoginPage } from './LoginPage'

describe('LoginPage', () => {
  it('validates empty credentials and then signs in', async () => {
    const user = userEvent.setup()
    render(
      <AppProvider>
        <HashRouter>
          <LoginPage />
        </HashRouter>
      </AppProvider>,
    )
    await user.clear(screen.getByLabelText('Email'))
    await user.clear(screen.getByLabelText('Password'))
    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByText(/email is required/i)).toBeInTheDocument()

    await user.type(screen.getByLabelText('Email'), 'admin@bcsoftware.demo')
    await user.type(screen.getByLabelText('Password'), 'demo123')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(screen.queryByText(/email is required/i)).not.toBeInTheDocument()
  })
})
