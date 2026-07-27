import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getSavedJobs, toggleSavedJob } from '../../services/api'
import CompanyLogo from '../../components/CompanyLogo'

const scoreColor = s => s>=70?'#057642':s>=40?'#d97706':'#dc3545'

export default function SavedJobs() {
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [removing, setRemoving] = useState(null)

  const fetchSaved = () => {
    setLoading(true)
    getSavedJobs()
      .then(({ data }) => { setJobs(data); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { fetchSaved() }, [])

  const handleRemove = async (jobId) => {
    setRemoving(jobId)
    try {
      await toggleSavedJob(jobId)
      setJobs(prev => prev.filter(j => j.id !== jobId))
    } catch { console.error('Remove failed') } finally { setRemoving(null) }
  }

  if (loading) return (
    <div className="d-flex justify-content-center align-items-center" style={{minHeight:'60vh'}}>
      <div className="spinner-border" style={{color:'#123160'}}></div>
    </div>
  )

  return (
    <div className="container py-4">
      <div className="welcome-header mb-4">
        <h1 className="fw-bold mb-1"><i className="bi bi-bookmark-fill me-2"></i>Saved Jobs</h1>
        <p className="mb-0">{jobs.length} jobs bookmarked</p>
      </div>

      {jobs.length === 0 ? (
        <div className="text-center py-5">
          <i className="bi bi-bookmark fs-1 text-muted mb-3 d-block"></i>
          <h5 className="text-muted">No saved jobs yet</h5>
          <p className="text-muted small">Browse jobs and click the bookmark icon to save them for later</p>
          <Link to="/jobs" className="btn text-white rounded-pill px-4 mt-2" style={{background:'#123160'}}>
            <i className="bi bi-search me-2"></i>Browse Jobs
          </Link>
        </div>
      ) : (
        <div className="row g-3">
          {jobs.map(job => (
            <div key={job.id} className="col-12 col-md-6 col-lg-4">
              <div className="job-card p-4 h-100 d-flex flex-column"
                style={{opacity: removing===job.id?0.5:1, transition:'opacity 0.2s'}}>
                <div className="d-flex align-items-center gap-3 mb-3">
                  <CompanyLogo companyName={job.companyName} size={44} />
                  <div className="flex-fill">
                    <div className="fw-bold" style={{fontSize:'0.95rem'}}>{job.title}</div>
                    <div className="text-muted small">{job.companyName}</div>
                  </div>
                  <button className="btn btn-sm rounded-circle"
                    style={{background:'#FEE2E2',color:'#991b1b',border:'none',width:32,height:32}}
                    disabled={removing===job.id}
                    onClick={() => handleRemove(job.id)}
                    title="Remove from saved" aria-label="Remove from saved jobs">
                    <i className="bi bi-bookmark-x"></i>
                  </button>
                </div>

                <div className="d-flex flex-wrap gap-1 mb-2" style={{fontSize:'0.75rem'}}>
                  {job.remote && <span className="badge rounded-pill" style={{background:'#D1FAE5',color:'#065f46'}}>🌐 Remote</span>}
                  <span className="badge bg-light text-dark rounded-pill">{job.experienceLevel}</span>
                  <span className="badge bg-light text-dark rounded-pill">
                    ₹{job.minSalary?(job.minSalary/100000).toFixed(0)+'L':'?'}–{job.maxSalary?(job.maxSalary/100000).toFixed(0)+'L':'?'}
                  </span>
                </div>

                <div className="d-flex flex-wrap gap-1 mb-3 flex-fill">
                  {(job.requiredSkillsList||[]).slice(0,4).map((s,i) => (
                    <span key={i} className="skill-badge unverified">{s}</span>
                  ))}
                </div>

                <div className="d-flex gap-2 mt-auto">
                  <Link to={`/jobs/${job.id}`} className="btn btn-sm text-white rounded-pill fw-semibold flex-fill"
                    style={{background:'#123160',fontSize:'0.8rem'}}>
                    View & Apply
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}