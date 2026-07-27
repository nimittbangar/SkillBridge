import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { changePassword } from '../services/api'
import { validatePassword, getPasswordStrength } from '../utils/validation'

export default function ChangePassword() {
  const [form, setForm] = useState({ currentPassword:'', newPassword:'', confirmPassword:'' })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [show, setShow] = useState({ current:false, new:false, confirm:false })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (form.newPassword !== form.confirmPassword) {
      setError('New passwords do not match'); return
    }
    const pwdCheck = validatePassword(form.newPassword)
    if (!pwdCheck.valid) {
      setError(pwdCheck.message); return
    }
    if (form.currentPassword === form.newPassword) {
      setError('New password must be different from current password'); return
    }
    setLoading(true)
    try {
      await changePassword({ currentPassword: form.currentPassword, newPassword: form.newPassword })
      setSuccess(true)
      setForm({ currentPassword:'', newPassword:'', confirmPassword:'' })
    } catch (e) {
      setError(e.response?.data || 'Failed to change password. Check your current password.')
    } finally { setLoading(false) }
  }

  const pwdStrength = getPasswordStrength(form.newPassword)

  if (success) return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-md-5">
          <div className="card border-0 shadow-sm rounded-4 text-center p-5">
            <div className="rounded-circle d-inline-flex align-items-center justify-content-center mx-auto mb-3"
              style={{ width:68, height:68, background:'#D1FAE5' }}>
              <i className="bi bi-check-circle-fill" style={{ fontSize:32, color:'#057642' }}></i>
            </div>
            <h4 className="fw-bold mb-2">Password Changed!</h4>
            <p className="text-muted mb-4">Your password has been updated successfully.</p>
            <Link to="/profile" className="btn text-white fw-bold rounded-pill px-4"
              style={{ background:'#123160' }}>
              Back to Profile
            </Link>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="container py-4">
      <div className="row justify-content-center">
        <div className="col-md-5">
          <div className="d-flex align-items-center gap-3 mb-4">
            <Link to="/profile" className="btn btn-sm btn-outline-secondary rounded-pill">
              <i className="bi bi-arrow-left me-1"></i>Back
            </Link>
            <h4 className="fw-bold mb-0">Change Password</h4>
          </div>

          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body p-4">
              <div className="text-center mb-4">
                <div className="rounded-circle d-inline-flex align-items-center justify-content-center mb-3"
                  style={{ width:56, height:56, background:'#EEF3F8' }}>
                  <i className="bi bi-shield-lock-fill fs-3" style={{ color:'#123160' }}></i>
                </div>
                <p className="text-muted small mb-0">Enter your current password and choose a new one</p>
              </div>

              {error && <div className="alert alert-danger rounded-3 py-2 mb-3 small">
                <i className="bi bi-exclamation-triangle-fill me-2"></i>{error}
              </div>}

              <form onSubmit={handleSubmit}>
                {/* Current Password */}
                <div className="float-field mb-3">
                  <div className="pwd-wrap">
                    <input type={show.current ? 'text' : 'password'}
                      className="form-control rounded-3" required
                      value={form.currentPassword}
                      onChange={e => setForm({ ...form, currentPassword: e.target.value })}
                      placeholder=" " />
                    <label>Current Password</label>
                    <button type="button" className="pwd-toggle"
                      onClick={() => setShow({ ...show, current: !show.current })}
                      aria-label={show.current ? 'Hide password' : 'Show password'} tabIndex={-1}>
                      <i className={`bi ${show.current ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div className="float-field mb-2">
                  <div className="pwd-wrap">
                    <input type={show.new ? 'text' : 'password'}
                      className="form-control rounded-3" required
                      value={form.newPassword}
                      onChange={e => setForm({ ...form, newPassword: e.target.value })}
                      placeholder=" " />
                    <label>New Password</label>
                    <button type="button" className="pwd-toggle"
                      onClick={() => setShow({ ...show, new: !show.new })}
                      aria-label={show.new ? 'Hide password' : 'Show password'} tabIndex={-1}>
                      <i className={`bi ${show.new ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                    </button>
                  </div>
                </div>

                {/* Password Strength Bar */}
                {form.newPassword && (
                  <div className="mb-3">
                    <div className="rounded-pill overflow-hidden mb-1" style={{ height:6, background:'#e2e8f0' }}>
                      <div className="rounded-pill h-100" style={{ width:pwdStrength.width, background:pwdStrength.color, transition:'all 0.3s' }}></div>
                    </div>
                    <span style={{ color:pwdStrength.color, fontSize:'0.8rem' }}>{pwdStrength.label}</span>
                  </div>
                )}

                {/* Confirm Password */}
                <div className="float-field mb-4">
                  <div className="pwd-wrap">
                    <input type={show.confirm ? 'text' : 'password'}
                      className={`form-control rounded-3 ${form.confirmPassword && (form.newPassword !== form.confirmPassword ? 'is-invalid' : 'is-valid')}`}
                      required
                      value={form.confirmPassword}
                      onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
                      placeholder=" " />
                    <label>Confirm New Password</label>
                    <button type="button" className="pwd-toggle"
                      onClick={() => setShow({ ...show, confirm: !show.confirm })}
                      aria-label={show.confirm ? 'Hide password' : 'Show password'} tabIndex={-1}>
                      <i className={`bi ${show.confirm ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                    </button>
                  </div>
                  {form.confirmPassword && form.newPassword === form.confirmPassword && (
                    <div className="valid-feedback">Passwords match!</div>
                  )}
                  {form.confirmPassword && form.newPassword !== form.confirmPassword && (
                    <div className="invalid-feedback">Passwords do not match</div>
                  )}
                </div>

                <button type="submit" className="btn w-100 text-white fw-bold rounded-pill py-2"
                  style={{ background:'#123160' }} disabled={loading}>
                  {loading ? <span className="spinner-border spinner-border-sm me-2"></span>
                           : <i className="bi bi-shield-check me-2"></i>}
                  Update Password
                </button>
              </form>

              <div className="mt-4 p-3 rounded-3" style={{ background:'#EEF3F8' }}>
                <div className="text-muted small fw-semibold mb-2">
                  <i className="bi bi-info-circle me-1" style={{ color:'#123160' }}></i>
                  Password Tips:
                </div>
                <ul className="mb-0 text-muted small" style={{ paddingLeft:16 }}>
                  <li>At least 6 characters long</li>
                  <li>Use uppercase + lowercase letters</li>
                  <li>Include numbers and symbols (@, #, !)</li>
                  <li>Don't use your name or email</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}