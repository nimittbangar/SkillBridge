import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { resetPassword } from '../services/api'
import { validatePassword } from '../utils/validation'

const BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api'

export default function ForgotPassword() {
  const [step, setStep] = useState(1)
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [showPwd, setShowPwd] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const navigate = useNavigate()

  const handleSendOtp = async (e) => {
    e.preventDefault()
    if (!email.trim()) { setError('Please enter your email'); return }
    setLoading(true)
    setError('')
    setOtp('')
    try {
      await axios.post(
        `${BASE_URL}/users/forgot-password`,
        { email }
      )
      setStep(2)
    } catch (err) {
      setError(
        err.response?.data ||
        'No account found with this email'
      )
    } finally {
      setLoading(false)
    }
  }

  const handleReset = async (e) => {
    e.preventDefault()
    if (otp.length !== 6) {
      setError('Please enter the 6-digit OTP')
      return
    }
    const pwdCheck = validatePassword(newPassword)
    if (!pwdCheck.valid) {
      setError(pwdCheck.message)
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    setLoading(true)
    setError('')
    try {
      await resetPassword({ email, otp, newPassword })
      setSuccess(true)
      setTimeout(() => navigate('/login'), 3000)
    } catch (err) {
      setError(err.response?.data || 'Invalid OTP. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (success) return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-md-5 text-center">
          <div className="card border-0 shadow-sm rounded-4 p-5">
            <div className="rounded-circle d-inline-flex align-items-center justify-content-center mx-auto mb-3"
              style={{ width: 72, height: 72, background: '#D1FAE5' }}>
              <i className="bi bi-check-circle-fill"
                style={{ fontSize: 36, color: '#057642' }}></i>
            </div>
            <h4 className="fw-bold mb-2">Password Reset Successfully!</h4>
            <p className="text-muted mb-0">Redirecting to login...</p>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-md-5">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body p-5">

              {/* Header */}
              <div className="text-center mb-4">
                <div className="rounded-circle d-inline-flex align-items-center justify-content-center mb-3"
                  style={{ width: 60, height: 60, background: '#EEF3F8' }}>
                  <i className="bi bi-shield-lock-fill fs-3"
                    style={{ color: '#123160' }}></i>
                </div>
                <h4 className="fw-bold mb-1">
                  {step === 1 ? 'Forgot Password' : 'Reset Password'}
                </h4>
              </div>

              {/* Step Indicator */}
              <div className="d-flex align-items-center gap-2 mb-4">
                <div className="rounded-circle d-flex align-items-center justify-content-center fw-bold"
                  style={{ width: 28, height: 28, background: '#123160', color: '#fff', fontSize: 13 }}>
                  1
                </div>
                <div className="flex-fill"
                  style={{ height: 2, background: step >= 2 ? '#123160' : '#e2e8f0' }}>
                </div>
                <div className="rounded-circle d-flex align-items-center justify-content-center fw-bold"
                  style={{ width: 28, height: 28, background: step >= 2 ? '#123160' : '#e2e8f0', color: step >= 2 ? '#fff' : '#aaa', fontSize: 13 }}>
                  2
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="alert alert-danger rounded-3 py-2 small mb-3">
                  <i className="bi bi-exclamation-triangle-fill me-2"></i>
                  {error}
                </div>
              )}

              {/* Step 1 - Enter Email */}
              {step === 1 ? (
                <form onSubmit={handleSendOtp}>
                  <div className="float-field mb-4">
                    <input
                      type="email"
                      className="form-control rounded-3"
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder=" "
                    />
                    <label>Email Address</label>
                  </div>
                  <button
                    type="submit"
                    className="btn w-100 text-white fw-bold rounded-pill py-2"
                    style={{ background: '#123160' }}
                    disabled={loading}>
                    {loading
                      ? <span className="spinner-border spinner-border-sm me-2"></span>
                      : <i className="bi bi-send me-2"></i>}
                    Generate OTP
                  </button>
                </form>

              ) : (
                /* Step 2 - Show OTP + Reset Password */
                <form onSubmit={handleReset}>

                  {/* Check-your-email notice */}
                  <div style={{
                    background: '#EEF3F8',
                    border: '1px solid #123160',
                    borderRadius: 16,
                    padding: 20,
                    marginBottom: 20,
                    textAlign: 'center'
                  }}>
                    <div style={{ color: '#123160', fontWeight: 700, fontSize: 14, marginBottom: 6 }}>
                      📧 Check your inbox
                    </div>
                    <div style={{ color: '#444', fontSize: 13 }}>
                      We sent a 6-digit code to <strong>{email}</strong>. It's valid for 10 minutes.
                    </div>
                  </div>

                  {/* OTP Input */}
                  <div className="float-field">
                    <input
                      className="form-control rounded-3 text-center fw-bold"
                      style={{ fontSize: '1.5rem', letterSpacing: 10, fontFamily: 'monospace' }}
                      maxLength={6}
                      placeholder=" "
                      required
                      value={otp}
                      onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    />
                    <label>Enter OTP</label>
                  </div>

                  {/* New Password */}
                  <div className="float-field mb-3">
                    <div className="pwd-wrap">
                      <input
                        type={showPwd ? 'text' : 'password'}
                        className="form-control rounded-3"
                        required
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        placeholder=" "
                      />
                      <label>New Password</label>
                      <button
                        type="button"
                        className="pwd-toggle"
                        onClick={() => setShowPwd(!showPwd)}
                        aria-label={showPwd ? 'Hide password' : 'Show password'} tabIndex={-1}>
                        <i className={`bi ${showPwd ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div className="float-field mb-4">
                    <div className="pwd-wrap">
                      <input
                        type={showConfirm ? 'text' : 'password'}
                        className={`form-control rounded-3 ${confirmPassword && (newPassword !== confirmPassword ? 'is-invalid' : 'is-valid')}`}
                        required
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        placeholder=" "
                      />
                      <label>Confirm Password</label>
                      <button type="button" className="pwd-toggle"
                        onClick={() => setShowConfirm(!showConfirm)}
                        aria-label={showConfirm ? 'Hide password' : 'Show password'} tabIndex={-1}>
                        <i className={`bi ${showConfirm ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                      </button>
                    </div>
                  </div>

                  {/* Reset Button */}
                  <button
                    type="submit"
                    className="btn w-100 text-white fw-bold rounded-pill py-2 mb-2"
                    style={{ background: '#057642' }}
                    disabled={loading}>
                    {loading
                      ? <span className="spinner-border spinner-border-sm me-2"></span>
                      : <i className="bi bi-shield-check me-2"></i>}
                    Reset Password
                  </button>

                  {/* Back Button */}
                  <button
                    type="button"
                    className="btn w-100 btn-outline-secondary rounded-pill py-2"
                    onClick={() => {
                      setStep(1)
                      setError('')
                      setOtp('')
                    }}>
                    ← Generate New OTP
                  </button>

                </form>
              )}

              <div className="auth-action-banner">
                <span className="auth-action-text">Remember your password?</span>
                <Link to="/login" className="auth-action-btn">Sign In</Link>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  )
}