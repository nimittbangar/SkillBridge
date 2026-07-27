import React, { useState, useEffect, useRef, useCallback } from 'react'
import UserAvatar from '../../components/UserAvatar'
import { useParams, Link } from 'react-router-dom'
import { getJobApplications, updateApplicationStatus, openResume } from '../../services/api'
import MessageThread from '../../components/MessageThread'
import { exportToCsv } from '../../utils/csvExport'

const STATUS_OPTIONS = ['APPLIED','SHORTLISTED','INTERVIEW_SCHEDULED','INTERVIEW_COMPLETED','OFFERED','REJECTED','ACCEPTED']
const STATUS_STYLE = {
  APPLIED:              { bg:'#F1F5F9', color:'#475569', label:'Applied' },
  SHORTLISTED:          { bg:'#DBEAFE', color:'#1e40af', label:'Shortlisted' },
  INTERVIEW_SCHEDULED:  { bg:'#CCFBF1', color:'#0F766E', label:'Interviewed' },
  INTERVIEW_COMPLETED:  { bg:'#CCFBF1', color:'#0F766E', label:'Interview Done' },
  OFFERED:              { bg:'#D1FAE5', color:'#065f46', label:'Offered' },
  REJECTED:             { bg:'#FEE2E2', color:'#991b1b', label:'Rejected' },
  ACCEPTED:             { bg:'#DBEAFE', color:'#1e40af', label:'Accepted' },
}
const scoreColor = s => s>=70?'#057642':s>=40?'#d97706':'#dc3545'

