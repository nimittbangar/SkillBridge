import React, { useState } from 'react'
import { useNavigate, Link, Navigate } from 'react-router-dom'
import { login as loginAPI } from '../../services/api'
import { useAuth } from '../../context/AuthContext'

export default function AdminLogin() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const { user, login } = useAuth()
  const navigate = useNavigate()

  // Seekers/employers who are already logged in should never see this page,
  // even if they navigate here directly by URL.
  if (user && user.role === 'SEEKER') return <Navigate to="/seeker/dashboard" replace />
  if (user && user.role === 'EMPLOYER') return <Navigate to="/employer/dashboard" replace />

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const { data } = await loginAPI(form)
      if (data.role !== 'ADMIN') {
        setError('Access denied. This login is for Admins only.')
        setLoading(false)
        return
      }
      login(data)
      navigate('/admin/dashboard')
    } catch (err) {
      setError('Invalid email or password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-lg-9">
          <div className="card shadow border-0 rounded-4 overflow-hidden">
            <div className="row g-0">

              {/* ── BRAND PANEL: stacks above the form on mobile, beside it on desktop ── */}
              <div className="col-12 col-lg-5 d-flex flex-column align-items-center justify-content-center text-center p-4 p-lg-5"
                style={{ background: 'linear-gradient(160deg, #0A2347 0%, #123160 100%)', color: '#fff' }}>
                <div className="bg-white rounded-4 p-2 p-lg-3 mb-3 mb-lg-4 d-inline-flex flex-shrink-0">
                  <img src="/logo.svg" alt="SkillBridge" className="auth-logo-img"
                    onError={e => { e.target.style.display = 'none' }} />
                </div>
                <h2 className="heading-serif fw-bold mb-1 mb-lg-2 auth-brand-title">SkillBridge</h2>
                <p className="opacity-75 small mb-3 auth-tagline">
                  Administrator console — restricted access.
                </p>
                <span className="d-inline-flex align-items-center gap-2 px-3 py-1 rounded-pill"
                  style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.3)', fontSize: '0.75rem' }}>
                  <i className="bi bi-shield-lock-fill"></i> Admin Portal
                </span>
              </div>

              {/* ── FORM PANEL ── */}
              <div className="col-lg-7">
                <div className="p-4 p-lg-5">

                  <div className="mb-4">
                    <h3 className="heading-serif fw-bold mb-1">Admin Sign In</h3>
                    <p className="text-muted small mb-0">Authorized personnel only</p>
                  </div>

                  {error && (
                    <div className="alert alert-danger py-2 small rounded-3">
                      <i className="bi bi-exclamation-triangle-fill me-2"></i>{error}
                    </div>
                  )}

                  <form onSubmit={handleSubmit}>
                    <div className="float-field">
                      <input type="email" className="form-control rounded-3" required
                        value={form.email}
                        onChange={e => setForm({ ...form, email: e.target.value })}
                        placeholder=" " />
                      <label>Admin Email</label>
                    </div>
                    <div className="float-field mb-4">
                      <div className="pwd-wrap">
                        <input type={showPassword ? 'text' : 'password'} className="form-control rounded-3" required
                          value={form.password}
                          onChange={e => setForm({ ...form, password: e.target.value })}
                          placeholder=" " />
                        <label>Password</label>
                        <button type="button" className="pwd-toggle" onClick={() => setShowPassword(v => !v)}
                          aria-label={showPassword ? 'Hide password' : 'Show password'} tabIndex={-1}>
                          <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                        </button>
                      </div>
                    </div>
                    <button type="submit"
                      className="btn btn-lg w-100 text-white fw-bold rounded-3"
                      style={{ background: '#123160' }}
                      disabled={loading}>
                      {loading
                        ? <span className="spinner-border spinner-border-sm me-2"></span>
                        : <i className="bi bi-shield-check me-2"></i>}
                      Login as Admin
                    </button>
                  </form>

                  <hr className="my-4" />

                  <div className="auth-action-banner mb-3">
                    <span className="auth-action-text">New admin? Register here.</span>
                    <Link to="/admin/register" className="auth-action-btn">
                      <i className="bi bi-shield-plus me-1"></i>Register as Admin
                    </Link>
                  </div>
                  <div className="auth-action-banner">
                    <span className="auth-action-text">Not an admin?</span>
                    <Link to="/login" className="auth-action-btn">Go to Normal Login</Link>
                  </div>
                  <p className="text-center text-muted mt-3 mb-0" style={{ fontSize: '0.72rem', opacity: 0.6 }}>
                    <i className="bi bi-lock-fill me-1"></i>SkillBridge Admin Portal — CDAC PGCP-AC-002
                  </p>

                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  )
}