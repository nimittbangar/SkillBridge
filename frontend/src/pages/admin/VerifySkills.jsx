import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getAllUsers, verifyUserSkill, addSkill, getAllSkills } from '../../services/api'

export default function VerifySkills() {
  const [users, setUsers] = useState([])
  const [skills, setSkills] = useState([])
  const [loading, setLoading] = useState(true)
  const [newSkill, setNewSkill] = useState({ name: '', category: 'PROGRAMMING' })
  const [verifying, setVerifying] = useState(null)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  const fetchData = () => {
    setLoading(true)
    Promise.all([getAllUsers(), getAllSkills()])
      .then(([u, s]) => {
        // fix: filter seekers with skills using skillsList
        setUsers(u.data.filter(usr => usr.role === 'SEEKER'))
        setSkills(s.data)
        setLoading(false)
      })
      .catch(() => { setError('Failed to load data'); setLoading(false) })
  }

  useEffect(() => { fetchData() }, [])

  const handleVerify = async (userId, skillName) => {
    const key = `${userId}-${skillName}`
    setVerifying(key)
    setError('')
    try {
      await verifyUserSkill({ userId, skillName })
      setSuccess(`"${skillName}" verified successfully!`)
      setTimeout(() => setSuccess(''), 3000)
      fetchData()
    } catch (e) {
      setError(`Failed to verify "${skillName}". Try again.`)
    } finally { setVerifying(null) }
  }

  const handleAddSkill = async (e) => {
    e.preventDefault()
    if (!newSkill.name.trim()) return
    setError('')
    try {
      await addSkill({ ...newSkill, verified: true })
      setSuccess(`Skill "${newSkill.name}" added to catalogue!`)
      setTimeout(() => setSuccess(''), 3000)
      setNewSkill({ name: '', category: 'PROGRAMMING' })
      fetchData()
    } catch (e) {
      setError('Failed to add skill. It may already exist.')
    }
  }

  // fix: use skillsList and verifiedSkillsList from backend
  const seekersWithSkills = users.filter(u => (u.skillsList || []).length > 0)

  return (
    <div className="container-fluid p-0">
      <div className="d-flex">
        {/* Sidebar */}
        <div className="sidebar d-none d-md-block">
          <p className="text-muted small fw-bold text-uppercase px-2 mb-2"
            style={{ fontSize: '0.7rem', letterSpacing: '0.8px' }}>Admin Panel</p>
          <nav className="nav flex-column">
            {[
              { to: '/admin/dashboard', icon: 'bi-speedometer2', label: 'Dashboard' },
              { to: '/admin/users', icon: 'bi-people', label: 'Manage Users' },
              { to: '/admin/skills', icon: 'bi-patch-check', label: 'Verify Skills' },
              { to: '/jobs', icon: 'bi-briefcase', label: 'All Jobs' },
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
              <i className="bi bi-patch-check me-2"></i>Skill Verification
            </h1>
            <p className="mb-0">Verify seeker skills and manage skill catalogue</p>
          </div>

          {success && (
            <div className="alert alert-success rounded-3 py-2 mb-3 d-flex align-items-center gap-2">
              <i className="bi bi-check-circle-fill"></i>{success}
            </div>
          )}
          {error && (
            <div className="alert alert-danger rounded-3 py-2 mb-3 d-flex align-items-center gap-2">
              <i className="bi bi-exclamation-triangle-fill"></i>{error}
            </div>
          )}

          {/* Add Skill to Catalogue */}
          <div className="card border-0 shadow-sm rounded-4 mb-4">
            <div className="card-body p-4">
              <h6 className="fw-bold mb-3" style={{ color: '#123160' }}>
                <i className="bi bi-plus-circle me-2"></i>Add Skill to Catalogue
              </h6>
              <form onSubmit={handleAddSkill}>
                <div className="row g-3 align-items-end">
                  <div className="col-md-5">
                    <label className="form-label fw-semibold small">Skill Name</label>
                    <input className="form-control rounded-3" required
                      value={newSkill.name}
                      onChange={e => setNewSkill({ ...newSkill, name: e.target.value })}
                      placeholder="e.g. Spring Boot, React, Docker..." />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label fw-semibold small">Category</label>
                    <select className="form-select rounded-3" value={newSkill.category}
                      onChange={e => setNewSkill({ ...newSkill, category: e.target.value })}>
                      <option value="PROGRAMMING">Programming</option>
                      <option value="DESIGN">Design</option>
                      <option value="MANAGEMENT">Management</option>
                      <option value="DEVOPS">DevOps</option>
                      <option value="DATABASE">Database</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                  <div className="col-md-3">
                    <button type="submit" className="btn btn-success w-100 rounded-pill fw-semibold">
                      <i className="bi bi-plus me-1"></i>Add Skill
                    </button>
                  </div>
                </div>
              </form>

              {/* Skill Catalogue Display */}
              {skills.length > 0 && (
                <div className="mt-3">
                  <div className="text-muted small fw-semibold mb-2">
                    Catalogue ({skills.length} skills)
                  </div>
                  <div className="d-flex flex-wrap gap-2">
                    {skills.map((s, i) => (
                      <span key={i} className="skill-badge verified">
                        <i className="bi bi-patch-check-fill me-1"></i>{s.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Verify User Skills */}
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body p-4">
              <h6 className="fw-bold mb-3" style={{ color: '#123160' }}>
                <i className="bi bi-people me-2"></i>
                Verify Seeker Skills ({seekersWithSkills.length} seekers with skills)
              </h6>

              {loading ? (
                <div className="text-center py-5">
                  <div className="spinner-border" style={{ color: '#123160' }}></div>
                  <p className="text-muted mt-2 small">Loading seekers...</p>
                </div>
              ) : seekersWithSkills.length === 0 ? (
                <div className="text-center py-5">
                  <i className="bi bi-people fs-1 text-muted mb-3 d-block"></i>
                  <h6 className="text-muted">No seekers have added skills yet</h6>
                  <p className="text-muted small">Ask seekers to add skills from their Profile page</p>
                </div>
              ) : (
                <div className="d-flex flex-column gap-3">
                  {seekersWithSkills.map(u => (
                    <div key={u.id} className="border rounded-3 p-3">
                      {/* User header */}
                      <div className="d-flex align-items-center gap-3 mb-3">
                        <div className="rounded-circle text-white d-flex align-items-center justify-content-center fw-bold flex-shrink-0"
                          style={{ width: 42, height: 42, background: '#123160', fontSize: 16 }}>
                          {u.name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="fw-bold">{u.name}</div>
                          <div className="text-muted small">{u.email}</div>
                        </div>
                        <div className="ms-auto">
                          <span className="badge bg-success-subtle text-success small">
                            {(u.verifiedSkillsList || []).length} verified
                          </span>
                        </div>
                      </div>

                      {/* Skills with verify buttons */}
                      <div className="d-flex flex-wrap gap-2">
                        {(u.skillsList || []).map((skill, i) => {
                          const isVerified = (u.verifiedSkillsList || []).includes(skill)
                          const key = `${u.id}-${skill}`
                          return (
                            <div key={i} className="d-flex align-items-center gap-1">
                              <span className={`skill-badge ${isVerified ? 'verified' : 'unverified'}`}>
                                {isVerified && <i className="bi bi-patch-check-fill me-1"></i>}
                                {skill}
                              </span>
                              {!isVerified && (
                                <button
                                  className="btn btn-sm fw-semibold rounded-pill"
                                  style={{
                                    background: '#D1FAE5', color: '#065f46',
                                    border: '1px solid #6EE7B7', fontSize: '0.72rem',
                                    padding: '2px 8px'
                                  }}
                                  disabled={verifying === key}
                                  onClick={() => handleVerify(u.id, skill)}>
                                  {verifying === key
                                    ? <span className="spinner-border spinner-border-sm" style={{ width: 10, height: 10 }}></span>
                                    : <><i className="bi bi-check-lg me-1"></i>Verify</>}
                                </button>
                              )}
                            </div>
                          )
                        })}
                      </div>
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