import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { getMyApplications, getMyInterviews, getProfile } from '../../services/api'
import { useAuth } from '../../context/AuthContext'

const STATUS_COLORS = {
  APPLIED:'secondary', SHORTLISTED:'info', INTERVIEW_SCHEDULED:'primary',
  OFFERED:'success', REJECTED:'danger', ACCEPTED:'primary'
}
const scoreColor = s => s>=70?'#057642':s>=40?'#d97706':'#dc3545'

export default function SeekerDashboard() {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [applications, setApplications] = useState([])
  const [interviews, setInterviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState(null)
  const prevDataRef = useRef('')

  const fetchAll = useCallback(async (showLoader = false) => {
    if (showLoader) setLoading(true)
    try {
      const [p, a, i] = await Promise.all([
        getProfile(),
        getMyApplications(),
        getMyInterviews(),
      ])
      // Smart refresh — only update state if data actually changed
      const newData = JSON.stringify({ apps: a.data, interviews: i.data })
      if (newData !== prevDataRef.current) {
        prevDataRef.current = newData
        setProfile(p.data)
        setApplications(a.data || [])
        setInterviews(i.data || [])
        setLastUpdated(new Date())
      } else {
        // still update profile silently
        setProfile(p.data)
      }
    } catch(e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAll(true)
    // Poll every 10 seconds for faster updates
    const t = setInterval(() => fetchAll(false), 10000)
    return () => clearInterval(t)
  }, [fetchAll])

  const counts = {
    applied:     applications.filter(a => a.status === 'APPLIED').length,
    shortlisted: applications.filter(a => a.status === 'SHORTLISTED').length,
    interviews:  applications.filter(a => a.status === 'INTERVIEW_SCHEDULED').length,
    offered:     applications.filter(a => a.status === 'OFFERED').length,
    accepted:    applications.filter(a => a.status === 'ACCEPTED').length,
    rejected:    applications.filter(a => a.status === 'REJECTED').length,
    total:       applications.length,
  }

  if (loading) return (
    <div className="d-flex justify-content-center align-items-center" style={{minHeight:'60vh'}}>
      <div className="spinner-border" style={{color:'#123160'}}></div>
    </div>
  )

  return (
    <div className="container-fluid p-0">
      <div className="d-flex">
        <div className="sidebar d-none d-md-block">
          <p className="text-muted small fw-bold text-uppercase px-2 mb-2"
            style={{fontSize:'0.7rem',letterSpacing:'0.8px'}}>Seeker Menu</p>
          <nav className="nav flex-column">
            {[
              {to:'/seeker/dashboard',    icon:'bi-speedometer2', label:'Dashboard'},
              {to:'/jobs',                icon:'bi-search',       label:'Browse Jobs'},
              {to:'/seeker/applications', icon:'bi-file-text',    label:'My Applications'},
              {to:'/seeker/interviews',   icon:'bi-camera-video', label:'My Interviews'},
              {to:'/seeker/offers',       icon:'bi-trophy',       label:'My Offers'},
              {to:'/seeker/saved-jobs',   icon:'bi-bookmark',     label:'Saved Jobs'},
              {to:'/career-room',         icon:'bi-stars',        label:'Career Room'},
              {to:'/profile',             icon:'bi-person',       label:'My Profile'},
              {to:'/change-password',     icon:'bi-shield-lock',  label:'Change Password'},
            ].map((item,i)=>(
              <Link key={i} to={item.to} className="nav-link">
                <i className={`bi ${item.icon}`}></i>{item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex-fill main-content p-3">
          <div className="welcome-header">
            <div className="d-flex justify-content-between align-items-start flex-wrap gap-2">
              <div>
                <h1 className="fw-bold mb-1">Welcome back, {user?.name?.split(' ')[0]}! 👋</h1>
                <p className="mb-0">
                  {lastUpdated && (
                    <small className="opacity-75">
                      Last updated: {lastUpdated.toLocaleTimeString()}
                      <span className="ms-2 badge rounded-pill" style={{background:'rgba(255,255,255,0.2)',fontSize:'0.65rem'}}>
                        Auto-refreshing every 10s
                      </span>
                    </small>
                  )}
                </p>
              </div>
              <button className="btn btn-sm btn-outline-light rounded-pill" onClick={() => fetchAll(false)}>
                <i className="bi bi-arrow-clockwise me-1"></i>Refresh
              </button>
            </div>
          </div>

          {/* ── ALL 6 STATUS COUNTS ── */}
          <div className="row g-2 mb-4">
            {[
              {label:'Applied',     value:counts.applied,     color:'#123160', bg:'#EEF3F8', icon:'bi-send',              link:'/seeker/applications'},
              {label:'Shortlisted', value:counts.shortlisted, color:'#123160', bg:'#E6EDF5', icon:'bi-star-fill',         link:'/seeker/applications'},
              {label:'Interviews',  value:counts.interviews,  color:'#0F766E', bg:'#CCFBF1', icon:'bi-camera-video',      link:'/seeker/interviews'},
              {label:'Offered',     value:counts.offered,     color:'#057642', bg:'#D1FAE5', icon:'bi-trophy-fill',       link:'/seeker/offers'},
              {label:'Accepted',    value:counts.accepted,    color:'#123160', bg:'#E6EDF5', icon:'bi-check-circle-fill', link:'/seeker/offers'},
              {label:'Rejected',    value:counts.rejected,    color:'#991b1b', bg:'#FEE2E2', icon:'bi-x-circle',         link:'/seeker/applications'},
            ].map((s,i)=>(
              <div key={i} className="col-4 col-md-2">
                <Link to={s.link} className="text-decoration-none">
                  <div className="text-center p-2 rounded-3 h-100"
                    style={{background:s.bg,cursor:'pointer',transition:'transform 0.15s'}}
                    onMouseOver={e=>e.currentTarget.style.transform='translateY(-2px)'}
                    onMouseOut={e=>e.currentTarget.style.transform='translateY(0)'}>
                    <i className={`bi ${s.icon} d-block mb-1`} style={{color:s.color,fontSize:'1.1rem'}}></i>
                    <div className="fw-bold" style={{color:s.color,fontSize:'1.3rem'}}>{s.value}</div>
                    <div style={{fontSize:'0.65rem',color:s.color,lineHeight:1.2}}>{s.label}</div>
                  </div>
                </Link>
              </div>
            ))}
          </div>

          {/* Offer alert */}
          {counts.offered > 0 && (
            <div className="rounded-3 p-3 mb-4 d-flex align-items-center justify-content-between gap-3 flex-wrap"
              style={{background:'#D1FAE5',border:'1px solid #6EE7B7'}}>
              <div className="d-flex align-items-center gap-2">
                <i className="bi bi-trophy-fill fs-4" style={{color:'#057642'}}></i>
                <div>
                  <div className="fw-bold" style={{color:'#065f46'}}>
                    You have {counts.offered} pending job offer{counts.offered>1?'s':''}!
                  </div>
                  <div className="small" style={{color:'#065f46'}}>Accept or decline from My Offers page</div>
                </div>
              </div>
              <Link to="/seeker/offers" className="btn btn-sm fw-semibold rounded-pill flex-shrink-0"
                style={{background:'#057642',color:'#fff',border:'none'}}>
                View Offers <i className="bi bi-arrow-right ms-1"></i>
              </Link>
            </div>
          )}

          {/* Skills */}
          <div className="card border-0 shadow-sm rounded-3 mb-4">
            <div className="card-body p-4">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h6 className="fw-bold mb-0">My Skills</h6>
                <Link to="/profile" className="btn btn-sm rounded-pill fw-semibold"
                  style={{background:'#EEF3F8',color:'#123160',border:'none',fontSize:'0.78rem'}}>
                  <i className="bi bi-pencil me-1"></i>Edit Skills
                </Link>
              </div>
              <div className="d-flex flex-wrap gap-2">
                {(profile?.skillsList||[]).length===0 ? (
                  <span className="text-muted small">
                    No skills yet. <Link to="/profile" style={{color:'#123160'}}>Add skills →</Link>
                  </span>
                ) : (
                  (profile?.skillsList||[]).map((s,i)=>(
                    <span key={i} className={`skill-badge ${(profile?.verifiedSkillsList||[]).includes(s)?'verified':'unverified'}`}>
                      {(profile?.verifiedSkillsList||[]).includes(s)&&<i className="bi bi-patch-check-fill me-1"></i>}
                      {s}
                    </span>
                  ))
                )}
              </div>
              <small className="text-muted d-block mt-2">
                <i className="bi bi-patch-check-fill text-success me-1"></i> = Admin verified (1.5x match score)
              </small>
            </div>
          </div>

          {/* Recent Applications */}
          <div className="card border-0 shadow-sm rounded-3 mb-4">
            <div className="card-body p-4">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h6 className="fw-bold mb-0">Recent Applications ({counts.total})</h6>
                <Link to="/seeker/applications" className="btn btn-sm rounded-pill fw-semibold"
                  style={{background:'#EEF3F8',color:'#123160',border:'none',fontSize:'0.78rem'}}>
                  View All
                </Link>
              </div>
              {applications.length===0 ? (
                <div className="text-center py-3">
                  <i className="bi bi-file-text fs-2 text-muted mb-2 d-block"></i>
                  <p className="text-muted small mb-2">No applications yet</p>
                  <Link to="/jobs" className="btn btn-sm text-white rounded-pill" style={{background:'#123160'}}>
                    Browse Jobs
                  </Link>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0" style={{fontSize:'0.85rem'}}>
                    <thead className="table-light">
                      <tr>
                        <th>Job</th>
                        <th className="d-none d-md-table-cell">Company</th>
                        <th>Match</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {applications.slice(0,5).map(app=>(
                        <tr key={app.id}>
                          <td className="fw-semibold">{app.jobTitle}</td>
                          <td className="d-none d-md-table-cell text-muted">{app.companyName}</td>
                          <td><span className="fw-bold" style={{color:scoreColor(app.skillMatchScore)}}>{app.skillMatchScore}%</span></td>
                          <td>
                            <span className={`badge bg-${STATUS_COLORS[app.status]||'secondary'} rounded-pill`}
                              style={{fontSize:'0.7rem'}}>
                              {app.status?.replace(/_/g,' ')}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Upcoming Interviews */}
          <div className="card border-0 shadow-sm rounded-3">
            <div className="card-body p-4">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h6 className="fw-bold mb-0">Upcoming Interviews ({interviews.length})</h6>
                <Link to="/seeker/interviews" className="btn btn-sm rounded-pill fw-semibold"
                  style={{background:'#EEF3F8',color:'#123160',border:'none',fontSize:'0.78rem'}}>
                  View All
                </Link>
              </div>
              {interviews.length===0 ? (
                <p className="text-muted small text-center py-2 mb-0">No interviews scheduled yet</p>
              ) : (
                <div className="row g-3">
                  {interviews.filter(iv=>iv.status==='SCHEDULED').slice(0,3).map(iv=>(
                    <div key={iv.id} className="col-12 col-md-4">
                      <div className="border rounded-3 p-3" style={{fontSize:'0.85rem'}}>
                        <div className="fw-bold mb-1">{iv.jobTitle}</div>
                        <div className="text-muted small mb-2">
                          <i className="bi bi-calendar me-1"></i>
                          {iv.scheduledDateTime
                            ? new Date(iv.scheduledDateTime).toLocaleString('en-IN')
                            : 'TBD'}
                        </div>
                        {iv.meetingLink && (
                          <a href={iv.meetingLink} target="_blank" rel="noreferrer"
                            className="btn btn-sm w-100 text-white rounded-pill"
                            style={{background:'#123160',fontSize:'0.75rem'}}>
                            <i className="bi bi-camera-video me-1"></i>Join Meeting
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}