import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getMyApplications, withdrawApplication } from '../../services/api'
import MessageThread from '../../components/MessageThread'

const STATUS_STYLE = {
  APPLIED:             { bg:'#F1F5F9', color:'#475569', label:'Applied',             icon:'bi-send' },
  SHORTLISTED:         { bg:'#E6EDF5', color:'#123160', label:'Shortlisted',          icon:'bi-star-fill' },
  INTERVIEW_SCHEDULED: { bg:'#FEF3C7', color:'#92400e', label:'Interview Scheduled',  icon:'bi-camera-video' },
  OFFERED:             { bg:'#D1FAE5', color:'#065f46', label:'Offer Received',        icon:'bi-trophy-fill' },
  ACCEPTED:            { bg:'#E6EDF5', color:'#123160', label:'Accepted',              icon:'bi-check-circle-fill' },
  REJECTED:            { bg:'#FEE2E2', color:'#991b1b', label:'Rejected',              icon:'bi-x-circle' },
}
const scoreColor = s => s >= 70 ? '#057642' : s >= 40 ? '#d97706' : '#dc3545'
const canWithdraw = s => ['APPLIED', 'SHORTLISTED'].includes(s)

export default function MyApplications() {
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [withdrawing, setWithdrawing] = useState(null)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('ALL')
  const [sortBy, setSortBy] = useState('newest')
  const [chatOpenId, setChatOpenId] = useState(null)

  const fetchApps = () => {
    setLoading(true)
    getMyApplications()
      .then(({ data }) => { setApplications(data); setLoading(false) })
      .catch(() => { setError('Failed to load'); setLoading(false) })
  }

  useEffect(() => {
    fetchApps()
    const t = setInterval(fetchApps, 30000)
    return () => clearInterval(t)
  }, [])

  const handleWithdraw = async (id, title) => {
    if (!window.confirm(`Withdraw application for "${title}"?\n\nThis cannot be undone.`)) return
    setWithdrawing(id)
    setError('')
    try {
      await withdrawApplication(id)
      setApplications(prev => prev.filter(a => a.id !== id))
    } catch (e) {
      setError(e.response?.data || 'Cannot withdraw at this stage')
    } finally {
      setWithdrawing(null)
    }
  }

  // Filter + Sort
  const base = filter === 'ALL' ? applications : applications.filter(a => a.status === filter)
  const filtered = [...base].sort((a, b) => {
    if (sortBy === 'score-high') return b.skillMatchScore - a.skillMatchScore
    if (sortBy === 'score-low')  return a.skillMatchScore - b.skillMatchScore
    return new Date(b.appliedAt || 0) - new Date(a.appliedAt || 0)
  })

  if (loading) return (
    <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
      <div className="spinner-border" style={{ color: '#123160' }}></div>
    </div>
  )

  return (
    <div className="container py-4">
      {/* Header */}
      <div className="welcome-header mb-4">
        <div className="d-flex justify-content-between align-items-start flex-wrap gap-2">
          <div>
            <h1 className="fw-bold mb-1"><i className="bi bi-file-text me-2"></i>My Applications</h1>
            <p className="mb-0">{applications.length} total applications</p>
          </div>
          <button className="btn btn-sm btn-outline-light rounded-pill" onClick={fetchApps}>
            <i className="bi bi-arrow-clockwise me-1"></i>Refresh
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="alert alert-warning rounded-3 py-2 mb-3 d-flex align-items-center gap-2">
          <i className="bi bi-exclamation-triangle-fill"></i>
          {error}
          <button className="btn-close ms-auto btn-close-sm" aria-label="Close" onClick={() => setError('')}></button>
        </div>
      )}

      {/* Status Filter Pills */}
      <div className="d-flex flex-wrap gap-2 mb-3">
        <button className="btn btn-sm rounded-pill fw-semibold"
          style={{ background: filter === 'ALL' ? '#123160' : '#EEF3F8', color: filter === 'ALL' ? '#fff' : '#123160', border: 'none' }}
          onClick={() => setFilter('ALL')}>
          All ({applications.length})
        </button>
        {Object.entries(STATUS_STYLE).map(([status, style]) => {
          const count = applications.filter(a => a.status === status).length
          if (count === 0) return null
          return (
            <button key={status} className="btn btn-sm rounded-pill fw-semibold"
              style={{
                background: filter === status ? style.color : style.bg,
                color: filter === status ? '#fff' : style.color,
                border: `1px solid ${style.color}33`
              }}
              onClick={() => setFilter(filter === status ? 'ALL' : status)}>
              <i className={`bi ${style.icon} me-1`}></i>
              {style.label} ({count})
            </button>
          )
        })}
      </div>

      {/* Sort + Count row */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <span className="text-muted small">{filtered.length} results</span>
        <select className="form-select form-select-sm rounded-pill" style={{ maxWidth: 190, fontSize: '0.82rem' }}
          value={sortBy} onChange={e => setSortBy(e.target.value)}>
          <option value="newest">Sort: Newest First</option>
          <option value="score-high">Sort: Score High→Low</option>
          <option value="score-low">Sort: Score Low→High</option>
        </select>
      </div>

      {/* Offer Alert */}
      {applications.filter(a => a.status === 'OFFERED').length > 0 && (
        <div className="rounded-3 p-3 mb-4 d-flex align-items-center justify-content-between gap-3 flex-wrap"
          style={{ background: '#D1FAE5', border: '1px solid #6EE7B7' }}>
          <div className="d-flex align-items-center gap-2">
            <i className="bi bi-trophy-fill fs-5" style={{ color: '#057642' }}></i>
            <div className="fw-bold small" style={{ color: '#065f46' }}>
              You have {applications.filter(a => a.status === 'OFFERED').length} pending offer(s)! Go respond!
            </div>
          </div>
          <Link to="/seeker/offers" className="btn btn-sm fw-semibold rounded-pill flex-shrink-0"
            style={{ background: '#057642', color: '#fff', border: 'none' }}>
            View Offers <i className="bi bi-arrow-right ms-1"></i>
          </Link>
        </div>
      )}

      {/* Empty State */}
      {filtered.length === 0 ? (
        <div className="text-center py-5">
          <i className="bi bi-file-text fs-1 text-muted mb-3 d-block"></i>
          <h5 className="text-muted">
            {filter === 'ALL' ? 'No applications yet' : `No applications with status "${filter}"`}
          </h5>
          {filter === 'ALL' && (
            <Link to="/jobs" className="btn text-white rounded-pill px-4 mt-2" style={{ background: '#123160' }}>
              Browse Jobs
            </Link>
          )}
        </div>
      ) : (
        <div className="d-flex flex-column gap-3">
          {filtered.map(app => {
            const style = STATUS_STYLE[app.status] || STATUS_STYLE.APPLIED
            return (
              <div key={app.id} className="card border-0 shadow-sm rounded-4"
                style={{ opacity: withdrawing === app.id ? 0.5 : 1, borderLeft: `4px solid ${style.color}` }}>
                <div className="card-body p-4">
                  <div className="row align-items-center g-3">
                    {/* Job Info */}
                    <div className="col-12 col-md-4">
                      <div className="fw-bold" style={{ fontSize: '1rem' }}>{app.jobTitle}</div>
                      <div className="text-muted small">
                        <span className="company-badge"><i className="bi bi-building"></i>{app.companyName}</span>
                      </div>
                      <div className="mt-2">
                        <span className="badge rounded-pill px-3 py-1"
                          style={{ background: style.bg, color: style.color, fontSize: '0.75rem' }}>
                          <i className={`bi ${style.icon} me-1`}></i>{style.label}
                        </span>
                      </div>
                    </div>

                    {/* Match Score */}
                    <div className="col-6 col-md-2 text-center">
                      <div className="fw-bold" style={{ color: scoreColor(app.skillMatchScore), fontSize: '1.3rem' }}>
                        {app.skillMatchScore}%
                      </div>
                      <div className="text-muted" style={{ fontSize: '0.72rem' }}>Skill Match</div>
                    </div>

                    {/* Date */}
                    <div className="col-6 col-md-2 text-muted small text-center">
                      <i className="bi bi-calendar me-1"></i>
                      {app.appliedAt
                        ? new Date(app.appliedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                        : '—'}
                    </div>

                    {/* Actions */}
                    <div className="col-12 col-md-4 d-flex gap-2 justify-content-md-end flex-wrap">
                      {app.status === 'OFFERED' && (
                        <Link to="/seeker/offers" className="btn btn-sm rounded-pill fw-semibold text-white"
                          style={{ background: '#057642', fontSize: '0.8rem' }}>
                          <i className="bi bi-trophy me-1"></i>View Offer
                        </Link>
                      )}
                      {canWithdraw(app.status) && (
                        <button className="btn btn-sm rounded-pill fw-semibold"
                          style={{ background: '#FEE2E2', color: '#991b1b', border: '1px solid #fca5a5', fontSize: '0.8rem' }}
                          disabled={withdrawing === app.id}
                          onClick={() => handleWithdraw(app.id, app.jobTitle)}>
                          {withdrawing === app.id
                            ? <span className="spinner-border spinner-border-sm me-1" style={{ width: 10, height: 10 }}></span>
                            : <i className="bi bi-x-circle me-1"></i>}
                          Withdraw
                        </button>
                      )}
                      <button type="button" className="btn btn-sm rounded-pill fw-semibold"
                        style={{ background: '#EEF3F8', color: '#123160', border: '1px solid #D0D9E0', fontSize: '0.8rem' }}
                        onClick={() => setChatOpenId(chatOpenId === app.id ? null : app.id)}>
                        <i className="bi bi-chat-dots me-1"></i>{chatOpenId === app.id ? 'Hide Chat' : 'Message'}
                      </button>
                    </div>
                  </div>

                  {chatOpenId === app.id && (
                    <div className="mt-3">
                      <MessageThread applicationId={app.id} />
                    </div>
                  )}

                  {/* Employer Note */}
                  {app.employerNote && (
                    <div className="mt-3 p-3 rounded-3" style={{ background: '#EEF3F8' }}>
                      <small className="fw-semibold" style={{ color: '#123160' }}>
                        <i className="bi bi-chat-square-text me-1"></i>Employer Note:{' '}
                      </small>
                      <small className="text-muted">{app.employerNote}</small>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}