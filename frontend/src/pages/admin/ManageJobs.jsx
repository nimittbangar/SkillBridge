import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getAllJobsAdmin, deleteJob, verifyJob, unverifyJob } from '../../services/api'

export default function ManageJobs() {
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [verifyFilter, setVerifyFilter] = useState('')   // '', 'PENDING', 'VERIFIED'
  const [deleting, setDeleting] = useState(null)
  const [verifying, setVerifying] = useState(null)
  const [viewJob, setViewJob] = useState(null)   // job shown in the details modal

  const fetchJobs = () => {
    setLoading(true)
    getAllJobsAdmin().then(({ data }) => { setJobs(data); setLoading(false) })
      .catch(() => setLoading(false))
  }
  useEffect(() => { fetchJobs(); const t=setInterval(fetchJobs,30000); return ()=>clearInterval(t) }, [])

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Delete job "${title}"? This will also delete all applications for this job.`)) return
    setDeleting(id)
    try { await deleteJob(id); fetchJobs() }
    catch (e) { alert('Failed to delete job') } finally { setDeleting(null) }
  }

  const handleVerify = async (id, title) => {
    setVerifying(id)
    try { await verifyJob(id); fetchJobs(); setViewJob(null) }
    catch (e) { alert('Failed to verify job') } finally { setVerifying(null) }
  }

  const handleUnverify = async (id, title) => {
    if (!window.confirm(`Unpublish "${title}"? Seekers will no longer see it until re-approved.`)) return
    setVerifying(id)
    try { await unverifyJob(id); fetchJobs() }
    catch (e) { alert('Failed to unpublish job') } finally { setVerifying(null) }
  }

  const filtered = jobs.filter(j =>
    (j.title?.toLowerCase().includes(search.toLowerCase()) ||
     j.companyName?.toLowerCase().includes(search.toLowerCase())) &&
    (statusFilter === '' || j.status === statusFilter) &&
    (verifyFilter === '' ||
     (verifyFilter === 'PENDING' && !j.verified) ||
     (verifyFilter === 'VERIFIED' && j.verified))
  )

  const pendingCount = jobs.filter(j => !j.verified).length

  const statusColors = { OPEN: 'success', CLOSED: 'danger', PAUSED: 'warning' }

  return (
    <div className="container-fluid p-0">
      <div className="d-flex">
        <div className="sidebar d-none d-md-block">
          <p className="text-muted small fw-bold text-uppercase px-2 mb-2" style={{ fontSize: '0.7rem', letterSpacing: '0.8px' }}>Admin Panel</p>
          <nav className="nav flex-column">
            {[
              { to: '/admin/dashboard', icon: 'bi-speedometer2', label: 'Dashboard' },
              { to: '/admin/users', icon: 'bi-people', label: 'Manage Users' },
              { to: '/admin/skills', icon: 'bi-patch-check', label: 'Verify Skills' },
              { to: '/admin/jobs', icon: 'bi-briefcase', label: 'Manage Jobs' },
              { to: '/admin/applications', icon: 'bi-file-text', label: 'All Applications' },
            ].map((item, i) => (
              <Link key={i} to={item.to} className="nav-link"><i className={`bi ${item.icon}`}></i>{item.label}</Link>
            ))}
          </nav>
        </div>
        <div className="flex-fill main-content p-3">
          <div className="welcome-header">
            <h1 className="fw-bold mb-1"><i className="bi bi-briefcase me-2"></i>Manage All Jobs</h1>
            <p className="mb-0">
              {jobs.length} total job postings on the platform
              {pendingCount > 0 && (
                <span className="badge bg-warning text-dark rounded-pill ms-2">
                  <i className="bi bi-hourglass-split me-1"></i>{pendingCount} pending approval
                </span>
              )}
            </p>
          </div>

          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body p-4">
              <div className="d-flex gap-2 mb-3 flex-wrap">
                <div className="input-group" style={{ maxWidth: 280 }}>
                  <span className="input-group-text bg-white border-end-0">
                    <i className="bi bi-search text-muted"></i>
                  </span>
                  <input className="form-control border-start-0 rounded-end-3"
                    placeholder="Search title or company..."
                    value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <select className="form-select rounded-3" style={{ maxWidth: 140 }}
                  value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                  <option value="">All Status</option>
                  <option value="OPEN">Open</option>
                  <option value="PAUSED">Paused</option>
                  <option value="CLOSED">Closed</option>
                </select>
                <select className="form-select rounded-3" style={{ maxWidth: 170 }}
                  value={verifyFilter} onChange={e => setVerifyFilter(e.target.value)}>
                  <option value="">All Approval</option>
                  <option value="PENDING">Pending Approval</option>
                  <option value="VERIFIED">Verified</option>
                </select>
                <span className="text-muted small align-self-center ms-auto">
                  {filtered.length} results
                </span>
              </div>

              {loading ? (
                <div className="text-center py-4"><div className="spinner-border" style={{ color: '#0A66C2' }}></div></div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0" style={{ fontSize: '0.85rem' }}>
                    <thead className="table-light">
                      <tr>
                        <th>Job Title</th>
                        <th>Company</th>
                        <th className="d-none d-md-table-cell">Salary</th>
                        <th>Applicants</th>
                        <th>Status</th>
                        <th>Approval</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map(job => (
                        <tr key={job.id} style={{ opacity: deleting === job.id ? 0.5 : 1 }}>
                          <td className="fw-semibold">{job.title}</td>
                          <td><span className="company-badge"><i className="bi bi-building"></i>{job.companyName}</span></td>
                          <td className="d-none d-md-table-cell text-muted small">
                            ₹{job.minSalary?.toLocaleString()}–{job.maxSalary?.toLocaleString()}
                          </td>
                          <td>
                            <span className="badge rounded-pill" style={{ background: '#EEF3F8', color: '#0A66C2' }}>
                              {job.applicationCount || 0}
                            </span>
                          </td>
                          <td>
                            <span className={`badge bg-${statusColors[job.status]} rounded-pill`} style={{ fontSize: '0.72rem' }}>
                              {job.status}
                            </span>
                          </td>
                          <td>
                            {job.verified ? (
                              <span className="badge rounded-pill" style={{ background: '#D1FAE5', color: '#057642', fontSize: '0.72rem' }}>
                                <i className="bi bi-patch-check-fill me-1"></i>Verified
                              </span>
                            ) : (
                              <span className="badge rounded-pill" style={{ background: '#FEF3C7', color: '#92400e', fontSize: '0.72rem' }}>
                                <i className="bi bi-hourglass-split me-1"></i>Pending
                              </span>
                            )}
                          </td>
                          <td>
                            <div className="d-flex gap-1">
                              {!job.verified ? (
                                <button
                                  className="btn btn-sm rounded-pill"
                                  style={{ background: '#D1FAE5', color: '#057642', fontSize: '0.72rem', padding: '3px 10px' }}
                                  disabled={verifying === job.id}
                                  onClick={() => handleVerify(job.id, job.title)}>
                                  {verifying === job.id
                                    ? <span className="spinner-border spinner-border-sm" style={{ width: 10, height: 10 }}></span>
                                    : <><i className="bi bi-check-circle me-1"></i>Verify</>}
                                </button>
                              ) : (
                                <button
                                  className="btn btn-sm rounded-pill"
                                  style={{ background: '#FEF3C7', color: '#92400e', fontSize: '0.72rem', padding: '3px 10px' }}
                                  disabled={verifying === job.id}
                                  onClick={() => handleUnverify(job.id, job.title)}>
                                  {verifying === job.id
                                    ? <span className="spinner-border spinner-border-sm" style={{ width: 10, height: 10 }}></span>
                                    : <><i className="bi bi-x-circle me-1"></i>Unpublish</>}
                                </button>
                              )}
                              <button
                                className="btn btn-sm rounded-pill"
                                style={{ background: '#E6F1FB', color: '#0C447C', fontSize: '0.72rem', padding: '3px 10px' }}
                                onClick={() => setViewJob(job)}>
                                <i className="bi bi-eye me-1"></i>View
                              </button>
                              <button
                                className="btn btn-sm rounded-pill"
                                style={{ background: '#FEE2E2', color: '#991b1b', fontSize: '0.72rem', padding: '3px 10px' }}
                                disabled={deleting === job.id}
                                onClick={() => handleDelete(job.id, job.title)}>
                                {deleting === job.id
                                  ? <span className="spinner-border spinner-border-sm" style={{ width: 10, height: 10 }}></span>
                                  : <><i className="bi bi-trash me-1"></i>Delete</>}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Job details modal (View → validate) ── */}
      {viewJob && (
        <div onClick={() => setViewJob(null)}
          style={{ position:'fixed', inset:0, background:'rgba(10,20,40,0.55)', zIndex:2000,
                   display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
          <div onClick={e => e.stopPropagation()}
            className="bg-white rounded-4 shadow"
            style={{ maxWidth:640, width:'100%', maxHeight:'88vh', overflowY:'auto' }}>

            {/* header */}
            <div className="d-flex justify-content-between align-items-start p-4 pb-3"
              style={{ borderBottom:'1px solid #eef1f5' }}>
              <div>
                <h5 className="fw-bold mb-1" style={{ color:'#0A2347' }}>{viewJob.title}</h5>
                <div className="text-muted small"><i className="bi bi-building me-1"></i>{viewJob.companyName}</div>
              </div>
              <button className="btn-close" aria-label="Close" onClick={() => setViewJob(null)}></button>
            </div>

            {/* body */}
            <div className="p-4 pt-3">
              <div className="d-flex flex-wrap gap-2 mb-3">
                <span className="badge rounded-pill" style={{ background:'#E6F1FB', color:'#0C447C' }}>
                  {viewJob.jobType ? viewJob.jobType.replace(/_/g,' ') : 'Full Time'}
                </span>
                <span className="badge rounded-pill" style={{ background:'#EDE9FE', color:'#5B21B6' }}>
                  {viewJob.experienceLevel || 'Any level'}
                </span>
                <span className="badge rounded-pill" style={{ background:'#DCFCE7', color:'#166534' }}>
                  {viewJob.remote ? 'Remote' : (viewJob.location || 'On-site')}
                </span>
                <span className="badge rounded-pill"
                  style={ viewJob.verified
                    ? { background:'#D1FAE5', color:'#057642' }
                    : { background:'#FEF3C7', color:'#92400e' } }>
                  {viewJob.verified ? 'Verified' : 'Pending approval'}
                </span>
              </div>

              <dl className="row small mb-3">
                <dt className="col-4 text-muted fw-normal">Salary</dt>
                <dd className="col-8">
                  {viewJob.minSalary ? `${viewJob.currency||'INR'} ${viewJob.minSalary} - ${viewJob.maxSalary}` : 'Not specified'}
                </dd>
                <dt className="col-4 text-muted fw-normal">Posted</dt>
                <dd className="col-8">{viewJob.postedAt ? new Date(viewJob.postedAt).toLocaleDateString() : '—'}</dd>
                <dt className="col-4 text-muted fw-normal">Deadline</dt>
                <dd className="col-8">{viewJob.deadline ? new Date(viewJob.deadline).toLocaleDateString() : 'None'}</dd>
                <dt className="col-4 text-muted fw-normal">Applications</dt>
                <dd className="col-8">{viewJob.applicationCount ?? 0}</dd>
              </dl>

              {viewJob.requiredSkills && (
                <>
                  <div className="small fw-semibold text-muted mb-2">Required skills</div>
                  <div className="d-flex flex-wrap gap-2 mb-3">
                    {viewJob.requiredSkills.split(',').map((s,i) => s.trim() && (
                      <span key={i} className="badge rounded-pill" style={{ background:'#F1F5F9', color:'#334155' }}>{s.trim()}</span>
                    ))}
                  </div>
                </>
              )}

              <div className="small fw-semibold text-muted mb-2">Description</div>
              <p className="small" style={{ whiteSpace:'pre-wrap', color:'#3c4046' }}>
                {viewJob.description || 'No description provided.'}
              </p>
            </div>

            {/* footer — validate action */}
            <div className="p-4 pt-0 d-flex gap-2 justify-content-end">
              <button className="btn btn-light rounded-pill px-3" onClick={() => setViewJob(null)}>Close</button>
              {!viewJob.verified ? (
                <button className="btn rounded-pill px-4 fw-semibold text-white"
                  style={{ background:'#057642' }}
                  disabled={verifying === viewJob.id}
                  onClick={() => handleVerify(viewJob.id, viewJob.title)}>
                  {verifying === viewJob.id
                    ? <span className="spinner-border spinner-border-sm"></span>
                    : <><i className="bi bi-check-circle me-1"></i>Validate & Publish Job</>}
                </button>
              ) : (
                <button className="btn rounded-pill px-4 fw-semibold"
                  style={{ background:'#FEF3C7', color:'#92400e' }}
                  disabled={verifying === viewJob.id}
                  onClick={() => { handleUnverify(viewJob.id, viewJob.title); setViewJob(null) }}>
                  <i className="bi bi-x-circle me-1"></i>Unpublish
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}