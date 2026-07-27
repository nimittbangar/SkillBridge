import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getProfile, updateProfile, getMyJobs } from '../../services/api'

export default function CompanyProfile() {
  const [profile, setProfile] = useState(null)
  const [jobs, setJobs] = useState([])
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getProfile(), getMyJobs()])
      .then(([p, j]) => {
        setProfile(p.data)
        setForm(p.data)
        setJobs(j.data || [])
      })
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateProfile(form)
      setProfile(form)
      setEditing(false)
      setToast('Company profile updated!')
      setTimeout(() => setToast(''), 3000)
    } catch { setToast('Failed to save.') }
    finally { setSaving(false) }
  }

  if (loading) return (
    <div className="d-flex justify-content-center align-items-center" style={{ minHeight:'60vh' }}>
      <div className="spinner-border" style={{ color:'#123160' }}></div>
    </div>
  )

  const activeJobs = jobs.filter(j => j.status !== 'CLOSED' && j.status !== 'PAUSED')

  return (
    <div className="container-fluid p-0">
      <div className="d-flex">
        {/* Sidebar */}
        <div className="sidebar d-none d-md-block">
          <p className="text-muted small fw-bold text-uppercase px-2 mb-2" style={{ fontSize:'0.7rem', letterSpacing:'0.8px' }}>Menu</p>
          <nav className="nav flex-column">
            {[
              { to:'/employer/dashboard', icon:'bi-speedometer2', label:'Dashboard' },
              { to:'/employer/post-job',  icon:'bi-plus-circle',  label:'Post a Job' },
              { to:'/employer/interviews',icon:'bi-camera-video', label:'Interviews'  },
              { to:'/profile',            icon:'bi-building',     label:'Company Profile', active:true },
            ].map((item, i) => (
              <Link key={i} to={item.to} className={`nav-link${item.active ? ' active' : ''}`}>
                <i className={`bi ${item.icon}`}></i>{item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex-fill main-content p-3">
          {toast && (
            <div className="alert alert-success rounded-3 py-2 mb-3 d-flex align-items-center gap-2" style={{ position:'sticky', top:8, zIndex:99 }}>
              <i className="bi bi-check-circle-fill"></i>
              <span className="small fw-semibold">{toast}</span>
            </div>
          )}

          {/* Company Header */}
          <div className="card border-0 shadow-sm rounded-4 mb-4 overflow-hidden">
            <div style={{ background:'#123160', height:100 }}></div>
            <div className="card-body p-4 pt-0">
              <div className="d-flex align-items-end gap-3 mb-3" style={{ marginTop:-40 }}>
                <div style={{ width:80, height:80, background:'#fff', borderRadius:16, border:'3px solid #fff', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 2px 10px rgba(0,0,0,0.1)', flexShrink:0 }}>
                  <span style={{ fontSize:28, fontWeight:700, color:'#123160' }}>
                    {profile?.companyName?.charAt(0) || profile?.name?.charAt(0) || 'C'}
                  </span>
                </div>
                <div className="flex-fill pb-1">
                  <h4 className="fw-bold mb-0">{profile?.companyName || 'Your Company'}</h4>
                  <div className="text-muted small">{profile?.email}</div>
                </div>
                <button className="btn btn-sm rounded-pill fw-semibold"
                  style={{ background: editing ? '#dc3545' : '#123160', color:'#fff' }}
                  onClick={() => editing ? setEditing(false) : setEditing(true)}>
                  <i className={`bi ${editing ? 'bi-x' : 'bi-pencil'} me-1`}></i>
                  {editing ? 'Cancel' : 'Edit Profile'}
                </button>
              </div>

              {editing ? (
                <div className="row g-3">
                  {[
                    { label:'Company Name', key:'companyName', placeholder:'Your Company Ltd.' },
                    { label:'Company Website', key:'companyWebsite', placeholder:'https://yourcompany.com' },
                    { label:'Location', key:'location', placeholder:'Mumbai, India' },
                    { label:'Phone', key:'phone', placeholder:'+91 9876543210' },
                  ].map(({ label, key, placeholder }) => (
                    <div key={key} className="col-md-6">
                      <label className="form-label small fw-semibold">{label}</label>
                      <input className="form-control rounded-3" placeholder={placeholder}
                        value={form?.[key] || ''}
                        onChange={e => setForm({ ...form, [key]: e.target.value })} />
                    </div>
                  ))}
                  <div className="col-12">
                    <label className="form-label small fw-semibold">About Company</label>
                    <textarea className="form-control rounded-3" rows={4}
                      placeholder="Tell candidates about your company culture, mission, and values..."
                      value={form?.bio || ''}
                      onChange={e => setForm({ ...form, bio: e.target.value })} />
                  </div>
                  <div className="col-12">
                    <button className="btn rounded-pill fw-semibold px-4" style={{ background:'#123160', color:'#fff' }}
                      onClick={handleSave} disabled={saving}>
                      {saving ? <span className="spinner-border spinner-border-sm me-2"></span> : <i className="bi bi-check-lg me-2"></i>}
                      Save Changes
                    </button>
                  </div>
                </div>
              ) : (
                <div className="row g-3">
                  {[
                    { icon:'bi-globe', label:'Website', value: profile?.companyWebsite ? <a href={profile.companyWebsite} target="_blank" rel="noreferrer" style={{ color:'#123160' }}>{profile.companyWebsite}</a> : 'Not added' },
                    { icon:'bi-geo-alt', label:'Location', value: profile?.location || 'Not added' },
                    { icon:'bi-telephone', label:'Phone', value: profile?.phone || 'Not added' },
                    { icon:'bi-briefcase', label:'Active Jobs', value: activeJobs.length },
                  ].map(({ icon, label, value }, i) => (
                    <div key={i} className="col-6 col-md-3">
                      <div className="d-flex align-items-center gap-2">
                        <i className={`bi ${icon} text-muted`}></i>
                        <div>
                          <div className="text-muted" style={{ fontSize:11 }}>{label}</div>
                          <div style={{ fontSize:13, fontWeight:500 }}>{value}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {profile?.bio && (
                    <div className="col-12">
                      <div className="p-3 rounded-3" style={{ background:'#EEF3F8' }}>
                        <div className="small fw-semibold mb-1" style={{ color:'#123160' }}>About</div>
                        <div className="text-muted small">{profile.bio}</div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Active Jobs */}
          <div className="card border-0 shadow-sm rounded-4 p-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div className="fw-bold" style={{ fontSize:13 }}>
                <i className="bi bi-briefcase-fill me-2" style={{ color:'#123160' }}></i>
                Our Job Postings
                <span className="badge ms-2 rounded-pill" style={{ background:'#EEF3F8', color:'#123160', fontSize:10 }}>
                  {jobs.length} total
                </span>
              </div>
              <Link to="/employer/post-job" className="btn btn-sm rounded-pill fw-semibold"
                style={{ background:'#123160', color:'#fff' }}>
                <i className="bi bi-plus me-1"></i>Post Job
              </Link>
            </div>
            {jobs.length === 0 ? (
              <div className="text-center py-5">
                <i className="bi bi-briefcase fs-1 text-muted mb-3 d-block"></i>
                <p className="text-muted">No jobs posted yet</p>
                <Link to="/employer/post-job" className="btn rounded-pill" style={{ background:'#123160', color:'#fff' }}>
                  Post Your First Job
                </Link>
              </div>
            ) : jobs.map((job, i) => (
              <div key={job.id} className="d-flex align-items-center gap-3 py-3"
                style={{ borderBottom: i < jobs.length-1 ? '1px solid #f1f5f9' : 'none' }}>
                <div style={{ flex:1 }}>
                  <div className="fw-semibold" style={{ fontSize:13 }}>{job.title}</div>
                  <div className="text-muted" style={{ fontSize:11 }}>
                    {job.jobType?.replace('_',' ')} · {job.location} · {job.applicationCount || 0} applicants
                  </div>
                </div>
                <span className="badge rounded-pill px-3 py-2"
                  style={{ background: job.status === 'OPEN' ? '#D1FAE5' : '#FEF3C7', color: job.status === 'OPEN' ? '#065f46' : '#92400e', fontSize:11 }}>
                  {job.status}
                </span>
                <Link to={`/employer/applications/${job.id}`} className="btn btn-sm rounded-pill"
                  style={{ background:'#EEF3F8', color:'#123160', border:'1px solid #D0D9E0', fontSize:11 }}>
                  View Applications
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}