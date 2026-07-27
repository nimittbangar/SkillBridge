import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getJobById, applyToJob, getMatchScore, getSkillBreakdown, toggleSavedJob, getSavedJobs } from '../services/api'
import { useAuth } from '../context/AuthContext'
import CompanyLogo from '../components/CompanyLogo'

export default function JobDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [job, setJob] = useState(null)
  const [loading, setLoading] = useState(true)
  const [matchScore, setMatchScore] = useState(null)
  const [breakdown, setBreakdown] = useState(null)
  const [coverLetter, setCoverLetter] = useState('')
  const [applying, setApplying] = useState(false)
  const [applied, setApplied] = useState(false)
  const [applyError, setApplyError] = useState('')
  const [isSaved, setIsSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await getJobById(id)
        setJob(data)
        if (user?.role === 'SEEKER') {
          try {
            const { data: score } = await getMatchScore(id)
            setMatchScore(score.score)
            try {
              const { data: bd } = await getSkillBreakdown(id)
              setBreakdown(bd)
            } catch { /* breakdown is optional; match score still shows */ }
          } catch { setMatchScore(0) }
          try {
            const { data: saved } = await getSavedJobs()
            setIsSaved(saved.some(j => j.id === id))
          } catch {}
        }
      } catch (e) {
        console.error('Job not found', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id, user])

  const handleApply = async () => {
    if (!user) { navigate('/login'); return }
    setApplying(true); setApplyError('')
    try {
      await applyToJob(id, { coverLetter })
      setApplied(true)
    } catch (e) {
      setApplyError(e.response?.data || 'Failed to apply. You may have already applied to this job.')
    } finally { setApplying(false) }
  }

  const handleToggleSave = async () => {
    if (!user || user.role !== 'SEEKER') return
    setSaving(true)
    try {
      await toggleSavedJob(id)
      setIsSaved(prev => !prev)
    } catch { console.error('Save failed') }
    finally { setSaving(false) }
  }

  const scoreColor = s => s >= 70 ? '#057642' : s >= 40 ? '#d97706' : '#dc3545'
  const scoreMsg = s => s >= 70 ? 'Great fit! Apply now.' : s >= 40 ? 'Decent match. Worth trying!' : 'Low match. Add more skills first.'

  if (loading) return (
    <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
      <div className="spinner-border" style={{ color: '#123160' }}></div>
    </div>
  )

  if (!job) return (
    <div className="text-center py-5">
      <i className="bi bi-briefcase-x fs-1 text-muted mb-3 d-block"></i>
      <h5 className="text-muted">Job not found</h5>
    </div>
  )

  const skills = job.requiredSkillsList || []

  return (
    <div className="container py-4">
      <div className="row g-4">

        {/* ── Left: Job Info ── */}
        <div className="col-lg-8">
          <div className="card border-0 shadow-sm rounded-4 mb-4">
            <div className="card-body p-4">

              {/* Company Header */}
              <div className="d-flex gap-3 mb-4">
                <CompanyLogo companyName={job.companyName} size={56} />
                <div className="flex-fill">
                  <div className="d-flex align-items-start gap-2 mb-1">
                    <h2 className="fw-bold flex-fill" style={{ fontSize: '1.4rem' }}>
                      {job.title}
                    </h2>
                    {/* Save Button */}
                    {user?.role === 'SEEKER' && (
                      <button
                        onClick={handleToggleSave}
                        disabled={saving}
                        title={isSaved ? 'Remove from saved' : 'Save this job'}
                        className="btn btn-sm rounded-pill flex-shrink-0"
                        style={{
                          background: isSaved ? '#FEF3C7' : '#EEF3F8',
                          color: isSaved ? '#d97706' : '#adb5bd',
                          border: `1px solid ${isSaved ? '#FCD34D' : '#e2e8f0'}`
                        }}>
                        {saving
                          ? <span className="spinner-border spinner-border-sm" style={{ width: 12, height: 12 }}></span>
                          : <i className={`bi ${isSaved ? 'bi-bookmark-fill' : 'bi-bookmark'}`}></i>}
                        <span className="ms-1 small">{isSaved ? 'Saved' : 'Save'}</span>
                      </button>
                    )}
                  </div>
                  <div className="text-muted">{job.companyName}</div>
                  <div className="d-flex flex-wrap gap-2 mt-2">
                    {job.remote && (
                      <span className="badge rounded-pill"
                        style={{ background: '#D1FAE5', color: '#065f46', fontSize: '0.8rem' }}>
                        Remote
                      </span>
                    )}
                    <span className="badge rounded-pill bg-light text-dark" style={{ fontSize: '0.8rem' }}>
                      {job.experienceLevel}
                    </span>
                    <span className="badge rounded-pill bg-light text-dark" style={{ fontSize: '0.8rem' }}>
                      {job.jobType?.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Meta Info — DARK MODE FIXED */}
              <div className="row g-3 mb-4">
                {[
                  {
                    icon: 'bi-currency-rupee',
                    value: `₹${job.minSalary ? (job.minSalary / 100000).toFixed(0) + 'L' : '?'}–${job.maxSalary ? (job.maxSalary / 100000).toFixed(0) + 'L' : '?'}`,
                    label: 'Per Year'
                  },
                  { icon: 'bi-bar-chart', value: job.experienceLevel, label: 'Level' },
                  { icon: 'bi-clock', value: job.jobType?.replace('_', ' '), label: 'Type' },
                  { icon: 'bi-people', value: job.applicationCount || 0, label: 'Applicants' },
                ].map((item, i) => (
                  <div key={i} className="col-6 col-md-3">
                    <div className="text-center p-2 rounded-3"
                      style={{ background: 'var(--meta-bg, #EEF3F8)' }}>
                      <i className={`bi ${item.icon} d-block mb-1`}
                        style={{ color: '#123160', fontSize: '1.2rem' }}></i>
                      <div className="small fw-semibold">{item.value}</div>
                      <div className="text-muted" style={{ fontSize: '0.7rem' }}>{item.label}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Required Skills */}
              <div className="mb-4">
                <h6 className="fw-bold mb-2">Required Skills</h6>
                {skills.length === 0 ? (
                  <span className="text-muted small">No specific skills listed</span>
                ) : (
                  <div className="d-flex flex-wrap gap-2">
                    {skills.map((s, i) => (
                      <span key={i} className="skill-badge unverified">{s}</span>
                    ))}
                  </div>
                )}
              </div>

              {/* Description */}
              <div>
                <h6 className="fw-bold mb-2">Job Description</h6>
                <p className="text-muted" style={{ whiteSpace: 'pre-line', lineHeight: 1.7 }}>
                  {job.description}
                </p>
              </div>

            </div>
          </div>
        </div>

        {/* ── Right: Match Score + Apply ── */}
        <div className="col-lg-4">

          {/* Match Score — SEEKER only */}
          {user?.role === 'SEEKER' && matchScore !== null && (
            <div className="card border-0 shadow-sm rounded-4 mb-4">
              <div className="card-body p-4 text-center">
                <h6 className="fw-bold text-muted mb-3">Your Skill Match</h6>
                <div className="rounded-circle mx-auto mb-3 d-flex align-items-center justify-content-center text-white fw-bold"
                  style={{ width: 90, height: 90, fontSize: '1.5rem', background: scoreColor(matchScore) }}>
                  {matchScore}%
                </div>
                <p className="text-muted small mb-0">{scoreMsg(matchScore)}</p>
                <div className="mt-3 pt-3 border-top">
                  <div className="d-flex justify-content-between small text-muted mb-1">
                    <span>Match strength</span>
                    <span className="fw-bold" style={{ color: scoreColor(matchScore) }}>{matchScore}%</span>
                  </div>
                  <div className="progress rounded-pill" style={{ height: 8 }}>
                    <div className="progress-bar rounded-pill" role="progressbar"
                      style={{ width: `${matchScore}%`, background: scoreColor(matchScore) }}>
                    </div>
                  </div>
                </div>

                {breakdown && (
                  <div className="mt-3 pt-3 border-top text-start">
                    {breakdown.matched && breakdown.matched.length > 0 && (
                      <>
                        <div className="small fw-semibold text-muted mb-2">Your matching skills</div>
                        <div className="d-flex flex-wrap gap-2 mb-3">
                          {breakdown.matched.map((s, i) => {
                            const isVerified = breakdown.verified && breakdown.verified.includes(s)
                            return (
                              <span key={i} className="badge rounded-pill d-inline-flex align-items-center"
                                style={{ background: '#D1FAE5', color: '#057642', fontSize: '0.75rem', fontWeight: 500 }}>
                                <i className="bi bi-check-circle-fill me-1"></i>{s}
                                {isVerified && <i className="bi bi-patch-check-fill ms-1" title="Admin-verified skill"></i>}
                              </span>
                            )
                          })}
                        </div>
                      </>
                    )}
                    {breakdown.missing && breakdown.missing.length > 0 && (
                      <>
                        <div className="small fw-semibold text-muted mb-2">Skills you're missing</div>
                        <div className="d-flex flex-wrap gap-2 mb-3">
                          {breakdown.missing.map((s, i) => (
                            <span key={i} className="badge rounded-pill d-inline-flex align-items-center"
                              style={{ background: '#FEE2E2', color: '#991b1b', fontSize: '0.75rem', fontWeight: 500 }}>
                              <i className="bi bi-x-circle me-1"></i>{s}
                            </span>
                          ))}
                        </div>
                      </>
                    )}
                    {breakdown.missing && breakdown.missing.length > 0 && (
                      <div className="small rounded-3 p-2" style={{ background: '#E6F1FB', color: '#0C447C' }}>
                        <i className="bi bi-lightbulb me-1"></i>
                        Learn {breakdown.missing.slice(0, 2).join(' and ')}
                        {breakdown.missing.length > 2 ? ` +${breakdown.missing.length - 2} more` : ''} to raise your match.
                        The <i className="bi bi-patch-check-fill"></i> badge means an admin verified that skill.
                      </div>
                    )}
                    {breakdown.missing && breakdown.missing.length === 0 && breakdown.matched && breakdown.matched.length > 0 && (
                      <div className="small rounded-3 p-2" style={{ background: '#D1FAE5', color: '#057642' }}>
                        <i className="bi bi-stars me-1"></i>
                        You have all the required skills for this job!
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Apply Card */}
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body p-4">
              <h6 className="fw-bold mb-3">Apply for this Job</h6>

              {applied ? (
                <div>
                  <div className="alert alert-success rounded-3 mb-3">
                    <i className="bi bi-check-circle-fill me-2"></i>
                    <strong>Application submitted!</strong><br />
                    <small>Track your application in My Applications.</small>
                  </div>
                  <a href="/seeker/applications"
                    className="btn w-100 text-white rounded-pill fw-semibold"
                    style={{ background: '#123160' }}>
                    <i className="bi bi-file-text me-2"></i>View My Applications
                  </a>
                </div>
              ) : (
                <>
                  {applyError && (
                    <div className="alert alert-danger rounded-3 py-2 small mb-3">
                      <i className="bi bi-exclamation-triangle me-2"></i>{applyError}
                    </div>
                  )}

                  {!user ? (
                    <div>
                      <p className="text-muted small mb-3">Login to apply for this job</p>
                      <button className="btn w-100 text-white fw-semibold rounded-pill"
                        style={{ background: '#123160' }}
                        onClick={() => navigate('/login')}>
                        <i className="bi bi-person me-2"></i>Login to Apply
                      </button>
                    </div>
                  ) : user.role === 'EMPLOYER' ? (
                    <div className="alert alert-info rounded-3 py-2 small mb-0">
                      <i className="bi bi-info-circle me-2"></i>Employers cannot apply to jobs.
                    </div>
                  ) : user.role === 'ADMIN' ? (
                    <div className="alert alert-info rounded-3 py-2 small mb-0">
                      <i className="bi bi-info-circle me-2"></i>Admins cannot apply to jobs.
                    </div>
                  ) : (
                    <>
                      <div className="mb-3">
                        <label className="form-label fw-semibold small">
                          Cover Letter <span className="text-muted">(optional)</span>
                        </label>
                        <textarea className="form-control rounded-3" rows={4}
                          placeholder="Tell the employer why you're a great fit..."
                          value={coverLetter}
                          onChange={e => setCoverLetter(e.target.value)} />
                      </div>
                      <button className="btn w-100 text-white fw-semibold rounded-pill py-2"
                        style={{ background: '#123160', fontSize: '1rem' }}
                        onClick={handleApply} disabled={applying}>
                        {applying
                          ? <><span className="spinner-border spinner-border-sm me-2"></span>Submitting...</>
                          : <><i className="bi bi-send me-2"></i>Submit Application</>}
                      </button>
                      <small className="text-muted d-block text-center mt-2">
                        <i className="bi bi-envelope me-1"></i>
                        You'll receive a confirmation email after applying
                      </small>
                    </>
                  )}
                </>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}