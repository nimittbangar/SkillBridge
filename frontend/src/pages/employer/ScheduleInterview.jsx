import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { scheduleInterview } from '../../services/api'

export default function ScheduleInterview() {
  const { applicationId } = useParams()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    applicationId,
    scheduledDateTime: '',
    mode: 'VIDEO',
    meetingLink: '',
    venue: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [copied, setCopied] = useState(false)
  const [linkPlatform, setLinkPlatform] = useState('googlemeet')

  useEffect(() => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const yr = tomorrow.getFullYear()
    const mo = String(tomorrow.getMonth() + 1).padStart(2, '0')
    const dy = String(tomorrow.getDate()).padStart(2, '0')
    setForm(f => ({ ...f, scheduledDateTime: `${yr}-${mo}-${dy}T10:00` }))
  }, [])

  const handleCopy = () => {
    navigator.clipboard.writeText(form.meetingLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Quick insert placeholder links for reference
  const PLATFORM_LINKS = {
    googlemeet: 'https://meet.google.com/',
    zoom:       'https://zoom.us/j/',
    jitsi:      'https://meet.jit.si/',
    teams:      'https://teams.microsoft.com/l/meetup-join/',
  }

  const handlePlatformClick = (platform) => {
    setLinkPlatform(platform)
    // Set placeholder so employer knows what format to use
    setForm(f => ({ ...f, meetingLink: PLATFORM_LINKS[platform] }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!form.scheduledDateTime) { setError('Please select interview date and time'); return }
    if (new Date(form.scheduledDateTime) <= new Date()) {
      setError('Interview date must be in the future'); return
    }
    if (form.mode === 'VIDEO' && !form.meetingLink.trim()) {
      setError('Please paste a real meeting link'); return
    }
    if (form.mode === 'VIDEO' && !form.meetingLink.startsWith('http')) {
      setError('Please enter a valid URL starting with https://'); return
    }
    if (form.mode === 'IN_PERSON' && !form.venue.trim()) {
      setError('Please provide venue/address'); return
    }

    setLoading(true)
    try {
      await scheduleInterview({
        applicationId: form.applicationId,
        mode: form.mode,
        meetingLink: form.mode === 'VIDEO' ? form.meetingLink.trim() : '',
        venue: form.mode === 'IN_PERSON' ? form.venue.trim() : '',
        scheduledDateTime: form.scheduledDateTime
      })
      setSuccess(true)
      setTimeout(() => navigate('/employer/dashboard'), 2500)
    } catch (err) {
      setError(err.response?.data || 'Failed to schedule interview. Please try again.')
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
              <i className="bi bi-check-circle-fill" style={{ fontSize: 36, color: '#057642' }}></i>
            </div>
            <h4 className="fw-bold mb-2">Interview Scheduled! 🎉</h4>
            <p className="text-muted mb-3">
              Candidate has been notified with all interview details.
            </p>
            <div className="spinner-border spinner-border-sm" style={{ color: '#123160' }}></div>
            <div className="text-muted small mt-2">Redirecting to dashboard...</div>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="container-fluid p-0">
      <div className="d-flex">
        <div className="sidebar d-none d-md-block">
          <p className="text-muted small fw-bold text-uppercase px-2 mb-2"
            style={{ fontSize: '0.7rem', letterSpacing: '0.8px' }}>Menu</p>
          <nav className="nav flex-column">
            {[
              { to: '/employer/dashboard',      icon: 'bi-speedometer2', label: 'Dashboard' },
              { to: '/employer/post-job',        icon: 'bi-plus-circle',  label: 'Post a Job' },
              { to: '/employer/interviews',      icon: 'bi-camera-video', label: 'Interviews' },
              { to: '/employer/company-profile', icon: 'bi-building',     label: 'Company Profile' },
            ].map((item, i) => (
              <Link key={i} to={item.to} className="nav-link">
                <i className={`bi ${item.icon}`}></i>{item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex-fill main-content p-3">
          <div className="d-flex align-items-center gap-3 mb-4 flex-wrap">
            <button onClick={() => navigate(-1)} className="btn btn-sm btn-outline-secondary rounded-pill">
              <i className="bi bi-arrow-left me-1"></i>Back
            </button>
            <div>
              <h4 className="fw-bold mb-0">
                <i className="bi bi-calendar-plus me-2" style={{ color: '#123160' }}></i>
                Schedule Interview
              </h4>
              <p className="text-muted small mb-0">Candidate will be notified automatically</p>
            </div>
          </div>

          {error && (
            <div className="alert alert-danger rounded-3 mb-4 d-flex align-items-center gap-2">
              <i className="bi bi-exclamation-triangle-fill"></i>
              <span>{error}</span>
              <button className="btn-close ms-auto" onClick={() => setError('')}></button>
            </div>
          )}

          <div className="row g-4">
            <div className="col-lg-7">
              <div className="card border-0 shadow-sm rounded-4">
                <div className="card-body p-4">
                  <form onSubmit={handleSubmit}>

                    {/* Step 1: Mode */}
                    <div className="mb-4">
                      <label className="form-label fw-bold">
                        <span className="badge rounded-pill me-2 text-white" style={{ background: '#123160' }}>1</span>
                        Interview Mode
                      </label>
                      <div className="d-flex gap-3">
                        {[
                          { value: 'VIDEO',     icon: 'bi-camera-video-fill', label: 'Video Call', color: '#123160' },
                          { value: 'PHONE',     icon: 'bi-telephone-fill',    label: 'Phone Call', color: '#057642' },
                          { value: 'IN_PERSON', icon: 'bi-geo-alt-fill',      label: 'In Person',  color: '#d97706' },
                        ].map(m => (
                          <div key={m.value}
                            className="flex-fill text-center rounded-3 p-3"
                            style={{
                              cursor: 'pointer',
                              border: form.mode === m.value ? `2px solid ${m.color}` : '1.5px solid #e2e8f0',
                              background: form.mode === m.value ? m.color + '11' : 'transparent',
                              transition: 'all 0.15s'
                            }}
                            onClick={() => setForm({ ...form, mode: m.value })}>
                            <i className={`bi ${m.icon} d-block mb-1 fs-4`}
                              style={{ color: form.mode === m.value ? m.color : '#adb5bd' }}></i>
                            <div className="fw-semibold small"
                              style={{ color: form.mode === m.value ? m.color : '#6c757d' }}>
                              {m.label}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Step 2: Date & Time */}
                    <div className="mb-4">
                      <label className="form-label fw-bold">
                        <span className="badge rounded-pill me-2 text-white" style={{ background: '#123160' }}>2</span>
                        Date & Time <span className="text-danger">*</span>
                      </label>
                      <input
                        type="datetime-local"
                        className="form-control form-control-lg rounded-3"
                        value={form.scheduledDateTime}
                        min={new Date().toISOString().slice(0, 16)}
                        onChange={e => setForm({ ...form, scheduledDateTime: e.target.value })}
                        required />
                      {form.scheduledDateTime && (
                        <small className="text-success mt-1 d-block">
                          <i className="bi bi-check-circle me-1"></i>
                          {new Date(form.scheduledDateTime).toLocaleString('en-IN', {
                            weekday: 'long', day: 'numeric', month: 'long',
                            year: 'numeric', hour: '2-digit', minute: '2-digit'
                          })}
                        </small>
                      )}
                    </div>

                    {/* Step 3: Meeting Details */}
                    <div className="mb-4">
                      <label className="form-label fw-bold">
                        <span className="badge rounded-pill me-2 text-white" style={{ background: '#123160' }}>3</span>
                        {form.mode === 'VIDEO' ? 'Meeting Link' : form.mode === 'PHONE' ? 'Call Instructions' : 'Venue / Address'}
                        {(form.mode === 'VIDEO' || form.mode === 'IN_PERSON') && <span className="text-danger ms-1">*</span>}
                      </label>

                      {form.mode === 'VIDEO' && (
                        <>
                          {/* Platform quick-select buttons */}
                          <div className="d-flex gap-2 mb-3 flex-wrap">
                            {[
                              { type: 'googlemeet', label: 'Google Meet', emoji: '🎥' },
                              { type: 'zoom',       label: 'Zoom',        emoji: '📹' },
                              { type: 'jitsi',      label: 'Jitsi (Free)',emoji: '🆓' },
                              { type: 'teams',      label: 'MS Teams',    emoji: '💼' },
                            ].map(p => (
                              <button key={p.type} type="button"
                                className="btn btn-sm rounded-pill fw-semibold"
                                style={{
                                  background: linkPlatform === p.type ? '#123160' : '#EEF3F8',
                                  color: linkPlatform === p.type ? '#fff' : '#123160',
                                  border: 'none', fontSize: '0.78rem', padding: '5px 14px'
                                }}
                                onClick={() => handlePlatformClick(p.type)}>
                                {p.emoji} {p.label}
                              </button>
                            ))}
                          </div>

                          {/* Link input */}
                          <div className="input-group mb-2">
                            <input
                              className="form-control rounded-start-3"
                              placeholder="Paste your real meeting link here..."
                              value={form.meetingLink}
                              onChange={e => setForm({ ...form, meetingLink: e.target.value })}
                              required />
                            <button type="button"
                              className="btn rounded-end-3 text-white"
                              style={{ background: copied ? '#057642' : '#123160' }}
                              onClick={handleCopy}
                              disabled={!form.meetingLink}>
                              <i className={`bi ${copied ? 'bi-check' : 'bi-copy'} me-1`}></i>
                              {copied ? 'Copied!' : 'Copy'}
                            </button>
                          </div>

                          {/* Warning - must be real link */}
                          <div className="rounded-3 p-3 mb-2" style={{ background: '#FEF3C7', border: '1px solid #FCD34D' }}>
                            <div className="fw-bold small mb-1" style={{ color: '#92400e' }}>
                              <i className="bi bi-exclamation-triangle-fill me-1"></i>
                              Important — Use a REAL meeting link!
                            </div>
                            <div className="small" style={{ color: '#78350f' }}>
                              The link you paste here will be sent to the candidate via notification and email.
                              Make sure it is a working link before submitting.
                            </div>
                          </div>

                          {/* How to create links */}
                          <div className="rounded-3 p-3" style={{ background: '#EEF3F8' }}>
                            <div className="fw-bold small mb-2" style={{ color: '#123160' }}>
                              <i className="bi bi-lightbulb-fill me-1"></i>
                              How to get a real link:
                            </div>
                            <ul className="mb-0 small ps-3" style={{ color: '#475569', lineHeight: 2 }}>
                              <li><strong>Google Meet:</strong> Go to <a href="https://meet.google.com" target="_blank" rel="noreferrer" style={{ color: '#123160' }}>meet.google.com</a> → Click "New Meeting" → Copy link</li>
                              <li><strong>Zoom:</strong> Go to <a href="https://zoom.us" target="_blank" rel="noreferrer" style={{ color: '#123160' }}>zoom.us</a> → Start/Schedule Meeting → Copy invite link</li>
                              <li><strong>Jitsi (Free, no account):</strong> Go to <a href="https://meet.jit.si" target="_blank" rel="noreferrer" style={{ color: '#123160' }}>meet.jit.si</a> → Type a room name → Copy link</li>
                            </ul>
                          </div>

                          {/* Preview link */}
                          {form.meetingLink && form.meetingLink.startsWith('http') && (
                            <div className="mt-2 p-2 rounded-3 d-flex align-items-center gap-2"
                              style={{ background: '#D1FAE5', border: '1px solid #6EE7B7' }}>
                              <i className="bi bi-link-45deg" style={{ color: '#057642' }}></i>
                              <a href={form.meetingLink} target="_blank" rel="noreferrer"
                                className="text-truncate small fw-semibold" style={{ color: '#057642' }}>
                                {form.meetingLink}
                              </a>
                              <span className="badge ms-auto" style={{ background: '#057642', color: '#fff', fontSize: '0.65rem' }}>
                                Test link ↗
                              </span>
                            </div>
                          )}
                        </>
                      )}

                      {form.mode === 'PHONE' && (
                        <textarea className="form-control rounded-3" rows={3}
                          placeholder="e.g. We will call you on your registered mobile number at the scheduled time. Please keep your phone available."
                          value={form.meetingLink}
                          onChange={e => setForm({ ...form, meetingLink: e.target.value })} />
                      )}

                      {form.mode === 'IN_PERSON' && (
                        <textarea className="form-control rounded-3" rows={3} required
                          placeholder="e.g. 3rd Floor, TechCorp Office, MG Road, Bangalore - 560001. Landmark: Near Forum Mall. Ask for HR at reception."
                          value={form.venue}
                          onChange={e => setForm({ ...form, venue: e.target.value })} />
                      )}
                    </div>

                    {/* Submit */}
                    <div className="d-flex gap-3 flex-wrap">
                      <button type="submit"
                        className="btn fw-bold px-5 rounded-pill text-white"
                        style={{ background: '#123160', fontSize: '1rem' }}
                        disabled={loading}>
                        {loading
                          ? <><span className="spinner-border spinner-border-sm me-2"></span>Scheduling...</>
                          : <><i className="bi bi-calendar-check me-2"></i>Schedule Interview</>}
                      </button>
                      <Link to="/employer/dashboard"
                        className="btn btn-outline-secondary fw-bold px-4 rounded-pill">
                        Cancel
                      </Link>
                    </div>
                  </form>
                </div>
              </div>
            </div>

            {/* Info Panel */}
            <div className="col-lg-5">
              <div className="card border-0 rounded-4 mb-3" style={{ background: '#EEF3F8' }}>
                <div className="card-body p-4">
                  <h6 className="fw-bold mb-3" style={{ color: '#123160' }}>
                    <i className="bi bi-send-fill me-2"></i>What happens after scheduling?
                  </h6>
                  <div className="d-flex flex-column gap-3">
                    {[
                      { icon: 'bi-bell-fill',        color: '#123160', text: 'Candidate gets instant notification in the app' },
                      { icon: 'bi-envelope-fill',    color: '#057642', text: 'Email with date, time and meeting link is sent automatically' },
                      { icon: 'bi-kanban-fill',      color: '#d97706', text: 'Application status updates to INTERVIEW SCHEDULED' },
                      { icon: 'bi-camera-video-fill',color: '#7C3AED', text: 'Interview appears in your Interviews tab for tracking' },
                    ].map((item, i) => (
                      <div key={i} className="d-flex align-items-start gap-3">
                        <div className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                          style={{ width: 36, height: 36, background: item.color + '22' }}>
                          <i className={`bi ${item.icon}`} style={{ color: item.color, fontSize: 16 }}></i>
                        </div>
                        <p className="text-muted small mb-0" style={{ lineHeight: 1.5 }}>{item.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}