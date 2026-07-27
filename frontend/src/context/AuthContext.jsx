import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'

const AuthContext = createContext(null)

// Auto-logout after this many milliseconds of no mouse/keyboard/scroll activity
const IDLE_TIMEOUT_MS = 5 * 60 * 1000 // 5 minutes

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [loading, setLoading] = useState(true)
  const [idleLoggedOut, setIdleLoggedOut] = useState(false)
  const idleTimerRef = useRef(null)

  useEffect(() => {
    const savedToken = localStorage.getItem('token')
    const savedUser = localStorage.getItem('user')
    if (savedToken && savedUser) {
      try {
        setUser(JSON.parse(savedUser))
        setToken(savedToken)
      } catch (e) {
        // Corrupted/tampered localStorage — clear it instead of white-screening the app.
        localStorage.removeItem('token')
        localStorage.removeItem('user')
      }
    }
    setLoading(false)
  }, [])

  const login = (authData) => {
    setToken(authData.token)
    setUser({ id: authData.id, name: authData.name, email: authData.email, role: authData.role })
    localStorage.setItem('token', authData.token)
    localStorage.setItem('user', JSON.stringify({
      id: authData.id, name: authData.name, email: authData.email, role: authData.role
    }))
  }

  const logout = useCallback(() => {
    setToken(null)
    setUser(null)
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }, [])

  // ── Auto-logout after IDLE_TIMEOUT_MS of no activity, only while logged in ──
  useEffect(() => {
    if (!user) return

    const resetIdleTimer = () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
      idleTimerRef.current = setTimeout(() => {
        setIdleLoggedOut(true)
        logout()
      }, IDLE_TIMEOUT_MS)
    }

    const activityEvents = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart']
    activityEvents.forEach(evt => window.addEventListener(evt, resetIdleTimer))
    resetIdleTimer() // start the timer as soon as a session begins

    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
      activityEvents.forEach(evt => window.removeEventListener(evt, resetIdleTimer))
    }
  }, [user, logout])

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading, idleLoggedOut, setIdleLoggedOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)