export default function ManageApplications() {
  const { jobId } = useParams()
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(null)
  const [notes, setNotes] = useState({})
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState({ msg:'', type:'success' })
  const [chatOpenId, setChatOpenId] = useState(null)
  const [exportOpen, setExportOpen] = useState(false)

  const prevDataRef = useRef('')
  const exportRef = useRef(null)

  // Close the export dropdown when clicking outside it
  useEffect(() => {
    const onClick = (e) => {
      if (exportOpen && exportRef.current && !exportRef.current.contains(e.target)) {
        setExportOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [exportOpen])

  const fetchApplications = useCallback(async (showLoader = false) => {
    if (showLoader) setLoading(true)
    try {
      const { data } = await getJobApplications(jobId)
      const sorted = [...data].sort((a,b) => b.skillMatchScore - a.skillMatchScore)
      const newData = JSON.stringify(sorted.map(a => ({id:a.id,status:a.status})))
      if (newData !== prevDataRef.current) {
        prevDataRef.current = newData
        setApplications(sorted)
      }
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }, [jobId])

  useEffect(() => {
    fetchApplications(true)
    // Poll every 10 seconds — only updates UI if data changed
    const t = setInterval(() => fetchApplications(false), 10000)
    return () => clearInterval(t)
  }, [fetchApplications])

  const showToast = (msg, type='success') => {
    setToast({ msg, type })
    setTimeout(() => setToast({ msg:'', type:'success' }), 3000)
  }

  const handleStatus = async (id, status) => {
    setUpdating(id)
    try {
      await updateApplicationStatus(id, { status, employerNote: notes[id] || '' })
      setApplications(prev => prev.map(a =>
        a.id === id ? { ...a, status, employerNote: notes[id] || a.employerNote } : a
      ))
      showToast(`Status updated to "${status.replace(/_/g,' ')}" successfully!`)
    } catch (e) {
      showToast('Failed to update status. Please try again.', 'danger')
    } finally { setUpdating(null) }
  }

  const getActionBtns = (app) => {
    const id = app.id
    const busy = updating === id
    const spinner = <span className="spinner-border spinner-border-sm me-1" style={{width:10,height:10}}></span>

    switch (app.status) {
      case 'APPLIED':
        return (
          <div className="d-flex gap-2 flex-wrap mt-2">
            <button className="btn btn-sm rounded-pill fw-semibold"
              style={{ background:'#DBEAFE',color:'#1e40af',border:'1px solid #93C5FD',fontSize:'0.8rem' }}
              disabled={busy} onClick={() => handleStatus(id,'SHORTLISTED')}>
              {busy ? spinner : <i className="bi bi-star me-1"></i>}Shortlist
            </button>
            <button className="btn btn-sm rounded-pill fw-semibold"
              style={{ background:'#FEE2E2',color:'#991b1b',border:'1px solid #fca5a5',fontSize:'0.8rem' }}
              disabled={busy} onClick={() => handleStatus(id,'REJECTED')}>
              <i className="bi bi-x me-1"></i>Reject
            </button>
          </div>
        )
      case 'SHORTLISTED':
        return (
          <div className="d-flex gap-2 flex-wrap mt-2">
            <Link to={`/employer/schedule/${id}`} className="btn btn-sm rounded-pill fw-semibold"
              style={{ background:'#CCFBF1',color:'#0F766E',border:'1px solid #99F6E4',fontSize:'0.8rem' }}>
              <i className="bi bi-calendar-plus me-1"></i>Schedule Interview
            </Link>
            <button className="btn btn-sm rounded-pill fw-semibold"
              style={{ background:'#FEE2E2',color:'#991b1b',border:'1px solid #fca5a5',fontSize:'0.8rem' }}
              disabled={busy} onClick={() => handleStatus(id,'REJECTED')}>
              <i className="bi bi-x me-1"></i>Reject
            </button>
          </div>
        )
      case 'INTERVIEW_SCHEDULED':
        return (
          <div className="d-flex flex-column gap-2 mt-2">
            <div className="rounded-3 p-2 d-flex align-items-center gap-2"
              style={{background:'#CCFBF1',border:'1px solid #99F6E4'}}>
              <i className="bi bi-hourglass-split" style={{color:'#0F766E'}}></i>
              <span className="small fw-semibold" style={{color:'#0F766E'}}>
                Waiting for seeker to join interview... Offer letter will be available after interview is completed.
              </span>
            </div>
            <div className="d-flex gap-2">
              <button className="btn btn-sm rounded-pill fw-semibold"
                style={{ background:'#FEE2E2',color:'#991b1b',border:'1px solid #fca5a5',fontSize:'0.8rem' }}
                disabled={busy} onClick={() => handleStatus(id,'REJECTED')}>
                <i className="bi bi-x me-1"></i>Reject
              </button>
            </div>
          </div>
        )
      case 'INTERVIEW_COMPLETED':
        return (
          <div className="d-flex flex-column gap-2 mt-2">
            <div className="rounded-3 p-2 d-flex align-items-center gap-2"
              style={{background:'#CCFBF1',border:'1px solid #99F6E4'}}>
              <i className="bi bi-check-circle-fill" style={{color:'#0F766E'}}></i>
              <span className="small fw-semibold" style={{color:'#0F766E'}}>
                Interview completed! Send offer or reject based on performance.
              </span>
            </div>
            <div className="d-flex gap-2 flex-wrap">
              <button className="btn btn-sm rounded-pill fw-semibold"
                style={{ background:'#057642',color:'#fff',border:'none',fontSize:'0.85rem',padding:'6px 18px' }}
                disabled={busy} onClick={() => handleStatus(id,'OFFERED')}>
                {busy ? spinner : <i className="bi bi-trophy me-1"></i>}
                Send Offer Letter
              </button>
              <button className="btn btn-sm rounded-pill fw-semibold"
                style={{ background:'#FEE2E2',color:'#991b1b',border:'1px solid #fca5a5',fontSize:'0.8rem', padding:'6px 16px' }}
                disabled={busy} onClick={() => {
                  if (window.confirm('Are you sure you want to reject this candidate after interview?')) {
                    handleStatus(id,'REJECTED')
                  }
                }}>
                {busy ? spinner : <i className="bi bi-x-circle me-1"></i>}
                Reject After Interview
              </button>
            </div>
          </div>
        )
      case 'OFFERED':
        return (
          <div className="mt-2">
            <span className="badge rounded-pill px-3 py-2"
              style={{ background:'#D1FAE5',color:'#065f46',fontSize:'0.8rem' }}>
              <i className="bi bi-trophy-fill me-1"></i>Offer Sent — Awaiting Seeker Response
            </span>
          </div>
        )
      case 'ACCEPTED':
        return (
          <div className="mt-2">
            <span className="badge rounded-pill px-3 py-2"
              style={{ background:'#DBEAFE',color:'#1e40af',fontSize:'0.8rem' }}>
              <i className="bi bi-check-circle-fill me-1"></i>Offer Accepted! 🎉
            </span>
          </div>
        )
      case 'REJECTED':
        return (
          <div className="mt-2">
            <span className="badge rounded-pill px-3 py-2"
              style={{ background:'#F1F5F9',color:'#475569',fontSize:'0.8rem' }}>
              <i className="bi bi-x-circle me-1"></i>Rejected
            </span>
          </div>
        )
      default: return null
    }
  }

  const handleExport = (statusFilter = 'ALL', label = 'all') => {
    // Export the applicants for this job, optionally filtered to one pipeline stage.
    const rows = statusFilter === 'ALL'
      ? filtered
      : filtered.filter(a => a.status === statusFilter)
    if (rows.length === 0) {
      alert('No applicants in this stage to export.')
      return
    }
    exportToCsv(`applicants_${label}.csv`, rows, [
      { label: 'Name', accessor: a => a.seekerName },
      { label: 'Email', accessor: a => a.seekerEmail },
      { label: 'Status', accessor: a => STATUS_STYLE[a.status]?.label || a.status },
      { label: 'Skill Match %', accessor: a => a.skillMatchScore ?? '' },
      { label: 'Applied At', accessor: a => a.appliedAt ? new Date(a.appliedAt).toLocaleDateString() : '' },
    ])
    setExportOpen(false)
  }

  const filtered = applications.filter(a =>
    a.seekerName?.toLowerCase().includes(search.toLowerCase()) ||
    a.seekerEmail?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="container-fluid p-0">
      <div className="d-flex">
        <div className="sidebar d-none d-md-block">
          <p className="text-muted small fw-bold text-uppercase px-2 mb-2"
            style={{fontSize:'0.7rem',letterSpacing:'0.8px'}}>Menu</p>
          <nav className="nav flex-column">
            {[
              {to:'/employer/dashboard',icon:'bi-speedometer2',label:'Dashboard'},
              {to:'/employer/post-job',icon:'bi-plus-circle',label:'Post a Job'},
              {to:'/employer/interviews',icon:'bi-camera-video',label:'Interviews'},
              {to:'/profile',icon:'bi-building',label:'Company Profile'},
            ].map((item,i)=>(
              <Link key={i} to={item.to} className="nav-link">
                <i className={`bi ${item.icon}`}></i>{item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex-fill main-content p-3">

          {/* Toast */}
          {toast.msg && (
            <div className={`alert alert-${toast.type} rounded-3 py-2 mb-3 d-flex align-items-center gap-2`}
              style={{position:'sticky',top:8,zIndex:99}}>
              <i className={`bi ${toast.type==='success'?'bi-check-circle-fill':'bi-exclamation-triangle-fill'}`}></i>
              <span className="small fw-semibold">{toast.msg}</span>
            </div>
          )}

          {/* Header */}
          <div className="d-flex align-items-center gap-3 mb-4 flex-wrap">
            <Link to="/employer/dashboard" className="btn btn-sm btn-outline-secondary rounded-pill">
              <i className="bi bi-arrow-left me-1"></i>Back
            </Link>
            <div>
              <h4 className="fw-bold mb-0">Applicants</h4>
              <p className="text-muted small mb-0">
                {applications.length} total — sorted by skill match score
              </p>
            </div>
            <button className="btn btn-sm btn-outline-secondary rounded-pill ms-auto" onClick={fetchApplications}>
              <i className="bi bi-arrow-clockwise me-1"></i>Refresh
            </button>
          </div>

          {/* Status Counts */}
          <div className="row g-2 mb-4">
            {Object.entries(STATUS_STYLE).map(([status,style])=>{
              const count = applications.filter(a=>a.status===status).length
              return (
                <div key={status} className="col-4 col-md-2">
                  <div className="text-center p-2 rounded-3"
                    style={{background:style.bg,border:`1px solid ${style.bg}`}}>
                    <div className="fw-bold" style={{color:style.color,fontSize:'1.4rem'}}>{count}</div>
                    <div style={{fontSize:'0.65rem',color:style.color,lineHeight:1.3}}>{style.label}</div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Info banner */}
          <div className="rounded-3 p-3 mb-4 d-flex align-items-start gap-3"
            style={{background:'#D1FAE5',border:'1px solid #6EE7B7'}}>
            <i className="bi bi-trophy-fill fs-4 flex-shrink-0" style={{color:'#057642'}}></i>
            <div>
              <div className="fw-bold small" style={{color:'#065f46'}}>
                How to give Offer Letter
              </div>
              <div className="small" style={{color:'#065f46'}}>
                1. Shortlist &nbsp;→&nbsp;
                2. Schedule Interview &nbsp;→&nbsp;
                3. Click green <strong>"Send Offer Letter"</strong> button &nbsp;→&nbsp;
                4. Seeker accepts from My Offers page
              </div>
              <div className="small mt-1" style={{color:'#065f46'}}>
                <i className="bi bi-info-circle me-1"></i>
                You can also send offer directly after shortlisting (skip interview step)
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="mb-3 d-flex gap-2 align-items-center flex-wrap">
            <div className="input-group" style={{maxWidth:320}}>
              <span className="input-group-text bg-white border-end-0">
                <i className="bi bi-search text-muted"></i>
              </span>
              <input className="form-control border-start-0 rounded-end-3"
                placeholder="Search by name or email..."
                value={search} onChange={e=>setSearch(e.target.value)}/>
            </div>
            <div className="dropdown" style={{ position:'relative' }} ref={exportRef}>
              <button className="btn btn-sm rounded-pill" style={{background:'#EEF3F8',color:'#0A66C2',border:'1px solid #0A66C2'}}
                onClick={() => setExportOpen(o => !o)} aria-expanded={exportOpen}>
                <i className="bi bi-download me-1"></i>Export CSV
                <i className="bi bi-chevron-down ms-1" style={{ fontSize:'0.7rem' }}></i>
              </button>
              {exportOpen && (
                <ul className="dropdown-menu dropdown-menu-end shadow-sm rounded-3 show"
                  style={{ display:'block', position:'absolute', right:0, top:'100%', marginTop:6, zIndex:1000, minWidth:210 }}>
                  <li><h6 className="dropdown-header">Export by stage</h6></li>
                  {[
                    { status:'ALL',                 label:'all',          text:'All Applicants',      icon:'bi-people' },
                    { status:'APPLIED',             label:'applied',      text:'Applied',             icon:'bi-file-earmark-text' },
                    { status:'SHORTLISTED',         label:'shortlisted',  text:'Shortlisted',         icon:'bi-star' },
                    { status:'INTERVIEW_SCHEDULED', label:'interview',    text:'Interview Scheduled', icon:'bi-camera-video' },
                    { status:'INTERVIEW_COMPLETED', label:'interviewed',  text:'Interview Completed', icon:'bi-check2-square' },
                    { status:'OFFERED',             label:'offered',      text:'Offered',             icon:'bi-award' },
                    { status:'ACCEPTED',            label:'accepted',     text:'Accepted',            icon:'bi-patch-check' },
                    { status:'REJECTED',            label:'rejected',     text:'Rejected',            icon:'bi-x-circle' },
                  ].map(opt => (
                    <li key={opt.status}>
                      <button className="dropdown-item d-flex align-items-center gap-2"
                        onClick={() => handleExport(opt.status, opt.label)}>
                        <i className={`bi ${opt.icon}`} style={{ width:18 }}></i>
                        <span>{opt.text}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Applicant Cards */}
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border" style={{color:'#0A66C2'}}></div>
              <p className="text-muted mt-2 small">Loading applicants...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-5">
              <i className="bi bi-people fs-1 text-muted mb-3 d-block"></i>
              <p className="text-muted">No applicants found</p>
            </div>
          ) : (
            <div className="d-flex flex-column gap-3">
              {filtered.map((app,idx)=>{
                const style = STATUS_STYLE[app.status] || STATUS_STYLE.APPLIED
                return (
                  <div key={app.id} className="card border-0 shadow-sm rounded-4"
                    style={{
                      opacity: updating===app.id?0.6:1,
                      transition:'opacity 0.2s',
                      borderLeft: app.status==='INTERVIEW_SCHEDULED'?'4px solid #0A66C2'
                                : app.status==='OFFERED'?'4px solid #057642'
                                : app.status==='ACCEPTED'?'4px solid #1e40af'
                                : '4px solid transparent'
                    }}>
                    <div className="card-body p-4">

                      <div className="d-flex align-items-start gap-3 flex-wrap">
                        <div className="rounded-circle text-white d-flex align-items-center justify-content-center fw-bold flex-shrink-0"
                          style={{width:46,height:46,background:'#0A66C2',fontSize:17}}>
                          {app.seekerName?.charAt(0).toUpperCase()}
                        </div>

                        <div className="flex-fill">
                          <div className="d-flex align-items-center gap-2 flex-wrap mb-1">
                            <span className="fw-bold" style={{fontSize:'0.95rem'}}>
                              #{idx+1} {app.seekerName}
                            </span>
                            {idx===0 && (
                              <span className="badge rounded-pill"
                                style={{background:'#CCFBF1',color:'#0F766E',fontSize:'0.68rem'}}>
                                Top Match
                              </span>
                            )}
                          </div>
                          <div className="text-muted small">{app.seekerEmail}</div>
                          <div className="mt-2">
                            <span className="badge rounded-pill px-3 py-1"
                              style={{background:style.bg,color:style.color,fontSize:'0.75rem'}}>
                              {app.status?.replace(/_/g,' ')}
                            </span>
                          </div>
                        </div>

                        <div className="text-center flex-shrink-0">
                          <div className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold"
                            style={{width:52,height:52,background:scoreColor(app.skillMatchScore),fontSize:'0.88rem'}}>
                            {app.skillMatchScore}%
                          </div>
                          <div className="text-muted mt-1" style={{fontSize:'0.68rem'}}>Match</div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      {getActionBtns(app)}

                      {/* Note + Resume */}
                      <div className="d-flex gap-2 mt-3 flex-wrap align-items-center">
                        <div className="input-group input-group-sm flex-fill" style={{maxWidth:380}}>
                          <span className="input-group-text bg-light" style={{fontSize:'0.78rem'}}>Note</span>
                          <input className="form-control" style={{fontSize:'0.78rem'}}
                            placeholder="Add a message to the candidate..."
                            value={notes[app.id]||''}
                            onChange={e=>setNotes({...notes,[app.id]:e.target.value})}/>
                          <button className="btn btn-sm text-white"
                            style={{background:'#0A66C2',fontSize:'0.75rem',borderRadius:'0 6px 6px 0'}}
                            onClick={()=>handleStatus(app.id, app.status)}
                            disabled={updating===app.id}>
                            Save
                          </button>
                        </div>

                        {app.resumeUrl && (
                          <div className="d-flex gap-1">
                            <button type="button"
                              onClick={() => openResume(app.resumeUrl.split('/').pop())}
                              className="btn btn-sm rounded-pill"
                              style={{background:'#EEF3F8',color:'#0A66C2',border:'1px solid #D0D9E0',fontSize:'0.75rem'}}>
                              <i className="bi bi-eye me-1"></i>Resume
                            </button>
                            <button type="button"
                              onClick={() => openResume(app.resumeUrl.split('/').pop())}
                              className="btn btn-sm rounded-pill"
                              style={{background:'#D1FAE5',color:'#065f46',border:'1px solid #6EE7B7',fontSize:'0.75rem'}}>
                              <i className="bi bi-download me-1"></i>Download
                            </button>
                          </div>
                        )}

                        <button type="button" className="btn btn-sm rounded-pill"
                          style={{background:'#EEF3F8',color:'#0A66C2',border:'1px solid #D0D9E0',fontSize:'0.75rem'}}
                          onClick={() => setChatOpenId(chatOpenId === app.id ? null : app.id)}>
                          <i className="bi bi-chat-dots me-1"></i>{chatOpenId === app.id ? 'Hide Chat' : 'Message'}
                        </button>
                      </div>

                      {chatOpenId === app.id && (
                        <div className="mt-3">
                          <MessageThread applicationId={app.id} />
                        </div>
                      )}

                      {app.coverLetter && (
                        <div className="mt-3 p-3 rounded-3" style={{background:'#EEF3F8',fontSize:'0.82rem'}}>
                          <span className="fw-semibold" style={{color:'#0A66C2'}}>
                            <i className="bi bi-chat-square-quote me-1"></i>Cover Letter:{' '}
                          </span>
                          <span className="text-muted">{app.coverLetter}</span>
                        </div>
                      )}

                      {app.employerNote && (
                        <div className="mt-2 p-2 rounded-3"
                          style={{background:'#CCFBF1',fontSize:'0.8rem',border:'1px solid #C4B5FD'}}>
                          <span className="fw-semibold" style={{color:'#0F766E'}}>
                            <i className="bi bi-sticky me-1"></i>Your Note:{' '}
                          </span>
                          <span style={{color:'#0F766E'}}>{app.employerNote}</span>
                        </div>
                      )}

                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}