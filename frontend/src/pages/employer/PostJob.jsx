import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { createJob } from '../../services/api'

export default function PostJob() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    title: '',
    description: '',
    jobType: 'FULL_TIME',
    experienceLevel: 'MID',
    remote: true,
    minSalary: '',
    maxSalary: '',
    requiredSkills: '',
    deadline: '',
    location: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    // Validate
    if (!form.title.trim()) { setError('Job title is required'); return }
    if (!form.description.trim()) { setError('Job description is required'); return }
    if (!form.requiredSkills.trim()) { setError('Required skills are needed'); return }
    if (!form.minSalary || !form.maxSalary) { setError('Salary range is required'); return }
    if (parseFloat(form.minSalary) < 0 || parseFloat(form.maxSalary) < 0) {
      setError('Salary cannot be negative'); return
    }
    if (parseFloat(form.minSalary) > parseFloat(form.maxSalary)) {
      setError('Min salary cannot be greater than max salary'); return
    }

    setLoading(true)
    try {
      // ─── KEY FIX: send requiredSkills as comma-separated STRING not array ───
      const skillsString = form.requiredSkills
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
        .join(',')

      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        jobType: form.jobType,
        experienceLevel: form.experienceLevel,
        remote: form.remote,
        minSalary: parseFloat(form.minSalary),
        maxSalary: parseFloat(form.maxSalary),
        requiredSkills: skillsString,   // send as string
        location: form.location.trim() || 'Remote',
        deadline: form.deadline || null,
        status: 'OPEN',
        currency: 'INR'
      }

      await createJob(payload)
      setSuccess(true)
      setTimeout(() => navigate('/employer/dashboard'), 1500)
    } catch (err) {
      console.error('Post job error:', err)
      setError(err.response?.data || err.message || 'Failed to post job. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container-fluid p-0">
      <div className="d-flex">
        {/* Sidebar */}
        <div className="sidebar d-none d-md-block">
          <p className="text-muted small fw-bold text-uppercase px-2 mb-2"
            style={{ fontSize: '0.7rem', letterSpacing: '0.8px' }}>Menu</p>
          <nav className="nav flex-column">
            {[
              { to: '/employer/dashboard', icon: 'bi-speedometer2', label: 'Dashboard' },
              { to: '/employer/post-job', icon: 'bi-plus-circle', label: 'Post a Job' },
              { to: '/employer/interviews', icon: 'bi-camera-video', label: 'Interviews' },
              { to: '/profile', icon: 'bi-building', label: 'Company Profile' },
            ].map((item, i) => (
              <Link key={i} to={item.to} className="nav-link">
                <i className={`bi ${item.icon}`}></i>{item.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Main */}
        <div className="flex-fill main-content p-3">
          <div className="welcome-header">
            <h1 className="fw-bold mb-1">
              <i className="bi bi-plus-circle me-2"></i>Post a New Job
            </h1>
            <p className="mb-0">Fill in the details to attract the right candidates</p>
          </div>

          {/* Success Message */}
          {success && (
            <div className="alert alert-success rounded-3 mb-3 d-flex align-items-center gap-2">
              <i className="bi bi-check-circle-fill fs-5"></i>
              <div>
                <div className="fw-bold">Job posted successfully!</div>
                <div className="small">Redirecting to dashboard...</div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="alert alert-danger rounded-3 mb-3 d-flex align-items-center gap-2">
              <i className="bi bi-exclamation-triangle-fill fs-5"></i>
              <div>{error}</div>
              <button className="btn-close ms-auto" aria-label="Close" onClick={() => setError('')}></button>
            </div>
          )}

          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body p-4">
              <form onSubmit={handleSubmit}>
                <div className="row g-3">

                  {/* Job Title */}
                  <div className="col-12">
                    <label className="form-label fw-semibold small">
                      Job Title <span className="text-danger">*</span>
                    </label>
                    <input className="form-control form-control-lg rounded-3" required
                      value={form.title}
                      onChange={e => setForm({ ...form, title: e.target.value })}
                      placeholder="e.g. Senior React Developer" />
                  </div>

                  {/* Job Type + Experience */}
                  <div className="col-md-4">
                    <label className="form-label fw-semibold small">Job Type</label>
                    <select className="form-select rounded-3" value={form.jobType}
                      onChange={e => setForm({ ...form, jobType: e.target.value })}>
                      <option value="FULL_TIME">Full Time</option>
                      <option value="PART_TIME">Part Time</option>
                      <option value="CONTRACT">Contract</option>
                      <option value="FREELANCE">Freelance</option>
                    </select>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label fw-semibold small">Experience Level</label>
                    <select className="form-select rounded-3" value={form.experienceLevel}
                      onChange={e => setForm({ ...form, experienceLevel: e.target.value })}>
                      <option value="ENTRY">Entry Level (0–2 yrs)</option>
                      <option value="MID">Mid Level (2–5 yrs)</option>
                      <option value="SENIOR">Senior Level (5+ yrs)</option>
                    </select>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label fw-semibold small">Location</label>
                    <input className="form-control rounded-3" value={form.location}
                      onChange={e => setForm({ ...form, location: e.target.value })}
                      placeholder="e.g. Bangalore / Remote" />
                  </div>

                  {/* Salary */}
                  <div className="col-md-6">
                    <label className="form-label fw-semibold small">
                      Min Salary (₹/year) <span className="text-danger">*</span>
                    </label>
                    <div className="input-group">
                      <span className="input-group-text bg-light">₹</span>
                      <input type="number" className="form-control rounded-end-3" required
                        value={form.minSalary}
                        onChange={e => setForm({ ...form, minSalary: e.target.value })}
                        placeholder="500000" min="0" />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-semibold small">
                      Max Salary (₹/year) <span className="text-danger">*</span>
                    </label>
                    <div className="input-group">
                      <span className="input-group-text bg-light">₹</span>
                      <input type="number" className="form-control rounded-end-3" required
                        value={form.maxSalary}
                        onChange={e => setForm({ ...form, maxSalary: e.target.value })}
                        placeholder="1200000" min="0" />
                    </div>
                  </div>

                  {/* Required Skills */}
                  <div className="col-12">
                    <label className="form-label fw-semibold small">
                      Required Skills <span className="text-danger">*</span>
                    </label>
                    <input className="form-control rounded-3" required
                      value={form.requiredSkills}
                      onChange={e => setForm({ ...form, requiredSkills: e.target.value })}
                      placeholder="React, Java, Spring Boot, MongoDB, REST API" />
                    <small className="text-muted">
                      <i className="bi bi-info-circle me-1"></i>
                      Separate with commas — used to calculate candidate skill match scores
                    </small>

                    {/* Skill Preview Tags */}
                    {form.requiredSkills && (
                      <div className="d-flex flex-wrap gap-1 mt-2">
                        {form.requiredSkills.split(',').map((s, i) => s.trim() ? (
                          <span key={i} className="skill-badge unverified">{s.trim()}</span>
                        ) : null)}
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  <div className="col-12">
                    <label className="form-label fw-semibold small">
                      Job Description <span className="text-danger">*</span>
                    </label>
                    <textarea className="form-control rounded-3" rows={6} required
                      value={form.description}
                      onChange={e => setForm({ ...form, description: e.target.value })}
                      placeholder="Describe the role, responsibilities, requirements, and what you're looking for in a candidate..." />
                    <small className="text-muted">{form.description.length} characters</small>
                  </div>

                  {/* Deadline + Remote */}
                  <div className="col-md-6">
                    <label className="form-label fw-semibold small">Application Deadline (optional)</label>
                    <input type="datetime-local" className="form-control rounded-3"
                      value={form.deadline}
                      onChange={e => setForm({ ...form, deadline: e.target.value })} />
                  </div>
                  <div className="col-md-6 d-flex align-items-end pb-1">
                    <div className="form-check form-switch ms-2">
                      <input className="form-check-input" type="checkbox" id="remoteSwitch"
                        style={{ width: 44, height: 22 }}
                        checked={form.remote}
                        onChange={e => setForm({ ...form, remote: e.target.checked })} />
                      <label className="form-check-label fw-semibold ms-2" htmlFor="remoteSwitch">
                        <i className="bi bi-globe me-1" style={{ color: '#0A66C2' }}></i>
                        Remote Position
                      </label>
                    </div>
                  </div>
                </div>

                {/* Submit */}
                <div className="d-flex gap-3 mt-4 flex-wrap">
                  <button type="submit"
                    className="btn text-white fw-bold px-5 rounded-pill"
                    style={{ background: '#0A66C2', fontSize: '1rem' }}
                    disabled={loading || success}>
                    {loading
                      ? <><span className="spinner-border spinner-border-sm me-2"></span>Posting...</>
                      : <><i className="bi bi-send me-2"></i>Post Job</>}
                  </button>
                  <Link to="/employer/dashboard"
                    className="btn btn-outline-secondary fw-bold px-4 rounded-pill">
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