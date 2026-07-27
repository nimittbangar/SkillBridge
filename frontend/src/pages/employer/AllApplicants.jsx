import React, { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { getMyJobs, downloadApplicantsCsv } from '../../services/api'

// CSV export options — one download per pipeline stage
const EXPORT_OPTIONS = [
  { status: 'ALL',                 label: 'all',          text: 'All Applicants',        icon: 'bi-people' },
  { status: 'APPLIED',             label: 'applied',      text: 'Applied',               icon: 'bi-file-earmark-text' },
  { status: 'SHORTLISTED',         label: 'shortlisted',  text: 'Shortlisted',           icon: 'bi-star' },
  { status: 'INTERVIEW_SCHEDULED', label: 'interview',    text: 'Interview Scheduled',   icon: 'bi-camera-video' },
  { status: 'INTERVIEW_COMPLETED', label: 'interviewed',  text: 'Interview Completed',   icon: 'bi-check2-square' },
  { status: 'OFFERED',             label: 'selected',     text: 'Selected (Offered)',    icon: 'bi-award' },
  { status: 'ACCEPTED',            label: 'accepted',     text: 'Accepted Offer',        icon: 'bi-patch-check' },
]

export default function AllApplicants() {
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(null)

  const handleExport = async (opt) => {
    setExporting(opt.status)
    await downloadApplicantsCsv(opt.status, opt.label)
    setExporting(null)
  }

  const fetchJobs = useCallback(async () => {
    try {
      const { data } = await getMyJobs()
      setJobs(data || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchJobs() }, [fetchJobs])

  const statusColor = { OPEN:'#057642', PAUSED:'#d97706', CLOSED:'#dc3545' }
  const statusBg    = { OPEN:'#D1FAE5', PAUSED:'#FEF3C7', CLOSED:'#FEE2E2' }

  return (
    <div className="container-fluid p-0">
      <div className="d-flex">

        {/* Sidebar */}
        <div className="sidebar d-none d-md-block">
          <p className="text-muted small fw-bold text-uppercase px-2 mb-2"
            style={{ fontSize:'0.7rem', letterSpacing:'0.8px' }}>Menu</p>
          <nav className="nav flex-column">
            {[
              { to:'/employer/dashboard',      icon:'bi-speedometer2', label:'Dashboard'       },
              { to:'/employer/post-job',        icon:'bi-plus-circle',  label:'Post a Job'      },
              { to:'/employer/applicants',      icon:'bi-people-fill',  label:'Applicants', active:true },
              { to:'/employer/interviews',      icon:'bi-camera-video', label:'Interviews'      },
              { to:'/employer/company-profile', icon:'bi-building',     label:'Company Profile' },
            ].map((item, i) => (
              <Link key={i} to={item.to} className={`nav-link${item.active ? ' active' : ''}`}>
                <i className={`bi ${item.icon}`}></i>{item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex-fill main-content p-3">

          <div className="welcome-header mb-4 d-flex justify-content-between align-items-start flex-wrap gap-2">
            <div>
              <h2 className="fw-bold mb-1">
                <i className="bi bi-people-fill me-2"></i>Applicants
              </h2>
              <p className="mb-0 opacity-75 small">Select a job to view its applicants</p>
            </div>

            {/* Download CSV — one export per pipeline stage */}
            <div className="dropdown">
              <button className="btn btn-light btn-sm rounded-pill dropdown-toggle fw-semibold px-3"
                type="button" data-bs-toggle="dropdown" aria-expanded="false"
                style={{ color:'#123160' }}>
                <i className="bi bi-download me-1"></i>
                {exporting ? 'Preparing…' : 'Download CSV'}
              </button>
              <ul className="dropdown-menu dropdown-menu-end shadow-sm rounded-3">
                <li><h6 className="dropdown-header">Export applicants by stage</h6></li>
                {EXPORT_OPTIONS.map((opt) => (
                  <li key={opt.status}>
                    <button className="dropdown-item d-flex align-items-center gap-2"
                      disabled={exporting === opt.status}
                      onClick={() => handleExport(opt)}>
                      <i className={`bi ${opt.icon}`} style={{ width:18 }}></i>
                      <span>{opt.text}</span>
                      {exporting === opt.status &&
                        <span className="spinner-border spinner-border-sm ms-auto" style={{ width:12, height:12 }}></span>}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border" style={{ color:'#123160' }}></div>
            </div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-5">
              <i className="bi bi-briefcase fs-1 text-muted mb-3 d-block"></i>
              <p className="text-muted">No jobs posted yet</p>
              <Link to="/employer/post-job" className="btn text-white rounded-pill px-4"
                style={{ background:'#123160' }}>Post a Job</Link>
            </div>
          ) : (
            <div className="card border-0 shadow-sm rounded-4">
              <div className="card-body p-0">
                {jobs.map((job, i) => (
                  <div key={job.id}
                    className="d-flex align-items-center gap-3 p-3"
                    style={{ borderBottom: i < jobs.length-1 ? '1px solid #f1f5f9' : 'none' }}>

                    {/* Job info */}
                    <div style={{ flex:1 }}>
                      <div className="fw-bold" style={{ fontSize:'0.95rem' }}>{job.title}</div>
                      <div className="text-muted small">
                        {job.jobType?.replace('_',' ')} · {job.location || 'Remote'}
                      </div>
                    </div>

                    {/* Status badge */}
                    <span className="badge rounded-pill px-3 py-2"
                      style={{
                        background: statusBg[job.status] || '#F1F5F9',
                        color: statusColor[job.status] || '#475569',
                        fontSize:'0.75rem'
                      }}>
                      {job.status}
                    </span>

                    {/* Applicants button */}
                    <Link to={`/employer/applications/${job.id}`}
                      className="btn rounded-pill fw-semibold"
                      style={{
                        background:'#123160', color:'#fff',
                        border:'none', fontSize:'0.85rem',
                        padding:'7px 18px', whiteSpace:'nowrap'
                      }}>
                      <i className="bi bi-people me-2"></i>
                      {job.applicationCount || 0} Applicants
                    </Link>

                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}