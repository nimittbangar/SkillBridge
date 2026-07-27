import React, { useState } from 'react'
import { useNavigate, Link, Navigate } from 'react-router-dom'
import { register as registerAPI } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import PhoneInput from '../../components/PhoneInput'
import { validatePassword, validatePhone, getPasswordStrength } from '../../utils/validation'

export default function AdminRegister() {
  const [form, setForm] = useState({
    name: '', email: '', password: '', confirmPassword: '',
    phone: '', secretCode: ''
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showPwd, setShowPwd] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [showSecret, setShowSecret] = useState(false)
  const { user } = useAuth()
  const navigate = useNavigate()

  // Seekers/employers who are already logged in should never see this page,
  // even if they navigate here directly by URL.
  if (user && user.role === 'SEEKER') return <Navigate to="/seeker/dashboard" replace />
  if (user && user.role === 'EMPLOYER') return <Navigate to="/employer/dashboard" replace />

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    const pwdCheck = validatePassword(form.password)
    if (!pwdCheck.valid) {
      setError(pwdCheck.message)
      return
    }

    if (form.phone) {
      const [phoneCode, phoneNumber] = form.phone.split(' ')
      const phoneCheck = validatePhone(phoneCode, phoneNumber)
      if (!phoneCheck.valid) { setError(phoneCheck.message); return }
    }

    setLoading(true)
    try {
      await registerAPI({
        name: form.name,
        email: form.email,
        password: form.password,
        phone: form.phone,
        role: 'ADMIN',
        secretCode: form.secretCode
      })
      setSuccess(true)
    } catch (err) {
      setError(err.response?.data || 'Registration failed. Email may already exist.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="container py-5">
        <div className="row justify-content-center">
          <div className="col-md-6 col-lg-5">
            <div className="card border-0 shadow rounded-4 text-center p-4 p-lg-5">
              <div className="rounded-4 d-inline-flex align-items-center justify-content-center p-2 mx-auto mb-3"
                style={{ background: 'linear-gradient(160deg, #0A2347 0%, #123160 100%)' }}>
                <img src="/logo.svg" alt="SkillBridge" style={{ width: 40, height: 40 }}
                  onError={e => { e.target.style.display = 'none' }} />
              </div>
              <div className="rounded-circle d-inline-flex align-items-center justify-content-center mx-auto mb-3"
                style={{ width: 64, height: 64, background: '#D1FAE5' }}>
                <i className="bi bi-check-circle-fill" style={{ fontSize: 30, color: '#057642' }}></i>
              </div>
              <h4 className="fw-bold mb-2">Admin Account Created!</h4>
              <p className="text-muted mb-4">
                Your admin account has been created successfully. You can now login via the Admin Portal.
              </p>
              <Link to="/admin/login" className="btn btn-lg w-100 text-white fw-bold rounded-3"
                style={{ background: '#123160' }}>
                <i className="bi bi-shield-check me-2"></i>Go to Admin Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-lg-10">
          <div className="card shadow border-0 rounded-4 overflow-hidden">
            <div className="row g-0">

              {/* ── BRAND PANEL: stacks above the form on mobile, beside it on desktop ── */}
              <div className="col-12 col-lg-4 d-flex flex-column align-items-center justify-content-center text-center p-4 p-lg-5"
                style={{ background: 'linear-gradient(160deg, #0A2347 0%, #123160 100%)', color: '#fff' }}>
                <div className="bg-white rounded-4 p-2 p-lg-3 mb-3 mb-lg-4 d-inline-flex flex-shrink-0">
                  <img src="/logo.svg" alt="SkillBridge" className="auth-logo-img"
                    onError={e => { e.target.style.display = 'none' }} />
                </div>
                <h2 className="heading-serif fw-bold mb-1 mb-lg-2 auth-brand-title">SkillBridge</h2>
                <p className="opacity-75 small mb-3 auth-tagline">
                  Create an administrator account — restricted access.
                </p>
                <span className="d-inline-flex align-items-center gap-2 px-3 py-1 rounded-pill"
                  style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.3)', fontSize: '0.75rem' }}>
                  <i className="bi bi-shield-plus"></i> Admin Portal
                </span>
              </div>

              {/* ── FORM PANEL ── */}
              <div className="col-lg-8">
                <div className="p-4 p-lg-5">

                  <div className="mb-4">
                    <h3 className="heading-serif fw-bold mb-1">Admin Registration</h3>
                    <p className="text-muted small mb-0">Create a new Admin account — restricted access</p>
                  </div>

                  {error && (
                    <div className="alert alert-danger py-2 small rounded-3 mb-3">
                      <i className="bi bi-exclamation-triangle-fill me-2"></i>{error}
                    </div>
                  )}

                  <form onSubmit={handleSubmit}>
                    <div className="row g-3">
                      <div className="col-12 float-field">
                        <input className="form-control rounded-3" required
                          value={form.name}
                          onChange={e => setForm({ ...form, name: e.target.value })}
                          placeholder=" " />
                        <label>Full Name <span className="text-danger">*</span></label>
                      </div>

                      <div className="col-12 float-field">
                        <input type="email" className="form-control rounded-3" required
                          value={form.email}
                          onChange={e => setForm({ ...form, email: e.target.value })}
                          placeholder=" " />
                        <label>Email Address <span className="text-danger">*</span></label>
                      </div>

                      <div className="col-md-6 float-field">
                        <div className="pwd-wrap">
                          <input type={showPwd ? 'text' : 'password'} className="form-control rounded-3" required
                            value={form.password}
                            onChange={e => setForm({ ...form, password: e.target.value })}
                            placeholder=" " />
                          <label>Password <span className="text-danger">*</span></label>
                          <button type="button" className="pwd-toggle" onClick={() => setShowPwd(v => !v)}
                            aria-label={showPwd ? 'Hide password' : 'Show password'} tabIndex={-1}>
                            <i className={`bi ${showPwd ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                          </button>
                        </div>
                        {form.password && (() => {
                          const s = getPasswordStrength(form.password)
                          return (
                            <div className="mt-1">
                              <div className="rounded-pill overflow-hidden" style={{ height: 5, background: 'var(--border-color)' }}>
                                <div className="rounded-pill h-100" style={{ width: s.width, background: s.color, transition: 'all 0.3s' }}></div>
                              </div>
                              <span style={{ color: s.color, fontSize: '0.78rem' }}>{s.label}</span>
                            </div>
                          )
                        })()}
                      </div>

                      <div className="col-md-6 float-field">
                        <div className="pwd-wrap">
                          <input type={showConfirm ? 'text' : 'password'} className="form-control rounded-3" required
                            value={form.confirmPassword}
                            onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
                            placeholder=" " />
                          <label>Confirm Password <span className="text-danger">*</span></label>
                          <button type="button" className="pwd-toggle" onClick={() => setShowConfirm(v => !v)}
                            aria-label={showConfirm ? 'Hide password' : 'Show password'} tabIndex={-1}>
                            <i className={`bi ${showConfirm ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                          </button>
                        </div>
                        {form.confirmPassword && form.password !== form.confirmPassword && (
                          <span className="text-danger d-block mt-1" style={{ fontSize: '0.78rem' }}>Passwords don't match</span>
                        )}
                      </div>

                      <div className="col-12">
                        <label className="form-label fw-semibold small">Phone Number</label>
                        <PhoneInput value={form.phone} onChange={phone => setForm({ ...form, phone })} />
                      </div>

                      <div className="col-12 float-field">
                        <div className="pwd-wrap">
                          <input type={showSecret ? 'text' : 'password'} className="form-control rounded-3" required
                            value={form.secretCode}
                            onChange={e => setForm({ ...form, secretCode: e.target.value })}
                            placeholder=" " />
                          <label>Admin Secret Code <span className="text-danger">*</span></label>
                          <button type="button" className="pwd-toggle" onClick={() => setShowSecret(v => !v)}
                            aria-label={showSecret ? 'Hide secret code' : 'Show secret code'} tabIndex={-1}>
                            <i className={`bi ${showSecret ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                          </button>
                        </div>
                      </div>
                    </div>

                    <button type="submit"
                      className="btn btn-lg w-100 text-white fw-bold mt-4 rounded-3"
                      style={{ background: '#7C3AED' }}
                      disabled={loading}>
                      {loading
                        ? <span className="spinner-border spinner-border-sm me-2"></span>
                        : <i className="bi bi-shield-plus me-2"></i>}
                      Create Admin Account
                    </button>
                  </form>

                  <hr className="my-4" />
                  <div className="auth-action-banner">
                    <span className="auth-action-text">Already have an account?</span>
                    <Link to="/admin/login" className="auth-action-btn">Admin Login</Link>
                  </div>
                  <p className="text-center text-muted mt-3 mb-0" style={{ fontSize: '0.72rem', opacity: 0.6 }}>
                    <i className="bi bi-lock-fill me-1"></i>
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