import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { getJobById, updateJob } from '../../services/api'

export default function EditJob() {
  const { jobId } = useParams()
  const navigate = useNavigate()
  const [form, setForm] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    getJobById(jobId)
      .then(({ data }) => {
        setForm({
          title: data.title || '',
          description: data.description || '',
          jobType: data.jobType || 'FULL_TIME',
          experienceLevel: data.experienceLevel || 'MID',
          remote: data.remote ?? true,
          minSalary: data.minSalary || '',
          maxSalary: data.maxSalary || '',
          requiredSkills: (data.requiredSkillsList || data.requiredSkills || []).join(', '),
          deadline: data.deadline ? data.deadline.substring(0, 16) : '',
          status: data.status || 'OPEN',
        })
        setLoading(false)
      })
      .catch(() => { setError('Failed to load job'); setLoading(false) })
  }, [jobId])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    // Match PostJob's validation so an edit can't introduce invalid data.
    if (!form.title?.trim()) { setError('Job title is required'); return }
    if (!form.description?.trim()) { setError('Job description is required'); return }
    if (!form.requiredSkills?.trim()) { setError('Required skills are needed'); return }
    if (!form.minSalary || !form.maxSalary) { setError('Salary range is required'); return }
    if (parseFloat(form.minSalary) < 0 || parseFloat(form.maxSalary) < 0) {
      setError('Salary cannot be negative'); return
    }
    if (parseFloat(form.minSalary) > parseFloat(form.maxSalary)) {
      setError('Min salary cannot be greater than max salary'); return
    }

    setSaving(true)
    try {
      const payload = {
        ...form,
        requiredSkills: form.requiredSkills.split(',').map(s => s.trim()).filter(Boolean).join(','),
        minSalary: parseFloat(form.minSalary),
        maxSalary: parseFloat(form.maxSalary),
      }
      await updateJob(jobId, payload)
      setSuccess(true)
      setTimeout(() => navigate('/employer/dashboard'), 1500)
    } catch (e) {
      setError(e.response?.data || 'Failed to update job')
    } finally { setSaving(false) }
  }

  if (loading) return (
    <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
      <div className="spinner-border" style={{ color: '#0A66C2' }}></div>
    </div>
  )

  return (
    <div className="container-fluid p-0">
      <div className="d-flex">
        <div className="sidebar d-none d-md-block">
          <p className="text-muted small fw-bold text-uppercase px-2 mb-2" style={{ fontSize: '0.7rem', letterSpacing: '0.8px' }}>Menu</p>
          <nav className="nav flex-column">
            {[
              { to: '/employer/dashboard', icon: 'bi-speedometer2', label: 'Dashboard' },
              { to: '/employer/post-job', icon: 'bi-plus-circle', label: 'Post a Job' },
              { to: '/profile', icon: 'bi-building', label: 'Company Profile' },
            ].map((item, i) => (
              <Link key={i} to={item.to} className="nav-link">
                <i className={`bi ${item.icon}`}></i>{item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex-fill main-content p-3">
          <div className="welcome-header">
            <h1 className="fw-bold mb-1"><i className="bi bi-pencil-square me-2"></i>Edit Job Posting</h1>
            <p className="mb-0">Update your job details — changes reflect immediately</p>
          </div>

          {success && (
            <div className="alert alert-success rounded-3 mb-3">
              <i className="bi bi-check-circle-fill me-2"></i>Job updated successfully! Redirecting...
            </div>
          )}
          {error && (
            <div className="alert alert-danger rounded-3 mb-3">
              <i className="bi bi-exclamation-triangle-fill me-2"></i>{error}
            </div>
          )}

          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body p-4">
              <form onSubmit={handleSubmit}>
                <div className="row g-3">
                  <div className="col-12">
                    <label className="form-label fw-semibold small">Job Title *</label>
                    <input className="form-control form-control-lg rounded-3" required
                      value={form?.title || ''}
                      onChange={e => setForm({ ...form, title: e.target.value })}
                      placeholder="e.g. Senior React Developer" />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label fw-semibold small">Job Type</label>
                    <select className="form-select rounded-3" value={form?.jobType || ''}
                      onChange={e => setForm({ ...form, jobType: e.target.value })}>
                      <option value="FULL_TIME">Full Time</option>
                      <option value="PART_TIME">Part Time</option>
                      <option value="CONTRACT">Contract</option>
                      <option value="FREELANCE">Freelance</option>
                    </select>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label fw-semibold small">Experience Level</label>
                    <select className="form-select rounded-3" value={form?.experienceLevel || ''}
                      onChange={e => setForm({ ...form, experienceLevel: e.target.value })}>
                      <option value="ENTRY">Entry Level (0-2 yrs)</option>
                      <option value="MID">Mid Level (2-5 yrs)</option>
                      <option value="SENIOR">Senior Level (5+ yrs)</option>
                    </select>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label fw-semibold small">Status</label>
                    <select className="form-select rounded-3" value={form?.status || ''}
                      onChange={e => setForm({ ...form, status: e.target.value })}>
                      <option value="OPEN">Open</option>
                      <option value="PAUSED">Paused</option>
                      <option value="CLOSED">Closed</option>
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-semibold small">Min Salary (₹/year)</label>
                    <div className="input-group">
                      <span className="input-group-text">₹</span>
                      <input type="number" className="form-control rounded-end-3" required
                        value={form?.minSalary || ''}
                        onChange={e => setForm({ ...form, minSalary: e.target.value })} />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-semibold small">Max Salary (₹/year)</label>
                    <div className="input-group">
                      <span className="input-group-text">₹</span>
                      <input type="number" className="form-control rounded-end-3" required
                        value={form?.maxSalary || ''}
                        onChange={e => setForm({ ...form, maxSalary: e.target.value })} />
                    </div>
                  </div>
                  <div className="col-12">
                    <label className="form-label fw-semibold small">Required Skills (comma separated)</label>
                    <input className="form-control rounded-3"
                      value={form?.requiredSkills || ''}
                      onChange={e => setForm({ ...form, requiredSkills: e.target.value })}
                      placeholder="React, Java, Spring Boot, MongoDB" />
                  </div>
                  <div className="col-12">
                    <label className="form-label fw-semibold small">Job Description *</label>
                    <textarea className="form-control rounded-3" rows={6} required
                      value={form?.description || ''}
                      onChange={e => setForm({ ...form, description: e.target.value })} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-semibold small">Application Deadline</label>
                    <input type="datetime-local" className="form-control rounded-3"
                      value={form?.deadline || ''}
                      onChange={e => setForm({ ...form, deadline: e.target.value })} />
                  </div>
                  <div className="col-md-6 d-flex align-items-end pb-1">
                    <div className="form-check form-switch ms-2">
                      <input className="form-check-input" type="checkbox" id="remoteSwitch"
                        checked={form?.remote ?? true}
                        onChange={e => setForm({ ...form, remote: e.target.checked })} />
                      <label className="form-check-label fw-semibold" htmlFor="remoteSwitch">
                        <i className="bi bi-globe me-1" style={{ color: '#0A66C2' }}></i>Remote Position
                      </label>
                    </div>
                  </div>
                </div>
                <div className="d-flex gap-3 mt-4 flex-wrap">
                  <button type="submit" className="btn text-white fw-bold px-5 rounded-pill"
                    style={{ background: '#0A66C2' }} disabled={saving}>
                    {saving ? <span className="spinner-border spinner-border-sm me-2"></span> : <i className="bi bi-check-circle me-2"></i>}
                    Save Changes
                  </button>
                  <Link to="/employer/dashboard" className="btn btn-outline-secondary rounded-pill px-4">
                    Cancel
                  </Link>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}