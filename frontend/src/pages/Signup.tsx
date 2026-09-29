import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth'

const MIN_PASSWORD = 8

export default function Signup() {
  const { signup, user } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    confirm: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  if (user) return <Navigate to="/products" replace />

  function update(field: keyof typeof form) {
    return (event: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [field]: event.target.value }))
  }

  // Shown live under the confirm box, so a mismatch is caught before submitting.
  const mismatch = form.confirm.length > 0 && form.confirm !== form.password

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)

    if (form.password !== form.confirm) {
      setError('Those passwords don’t match.')
      return
    }
    if (form.password.length < MIN_PASSWORD) {
      setError(`Please use at least ${MIN_PASSWORD} characters for your password.`)
      return
    }

    setPending(true)
    try {
      await signup({
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim(),
        password: form.password,
      })
      navigate('/products')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="container auth">
      <h1>Create your account</h1>
      <p className="section__lead">Save your details and chat with the shop assistant.</p>

      <div className="auth__card">
        {error && <div className="alert alert--error">{error}</div>}
        <form onSubmit={handleSubmit} noValidate>
          <div className="auth__row">
            <div className="field">
              <label htmlFor="signup-first">First name</label>
              <input id="signup-first" value={form.first_name} onChange={update('first_name')} autoComplete="given-name" required />
            </div>
            <div className="field">
              <label htmlFor="signup-last">Last name</label>
              <input id="signup-last" value={form.last_name} onChange={update('last_name')} autoComplete="family-name" required />
            </div>
          </div>

          <div className="field">
            <label htmlFor="signup-email">Email</label>
            <input id="signup-email" type="email" value={form.email} onChange={update('email')} autoComplete="email" required />
          </div>

          <div className="field">
            <label htmlFor="signup-password">Password</label>
            <input
              id="signup-password"
              type="password"
              value={form.password}
              onChange={update('password')}
              autoComplete="new-password"
              required
            />
            <span className="field__hint">At least {MIN_PASSWORD} characters.</span>
          </div>

          <div className="field">
            <label htmlFor="signup-confirm">Confirm password</label>
            <input
              id="signup-confirm"
              type="password"
              value={form.confirm}
              onChange={update('confirm')}
              autoComplete="new-password"
              aria-invalid={mismatch}
              required
            />
            {mismatch && <span className="field__error">Passwords don’t match yet.</span>}
          </div>

          <button type="submit" className="btn btn--primary btn--block" disabled={pending || mismatch}>
            {pending ? 'Creating account…' : 'Create account'}
          </button>
        </form>
      </div>

      <p className="auth__footer">
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </div>
  )
}
