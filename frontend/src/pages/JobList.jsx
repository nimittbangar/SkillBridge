import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { searchJobs, toggleSavedJob, getSavedJobs, getProfile, createJobAlert, getJobAlerts, deleteJobAlert } from '../services/api'
import { useAuth } from '../context/AuthContext'
import CompanyLogo from '../components/CompanyLogo'

const scoreColor = s => s>=70?'#057642':s>=40?'#d97706':'#dc3545'

export default function JobList() {
  const { user } = useAuth()
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [totalElements, setTotalElements] = useState(0)
  const [savedIds, setSavedIds] = useState([])
  const [savingId, setSavingId] = useState(null)
  const [showFilters, setShowFilters] = useState(false)
  const [sortBy, setSortBy] = useState('newest') // newest, salary-high, salary-low, applicants
  const [filters, setFilters] = useState({
    keyword:'', minSalary:'', maxSalary:'',
    remote:'', experienceLevel:'', jobType:'', location:''
  })

  const PAGE_SIZE = 9

  const fetchJobs = async (f = filters, pageNum = 0, append = false) => {
    if (append) setLoadingMore(true); else setLoading(true)
    try {
      const params = { page: pageNum, size: PAGE_SIZE }
      if (f.keyword)         params.keyword         = f.keyword
      if (f.minSalary)       params.minSalary       = f.minSalary
      if (f.maxSalary)       params.maxSalary       = f.maxSalary
      if (f.remote !== '')   params.remote          = f.remote
      if (f.experienceLevel) params.experienceLevel = f.experienceLevel
      if (f.jobType)         params.jobType         = f.jobType
      if (f.location)        params.location        = f.location
      const { data } = await searchJobs(params)
      const newJobs = data.content || []
      setJobs(prev => append ? [...prev, ...newJobs] : newJobs)
      setTotalPages(data.totalPages ?? 1)
      setTotalElements(data.totalElements ?? newJobs.length)
      setPage(pageNum)
    } catch (e) { console.error(e) } finally { setLoading(false); setLoadingMore(false) }
  }

  const loadMore = () => fetchJobs(filters, page + 1, true)

  // ─── Job Alerts ───
  const [alerts, setAlerts] = useState([])
  const [showAlerts, setShowAlerts] = useState(false)
  const [savingAlert, setSavingAlert] = useState(false)
  const [alertMsg, setAlertMsg] = useState('')

  const loadAlerts = async () => {
    try { const { data } = await getJobAlerts(); setAlerts(data || []) } catch { /* not a seeker, or not logged in */ }
  }

  useEffect(() => { if (user?.role === 'SEEKER') loadAlerts() }, [user])

  const handleSaveAlert = async () => {
    setSavingAlert(true); setAlertMsg('')
    try {
      await createJobAlert({
        keyword: filters.keyword || null,
        remote: filters.remote === '' ? null : filters.remote === 'true',
        experienceLevel: filters.experienceLevel || null,
      })
      setAlertMsg('success:Alert saved! We\'ll email you when matching jobs are posted.')
      await loadAlerts()
    } catch (e) {
      setAlertMsg('error:' + (e.response?.data || 'Failed to save alert.'))
    } finally {
      setSavingAlert(false)
      setTimeout(() => setAlertMsg(''), 4000)
    }
  }

  const handleDeleteAlert = async (id) => {
    try { await deleteJobAlert(id); await loadAlerts() } catch { /* ignore */ }
  }

  useEffect(() => {
    fetchJobs()
    if (user?.role === 'SEEKER') {
      getSavedJobs().then(({ data }) => setSavedIds(data.map(j => j.id))).catch(()=>{})
    }
  }, [user])

  const handleToggleSave = async (e, jobId) => {
    e.preventDefault(); e.stopPropagation()
    if (!user || user.role !== 'SEEKER') return
    setSavingId(jobId)
    try {
      await toggleSavedJob(jobId)
      setSavedIds(prev => prev.includes(jobId) ? prev.filter(id=>id!==jobId) : [...prev, jobId])
    } catch { console.error('Save failed') } finally { setSavingId(null) }
  }

  const clearFilters = () => {
    const empty = { keyword:'', minSalary:'', maxSalary:'', remote:'', experienceLevel:'', jobType:'', location:'' }
    setFilters(empty); fetchJobs(empty)
  }

  // Sort jobs
  const sortedJobs = [...jobs].sort((a,b) => {
    if (sortBy === 'salary-high') return (b.maxSalary||0) - (a.maxSalary||0)
    if (sortBy === 'salary-low')  return (a.minSalary||0) - (b.minSalary||0)
    if (sortBy === 'applicants')  return (b.applicationCount||0) - (a.applicationCount||0)
    return 0 // newest — keep API order
  })

  const activeCount = Object.values(filters).filter(Boolean).length

  return (
    <div className="container py-4">
      <div className="page-header">
        <div className="d-flex justify-content-between align-items-start flex-wrap gap-2">
          <div>
            <h1 className="fw-bold mb-1"><i className="bi bi-briefcase me-2"></i>Browse Remote Jobs</h1>
            <p className="mb-0 opacity-75">{totalElements} positions available</p>
          </div>
          {user?.role === 'SEEKER' && (
            <Link to="/seeker/saved-jobs" className="btn btn-sm rounded-pill fw-semibold"
              style={{background:'rgba(255,255,255,0.2)',color:'#fff',border:'1px solid rgba(255,255,255,0.4)'}}>
              <i className="bi bi-bookmark-fill me-1"></i>Saved Jobs ({savedIds.length})
            </Link>
          )}
        </div>
      </div>

      {/* Search + Filters */}
      <div className="card border-0 shadow-sm rounded-4 mb-4">
        <div className="card-body p-3">
          <div className="d-flex gap-2 flex-wrap mb-2">
            <div className="input-group flex-fill" style={{minWidth:200}}>
              <span className="input-group-text bg-white border-end-0"><i className="bi bi-search text-muted"></i></span>
              <input className="form-control border-start-0 rounded-end-3"
                placeholder="Job title, skill, keyword..."
                value={filters.keyword}
                onChange={e => setFilters({...filters, keyword:e.target.value})}
                onKeyDown={e => e.key==='Enter' && fetchJobs()} />
            </div>
            <button className="btn text-white fw-semibold rounded-pill px-4" style={{background:'#123160'}} onClick={() => fetchJobs()}>
              <i className="bi bi-search me-1"></i>Search
            </button>
            {/* Sort */}
            <select className="form-select rounded-pill" style={{maxWidth:160,fontSize:'0.85rem'}}
              value={sortBy} onChange={e => setSortBy(e.target.value)}>
              <option value="newest">Newest First</option>
              <option value="salary-high">Salary: High→Low</option>
              <option value="salary-low">Salary: Low→High</option>
              <option value="applicants">Most Applied</option>
            </select>
            <button className="btn rounded-pill px-3 fw-semibold position-relative"
              style={{background:showFilters?'#123160':'#EEF3F8',color:showFilters?'#fff':'#123160',border:'none'}}
              onClick={() => setShowFilters(!showFilters)}>
              <i className="bi bi-sliders me-1"></i>Filters
              {activeCount>0 && <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" style={{fontSize:'0.6rem'}}>{activeCount}</span>}
            </button>
            {activeCount>0 && <button className="btn btn-outline-secondary rounded-pill px-3" onClick={clearFilters}><i className="bi bi-x me-1"></i>Clear</button>}
            {user?.role === 'SEEKER' && (
              <>
                <button className="btn rounded-pill px-3 fw-semibold" disabled={savingAlert}
                  style={{background:'#EEF3F8',color:'#123160',border:'1px solid #123160'}}
                  onClick={handleSaveAlert}>
                  {savingAlert ? <span className="spinner-border spinner-border-sm"></span> : <><i className="bi bi-bell me-1"></i>Save as Alert</>}
                </button>
                <button className="btn rounded-pill px-3 fw-semibold position-relative"
                  style={{background:showAlerts?'#123160':'#EEF3F8',color:showAlerts?'#fff':'#123160',border:'none'}}
                  onClick={() => setShowAlerts(!showAlerts)}>
                  <i className="bi bi-bell-fill me-1"></i>My Alerts
                  {alerts.length>0 && <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" style={{fontSize:'0.6rem'}}>{alerts.length}</span>}
                </button>
              </>
            )}
          </div>

          {showFilters && (
            <div className="border-top pt-3 mt-1">
              <div className="row g-2">
                <div className="col-md-2 col-6">
                  <label className="form-label small fw-semibold mb-1 text-muted">Job Type</label>
                  <select className="form-select form-select-sm rounded-3" value={filters.jobType}
                    onChange={e => setFilters({...filters, jobType:e.target.value})}>
                    <option value="">All Types</option>
                    <option value="FULL_TIME">Full Time</option>
                    <option value="PART_TIME">Part Time</option>
                    <option value="CONTRACT">Contract</option>
                    <option value="FREELANCE">Freelance</option>
                  </select>
                </div>
                <div className="col-md-2 col-6">
                  <label className="form-label small fw-semibold mb-1 text-muted">Experience</label>
                  <select className="form-select form-select-sm rounded-3" value={filters.experienceLevel}
                    onChange={e => setFilters({...filters, experienceLevel:e.target.value})}>
                    <option value="">All Levels</option>
                    <option value="ENTRY">Entry (0-2 yrs)</option>
                    <option value="MID">Mid (2-5 yrs)</option>
                    <option value="SENIOR">Senior (5+ yrs)</option>
                  </select>
                </div>
                <div className="col-md-2 col-6">
                  <label className="form-label small fw-semibold mb-1 text-muted">Remote</label>
                  <select className="form-select form-select-sm rounded-3" value={filters.remote}
                    onChange={e => setFilters({...filters, remote:e.target.value})}>
                    <option value="">All</option>
                    <option value="true">Remote Only</option>
                    <option value="false">On-site</option>
                  </select>
                </div>
                <div className="col-md-2 col-6">
                  <label className="form-label small fw-semibold mb-1 text-muted">Location</label>
                  <input className="form-control form-control-sm rounded-3" placeholder="e.g. Bangalore"
                    value={filters.location}
                    onChange={e => setFilters({...filters, location:e.target.value})} />
                </div>
                <div className="col-md-2 col-6">
                  <label className="form-label small fw-semibold mb-1 text-muted">Min Salary (₹)</label>
                  <input type="number" className="form-control form-control-sm rounded-3" placeholder="500000"
                    value={filters.minSalary}
                    onChange={e => setFilters({...filters, minSalary:e.target.value})} />
                </div>
                <div className="col-md-2 col-6">
                  <label className="form-label small fw-semibold mb-1 text-muted">Max Salary (₹)</label>
                  <input type="number" className="form-control form-control-sm rounded-3" placeholder="2000000"
                    value={filters.maxSalary}
                    onChange={e => setFilters({...filters, maxSalary:e.target.value})} />
                </div>
              </div>
              <button className="btn btn-sm text-white rounded-pill px-4 mt-2 fw-semibold" style={{background:'#123160'}} onClick={() => fetchJobs()}>
                Apply Filters
              </button>
            </div>
          )}

          {alertMsg && (
            <div className={`alert alert-${alertMsg.startsWith('success')?'success':'danger'} py-2 small mt-2 mb-0`}>
              {alertMsg.split(':').slice(1).join(':')}
            </div>
          )}

          {showAlerts && (
            <div className="border-top pt-3 mt-2">
              <div className="fw-semibold small mb-2">Your Saved Alerts</div>
              {alerts.length === 0 ? (
                <p className="text-muted small mb-0">No alerts yet. Set filters above and click "Save as Alert".</p>
              ) : (
                alerts.map(a => (
                  <div key={a.id} className="d-flex align-items-center justify-content-between p-2 rounded-3 mb-1"
                    style={{background:'#F8FAFC',fontSize:'0.82rem'}}>
                    <span>
                      {a.keyword && <span className="badge bg-light text-dark me-1">"{a.keyword}"</span>}
                      {a.remote !== null && <span className="badge bg-light text-dark me-1">{a.remote ? 'Remote' : 'On-site'}</span>}
                      {a.experienceLevel && <span className="badge bg-light text-dark me-1">{a.experienceLevel}</span>}
                      {!a.keyword && a.remote === null && !a.experienceLevel && <span className="text-muted">All jobs</span>}
                    </span>
                    <button className="btn btn-sm text-danger" onClick={() => handleDeleteAlert(a.id)}>
                      <i className="bi bi-trash"></i>
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border" style={{color:'#123160'}}></div>
          <p className="text-muted mt-2 small">Finding jobs...</p>
        </div>
      ) : sortedJobs.length===0 ? (
        <div className="text-center py-5">
          <i className="bi bi-search fs-1 text-muted mb-3 d-block"></i>
          <h5 className="text-muted">No jobs found</h5>
          <button className="btn text-white rounded-pill px-4 mt-2" style={{background:'#123160'}} onClick={clearFilters}>Clear Filters</button>
        </div>
      ) : (
        <div className="row g-3">
          {sortedJobs.map(job => {
            const isSaved = savedIds.includes(job.id)
            return (
              <div key={job.id} className="col-12 col-md-6 col-lg-4">
                <div className="job-card p-4 h-100 d-flex flex-column">
                  {/* Header */}
                  <div className="d-flex align-items-center gap-3 mb-3">
                    <CompanyLogo companyName={job.companyName} size={44} />
                    <div className="flex-fill">
                      <div className="fw-bold" style={{fontSize:'0.95rem',lineHeight:1.3}}>{job.title}</div>
                      <div className="text-muted small">{job.companyName}</div>
                    </div>
                    {/* Bookmark Button */}
                    {user?.role === 'SEEKER' && (
                      <button
                        onClick={(e) => handleToggleSave(e, job.id)}
                        disabled={savingId === job.id}
                        title={isSaved ? 'Remove from saved' : 'Save this job'}
                        aria-label={isSaved ? 'Remove from saved jobs' : 'Save this job'}
                        className="btn btn-sm rounded-circle flex-shrink-0"
                        style={{
                          width:34, height:34, border:'none',
                          background: isSaved ? '#FEF3C7' : '#EEF3F8',
                          color: isSaved ? '#d97706' : '#adb5bd',
                          transition:'all 0.2s'
                        }}>
                        {savingId===job.id
                          ? <span className="spinner-border spinner-border-sm" style={{width:12,height:12}}></span>
                          : <i className={`bi ${isSaved?'bi-bookmark-fill':'bi-bookmark'}`} style={{fontSize:'0.85rem'}}></i>}
                      </button>
                    )}
                    {job.remote && (
                      <span className="badge rounded-pill flex-shrink-0" style={{background:'#D1FAE5',color:'#065f46',fontSize:'0.7rem'}}>🌐 Remote</span>
                    )}
                  </div>

                  {/* Badges */}
                  <div className="d-flex flex-wrap gap-1 mb-2" style={{fontSize:'0.75rem'}}>
                    <span className="badge bg-light text-dark rounded-pill">
                      ₹{job.minSalary?(job.minSalary/100000).toFixed(0)+'L':'?'}–{job.maxSalary?(job.maxSalary/100000).toFixed(0)+'L':'?'}/yr
                    </span>
                    <span className="badge bg-light text-dark rounded-pill">{job.experienceLevel}</span>
                    <span className="badge bg-light text-dark rounded-pill">{job.jobType?.replace('_',' ')}</span>
                  </div>

                  {/* Skills */}
                  <div className="d-flex flex-wrap gap-1 mb-3 flex-fill">
                    {(job.requiredSkillsList||[]).slice(0,4).map((s,i)=>(
                      <span key={i} className="skill-badge unverified">{s}</span>
                    ))}
                    {(job.requiredSkillsList||[]).length>4 && (
                      <span className="skill-badge unverified">+{(job.requiredSkillsList||[]).length-4}</span>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="d-flex justify-content-between align-items-center mt-auto">
                    <small className="text-muted"><i className="bi bi-people me-1"></i>{job.applicationCount||0} applied</small>
                    <Link to={`/jobs/${job.id}`} className="btn btn-sm text-white rounded-pill fw-semibold"
                      style={{background:'#123160',fontSize:'0.8rem'}}>
                      View Job <i className="bi bi-arrow-right ms-1"></i>
                    </Link>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {!loading && jobs.length > 0 && page + 1 < totalPages && (
        <div className="text-center mt-4">
          <button className="btn rounded-pill px-5 fw-semibold" disabled={loadingMore}
            style={{background:'#EEF3F8',color:'#123160',border:'1px solid #123160'}}
            onClick={loadMore}>
            {loadingMore
              ? <><span className="spinner-border spinner-border-sm me-2"></span>Loading...</>
              : <>Load More Jobs <i className="bi bi-arrow-down-circle ms-1"></i></>}
          </button>
        </div>
      )}
    </div>
  )
}