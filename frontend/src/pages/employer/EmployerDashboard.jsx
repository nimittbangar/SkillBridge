import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { getMyJobs, deleteJob, updateJobStatus, getJobInquiries } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import MessageThread from '../../components/MessageThread'

export default function EmployerDashboard() {
  const { user } = useAuth()
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(null)
  const [toast, setToast] = useState('')
  const [lastUpdated, setLastUpdated] = useState(null)
  const prevDataRef = useRef('')
  const [inquiriesJobId, setInquiriesJobId] = useState(null)
  const [inquiries, setInquiries] = useState([])
  const [activeSeekerId, setActiveSeekerId] = useState(null)

  const toggleInquiries = async (jobId) => {
    if (inquiriesJobId === jobId) { setInquiriesJobId(null); setActiveSeekerId(null); return }
    setInquiriesJobId(jobId); setActiveSeekerId(null)
    try { const { data } = await getJobInquiries(jobId); setInquiries(data || []) } catch { setInquiries([]) }
  }

  const fetchJobs = useCallback(async (showLoader = false) => {
    if (showLoader) setLoading(true)
    try {
      const { data } = await getMyJobs()
      const newData = JSON.stringify(data)
      if (newData !== prevDataRef.current) {
        prevDataRef.current = newData
        setJobs(data || [])
        setLastUpdated(new Date())
      }
    } catch(e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchJobs(true)
    // Poll every 10 seconds
    const t = setInterval(() => fetchJobs(false), 10000)
    return () => clearInterval(t)
  }, [fetchJobs])

  const showToast = (msg) => { setToast(msg); setTimeout(()=>setToast(''), 3000) }

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Delete "${title}"?\nThis cannot be undone.`)) return
    setDeleting(id)
    try {
      await deleteJob(id)
      setJobs(prev => prev.filter(j => j.id !== id))
      showToast('Job deleted successfully')
    } catch { showToast('Failed to delete job') }
    finally { setDeleting(null) }
  }

  const handleStatusToggle = async (jobId, currentStatus) => {
    const next = currentStatus === 'OPEN' ? 'PAUSED' : 'OPEN'
    try {
      await updateJobStatus(jobId, next)
      setJobs(prev => prev.map(j => j.id===jobId ? {...j, status:next} : j))
      showToast(`Job ${next === 'OPEN' ? 'reopened' : 'paused'} successfully`)
    } catch { showToast('Failed to update status') }
  }

  const statusColors = { OPEN:'success', CLOSED:'danger', PAUSED:'warning' }
  const totalApplicants = jobs.reduce((a,j) => a + (j.applicationCount||0), 0)
  const openJobs = jobs.filter(j => j.status === 'OPEN').length
  const pausedJobs = jobs.filter(j => j.status === 'PAUSED').length

  return (
    <div className="container-fluid p-0">
      <div className="d-flex">
        <div className="sidebar d-none d-md-block">
          <p className="text-muted small fw-bold text-uppercase px-2 mb-2"
            style={{fontSize:'0.7rem',letterSpacing:'0.8px'}}>Menu</p>
          <nav className="nav flex-column">
            {[
              {to:'/employer/dashboard',       icon:'bi-speedometer2', label:'Dashboard'},
              {to:'/employer/post-job',         icon:'bi-plus-circle',  label:'Post a Job'},
              {to:'/employer/interviews',       icon:'bi-camera-video', label:'My Interviews'},
              {to:'/employer/company-profile',  icon:'bi-building',     label:'Company Profile'},
              {to:'/change-password',           icon:'bi-shield-lock',  label:'Change Password'},
            ].map((item,i)=>(
              <Link key={i} to={item.to} className="nav-link">
                <i className={`bi ${item.icon}`}></i>{item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex-fill main-content p-3">
          {toast && (
            <div className="alert alert-success rounded-3 py-2 mb-3 d-flex align-items-center gap-2"
              style={{position:'sticky',top:8,zIndex:99}}>
              <i className="bi bi-check-circle-fill"></i>
              <span className="fw-semibold">{toast}</span>
            </div>
          )}

          <div className="welcome-header">
            <div className="d-flex justify-content-between align-items-start flex-wrap gap-2">
              <div>
                <h1 className="fw-bold mb-1">Employer Dashboard</h1>
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
              <button className="btn btn-sm btn-outline-light rounded-pill"
                onClick={() => fetchJobs(false)}>
                <i className="bi bi-arrow-clockwise me-1"></i>Refresh
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="row g-3 mb-4">
            {[
              {label:'Total Jobs',      value:jobs.length,    color:'#123160', icon:'bi-briefcase-fill'},
              {label:'Open Jobs',       value:openJobs,       color:'#057642', icon:'bi-door-open-fill'},
              {label:'Paused Jobs',     value:pausedJobs,     color:'#0F766E', icon:'bi-pause-circle-fill'},
              {label:'Total Applicants',value:totalApplicants,color:'#7C3AED', icon:'bi-people-fill'},
            ].map((s,i)=>(
              <div key={i} className="col-6 col-md-3">
                <div className="stat-card h-100">
                  <i className={`bi ${s.icon} fs-3 mb-2 d-block`} style={{color:s.color}}></i>
                  <div className="number" style={{color:s.color}}>{s.value}</div>
                  <div className="label">{s.label}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body p-4">
              <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                <h6 className="fw-bold mb-0">My Job Postings</h6>
                <Link to="/employer/post-job" className="btn text-white btn-sm rounded-pill fw-semibold"
                  style={{background:'#123160'}}>
                  <i className="bi bi-plus me-1"></i>Post New Job
                </Link>
              </div>

              {loading ? (
                <div className="text-center py-4">
                  <div className="spinner-border" style={{color:'#123160'}}></div>
                </div>
              ) : jobs.length===0 ? (
                <div className="text-center py-5">
                  <i className="bi bi-briefcase fs-1 text-muted mb-3 d-block"></i>
                  <p className="text-muted">No jobs posted yet.</p>
                  <Link to="/employer/post-job" className="btn text-white rounded-pill px-4"
                    style={{background:'#123160'}}>
                    Post Your First Job
                  </Link>
                </div>
              ) : (
                <div className="d-flex flex-column gap-3">
                  {jobs.map(job=>(
                    <div key={job.id} className="employer-job-row rounded-3 p-3"
                      style={{
                        opacity: deleting===job.id ? 0.5 : 1,
                        borderLeft: `4px solid ${job.status==='OPEN'?'#4ade80':job.status==='PAUSED'?'#2dd4bf':'#f87171'}`
                      }}>
                      <div className="d-flex align-items-start gap-3 flex-wrap">
                        <div className="flex-fill">
                          <div className="d-flex align-items-center gap-2 flex-wrap mb-1">
                            <span className="fw-bold">{job.title}</span>
                            {job.companyName && <span className="company-badge"><i className="bi bi-building"></i>{job.companyName}</span>}
                            <span className={`badge bg-${statusColors[job.status]||'secondary'} rounded-pill`}
                              style={{fontSize:'0.72rem'}}>
                              {job.status}
                            </span>
                            {job.remote && (
                              <span className="badge rounded-pill"
                                style={{background:'#D1FAE5',color:'#065f46',fontSize:'0.7rem'}}>
                                Remote
                              </span>
                            )}
                          </div>
                          <div className="text-muted small">
                            <i className="bi bi-currency-rupee"></i>
                            {job.minSalary?.toLocaleString()} – {job.maxSalary?.toLocaleString()} / yr &nbsp;•&nbsp;
                            {job.experienceLevel} &nbsp;•&nbsp; {job.jobType?.replace('_',' ')}
                          </div>
                          <div className="mt-2 d-flex flex-wrap gap-1">
                            {(job.requiredSkillsList||[]).slice(0,4).map((s,i)=>(
                              <span key={i} className="skill-badge unverified">{s}</span>
                            ))}
                          </div>
                        </div>

                        <div className="d-flex gap-2 align-items-start flex-shrink-0">
                          <Link to={`/employer/applications/${job.id}`}
                            className="btn btn-sm rounded-pill fw-semibold"
                            style={{background:'#EEF3F8',color:'#123160',border:'1px solid #D0D9E0',fontSize:'0.78rem'}}>
                            <i className="bi bi-people me-1"></i>{job.applicationCount||0} Applicants
                          </Link>
                          <button type="button" onClick={() => toggleInquiries(job.id)}
                            className="btn btn-sm rounded-pill fw-semibold"
                            style={{background: inquiriesJobId===job.id ? '#123160' : '#EEF3F8', color: inquiriesJobId===job.id ? '#fff' : '#123160', border:'1px solid #123160',fontSize:'0.78rem'}}>
                            <i className="bi bi-chat-dots me-1"></i>Inquiries
                          </button>
                          <Link to={`/employer/edit-job/${job.id}`}
                            className="btn btn-sm rounded-pill"
                            style={{background:'#CCFBF1',color:'#92400e',border:'1px solid #FCD34D',fontSize:'0.78rem',padding:'5px 10px'}}>
                            <i className="bi bi-pencil"></i>
                          </Link>
                          <button className="btn btn-sm rounded-pill"
                            style={{
                              background: job.status==='OPEN' ? '#CCFBF1' : '#D1FAE5',
                              color: job.status==='OPEN' ? '#92400e' : '#065f46',
                              border: `1px solid ${job.status==='OPEN'?'#FCD34D':'#6EE7B7'}`,
                              fontSize:'0.72rem', padding:'5px 10px'
                            }}
                            onClick={() => handleStatusToggle(job.id, job.status)}
                            title={job.status==='OPEN'?'Pause Job':'Reopen Job'}>
                            <i className={`bi ${job.status==='OPEN'?'bi-pause-fill':'bi-play-fill'}`}></i>
                          </button>
                          <button className="btn btn-sm rounded-pill"
                            style={{background:'#FEE2E2',color:'#991b1b',border:'1px solid #fca5a5',fontSize:'0.78rem',padding:'5px 10px'}}
                            disabled={deleting===job.id}
                            onClick={() => handleDelete(job.id, job.title)}>
                            {deleting===job.id
                              ? <span className="spinner-border spinner-border-sm" style={{width:10,height:10}}></span>
                              : <i className="bi bi-trash"></i>}
                          </button>
                        </div>
                      </div>

                      {inquiriesJobId === job.id && (
                        <div className="mt-3 p-3 rounded-3" style={{background:'#F8FAFC',border:'1px solid #E2E8F0'}}>
                          <div className="fw-semibold small mb-2">Job Inquiries</div>
                          {inquiries.length === 0 ? (
                            <p className="text-muted small mb-0">No one has asked a question about this job yet.</p>
                          ) : (
                            <>
                              <div className="d-flex gap-2 flex-wrap mb-2">
                                {inquiries.map(inq => (
                                  <button key={inq.seekerId} type="button"
                                    onClick={() => setActiveSeekerId(inq.seekerId)}
                                    className="btn btn-sm rounded-pill"
                                    style={{
                                      background: activeSeekerId===inq.seekerId ? '#123160' : '#EEF3F8',
                                      color: activeSeekerId===inq.seekerId ? '#fff' : '#123160',
                                      border:'1px solid #123160', fontSize:'0.78rem'
                                    }}>
                                    {inq.seekerName}
                                  </button>
                                ))}
                              </div>
                              {activeSeekerId && (
                                <MessageThread jobId={job.id} seekerId={activeSeekerId} />
                              )}
                            </>
                          )}
                        </div>
                      )}
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