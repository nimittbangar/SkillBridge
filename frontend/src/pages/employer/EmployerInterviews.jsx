import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getEmployerInterviewsList, updateInterview } from '../../services/api'

const modeIcons = { VIDEO:'bi-camera-video', PHONE:'bi-telephone', IN_PERSON:'bi-geo-alt' }

export default function EmployerInterviews() {
  const [interviews, setInterviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(null)
  const [feedbackInputs, setFeedbackInputs] = useState({})

  const fetchInterviews = () => {
    setLoading(true)
    getEmployerInterviewsList()
      .then(({ data }) => { setInterviews(data); setLoading(false) })
      .catch(() => setLoading(false))
  }
  useEffect(() => { fetchInterviews() }, [])

  const handleUpdate = async (id, status, result) => {
    setUpdating(id)
    try {
      await updateInterview(id, { status, result, feedback: feedbackInputs[id] || '' })
      fetchInterviews()
    } catch (e) { alert('Failed to update') } finally { setUpdating(null) }
  }

  const statusColor = { SCHEDULED:'warning', COMPLETED:'success', CANCELLED:'danger', RESCHEDULED:'info' }
  const resultColor = { PASS:'success', FAIL:'danger', PENDING:'secondary' }

  return (
    <div className="container-fluid p-0">
      <div className="d-flex">
        <div className="sidebar d-none d-md-block">
          <p className="text-muted small fw-bold text-uppercase px-2 mb-2" style={{ fontSize:'0.7rem', letterSpacing:'0.8px' }}>Menu</p>
          <nav className="nav flex-column">
            {[
              { to:'/employer/dashboard', icon:'bi-speedometer2', label:'Dashboard' },
              { to:'/employer/post-job', icon:'bi-plus-circle', label:'Post a Job' },
              { to:'/employer/interviews', icon:'bi-camera-video', label:'My Interviews' },
              { to:'/profile', icon:'bi-building', label:'Company Profile' },
            ].map((item,i) => (
              <Link key={i} to={item.to} className="nav-link"><i className={`bi ${item.icon}`}></i>{item.label}</Link>
            ))}
          </nav>
        </div>
        <div className="flex-fill main-content p-3">
          <div className="welcome-header">
            <h1 className="fw-bold mb-1"><i className="bi bi-camera-video me-2"></i>Scheduled Interviews</h1>
            <p className="mb-0">{interviews.length} interviews — update status and add feedback</p>
          </div>

          {/* Stats */}
          <div className="row g-3 mb-4">
            {[
              { label:'Scheduled', value: interviews.filter(i=>i.status==='SCHEDULED').length, color:'#0F766E' },
              { label:'Completed', value: interviews.filter(i=>i.status==='COMPLETED').length, color:'#057642' },
              { label:'Cancelled', value: interviews.filter(i=>i.status==='CANCELLED').length, color:'#dc3545' },
              { label:'Passed', value: interviews.filter(i=>i.result==='PASS').length, color:'#123160' },
            ].map((s,i) => (
              <div key={i} className="col-6 col-md-3">
                <div className="stat-card">
                  <div className="number" style={{ color:s.color }}>{s.value}</div>
                  <div className="label">{s.label}</div>
                </div>
              </div>
            ))}
          </div>

          {loading ? (
            <div className="text-center py-5"><div className="spinner-border" style={{ color:'#123160' }}></div></div>
          ) : interviews.length === 0 ? (
            <div className="text-center py-5">
              <i className="bi bi-camera-video fs-1 text-muted mb-3 d-block"></i>
              <h5 className="text-muted">No interviews scheduled yet</h5>
              <p className="text-muted small">Go to applicants and schedule interviews</p>
            </div>
          ) : (
            <div className="d-flex flex-column gap-3">
              {interviews.map(iv => (
                <div key={iv.id} className="card border-0 shadow-sm rounded-4">
                  <div className="card-body p-4">
                    <div className="row align-items-start g-3">
                      <div className="col-12 col-md-4">
                        <div className="fw-bold">{iv.jobTitle}</div>
                        {iv.companyName && <span className="company-badge mt-1 d-inline-flex"><i className="bi bi-building"></i>{iv.companyName}</span>}
                        <div className="text-muted small">
                          <i className="bi bi-person me-1"></i>{iv.seekerName}
                        </div>
                        <div className="mt-2 d-flex gap-2 flex-wrap">
                          <span className={`badge bg-${statusColor[iv.status]||'secondary'} rounded-pill`} style={{ fontSize:'0.72rem' }}>
                            {iv.status}
                          </span>
                          <span className={`badge bg-${resultColor[iv.result]||'secondary'} rounded-pill`} style={{ fontSize:'0.72rem' }}>
                            Result: {iv.result}
                          </span>
                        </div>
                      </div>
                      <div className="col-12 col-md-3">
                        <div className="text-muted small mb-1">
                          <i className={`bi ${modeIcons[iv.mode]||'bi-camera-video'} me-1`}></i>
                          {iv.mode} Interview
                        </div>
                        <div className="text-muted small">
                          <i className="bi bi-calendar me-1"></i>
                          {iv.scheduledDateTime ? new Date(iv.scheduledDateTime).toLocaleString('en-IN') : '—'}
                        </div>
                        {iv.meetingLink && (
                          <a href={iv.meetingLink} target="_blank" rel="noreferrer"
                            className="btn btn-sm rounded-pill mt-2"
                            style={{ background:'#EEF3F8', color:'#123160', fontSize:'0.75rem' }}>
                            <i className="bi bi-link me-1"></i>Meeting Link
                          </a>
                        )}
                      </div>
                      <div className="col-12 col-md-5">
                        <div className="row g-2">
                          <div className="col-12">
                            <label className="form-label small text-muted mb-1">Feedback / Notes</label>
                            <textarea className="form-control form-control-sm rounded-3" rows={2}
                              placeholder="Add interview feedback..."
                              value={feedbackInputs[iv.id] ?? (iv.feedback || '')}
                              onChange={e => setFeedbackInputs({ ...feedbackInputs, [iv.id]: e.target.value })} />
                          </div>
                          <div className="col-6">
                            <label className="form-label small text-muted mb-1">Status</label>
                            <select className="form-select form-select-sm rounded-3"
                              value={iv.status}
                              onChange={e => handleUpdate(iv.id, e.target.value, iv.result)}>
                              <option value="SCHEDULED">Scheduled</option>
                              <option value="COMPLETED">Completed</option>
                              <option value="CANCELLED">Cancelled</option>
                              <option value="RESCHEDULED">Rescheduled</option>
                            </select>
                          </div>
                          <div className="col-6">
                            <label className="form-label small text-muted mb-1">Result</label>
                            <select className="form-select form-select-sm rounded-3"
                              value={iv.result || 'PENDING'}
                              onChange={e => handleUpdate(iv.id, iv.status, e.target.value)}>
                              <option value="PENDING">Pending</option>
                              <option value="PASS">Pass ✅</option>
                              <option value="FAIL">Fail ❌</option>
                            </select>
                          </div>
                          <div className="col-12">
                            <button className="btn btn-sm w-100 text-white rounded-pill fw-semibold"
                              style={{ background:'#123160', fontSize:'0.8rem' }}
                              disabled={updating===iv.id}
                              onClick={() => handleUpdate(iv.id, iv.status, iv.result)}>
                              {updating===iv.id
                                ? <span className="spinner-border spinner-border-sm me-1"></span>
                                : <i className="bi bi-check-circle me-1"></i>}
                              Save Changes
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}