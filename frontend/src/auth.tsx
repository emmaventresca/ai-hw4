import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { PublicUser } from './types'

const BASE = import.meta.env.VITE_API_BASE_URL ?? ''
const TOKEN_KEY = 'cc.session'

interface SignupInput {
  first_name: string
  last_name: string
  email: string
  password: string
}

interface AuthValue {
  user: PublicUser | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (input: SignupInput) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthValue | null>(null)

/** POST helper that surfaces FastAPI's `detail` as the thrown error message. */
async function post<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    const detail = payload?.detail
    // Pydantic validation errors arrive as a list of objects.
    if (Array.isArray(detail)) throw new Error(detail[0]?.msg ?? 'Please check the form and try again.')
    throw new Error(typeof detail === 'string' ? detail : 'Something went wrong. Please try again.')
  }
  return payload as T
}

interface AuthResponse {
  token: string
  user: PublicUser
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null)
  const [loading, setLoading] = useState(true)

  // Restore the session on load so a refresh doesn't log the shopper out.
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) {
      setLoading(false)
      return
    }
    fetch(`${BASE}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error('expired'))))
      .then((me: PublicUser) => setUser(me))
      .catch(() => localStorage.removeItem(TOKEN_KEY))
      .finally(() => setLoading(false))
  }, [])

  const adopt = useCallback((result: AuthResponse) => {
    localStorage.setItem(TOKEN_KEY, result.token)
    setUser(result.user)
  }, [])

  const login = useCallback(
    async (email: string, password: string) => {
      adopt(await post<AuthResponse>('/api/auth/login', { email, password }))
    },
    [adopt],
  )

  const signup = useCallback(
    async (input: SignupInput) => {
      adopt(await post<AuthResponse>('/api/auth/signup', input))
    },
    [adopt],
  )

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, loading, login, signup, logout }),
    [user, loading, login, signup, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>')
  return context
}

/** The bearer token, for callers that talk to the API directly (e.g. the chat panel). */
export function authToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}
