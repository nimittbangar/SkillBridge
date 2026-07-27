import React, { useState, useEffect } from 'react'
import UserAvatar from '../../components/UserAvatar'
import { Link } from 'react-router-dom'
import { getAllUsers, deleteUser, toggleUserActive } from '../../services/api'
import { exportToCsv } from '../../utils/csvExport'
import { useAuth } from '../../context/AuthContext'

const roleColors = { SEEKER: 'primary', EMPLOYER: 'warning', ADMIN: 'danger' }
const roleIcons = { SEEKER: 'bi-person', EMPLOYER: 'bi-building', ADMIN: 'bi-shield-lock' }

export default function ManageUsers() {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [deleting, setDeleting] = useState(null)
  const [toggling, setToggling] = useState(null)
  const PAGE_SIZE = 20
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  const fetchUsers = () => {
    setLoading(true)
    getAllUsers().then(({ data }) => { setUsers(data); setLoading(false) }).catch(() => setLoading(false))
  }
  useEffect(() => { fetchUsers() }, [])

  // Reset to the first page whenever the search or role filter changes
  useEffect(() => { setVisibleCount(PAGE_SIZE) }, [search, roleFilter])

  const handleDelete = async (id, name, role) => {
    if (role === 'ADMIN') {
      alert('Cannot delete another Admin account!')
      return
    }
    const confirmed = window.confirm(
      `Delete "${name}" permanently?\n\nThis will also delete:\n• All their job postings\n• All their applications\n• All their interviews\n\nThis cannot be undone!`
    )
    if (!confirmed) return
    setDeleting(id)
    try {
      await deleteUser(id)
      fetchUsers()
    } catch (e) {
      alert('Failed to delete user. Please try again.')
    } finally {
      setDeleting(null)
    }
  }

  const handleToggleActive = async (id, currentlyActive) => {
    const action = currentlyActive ? 'deactivate' : 'reactivate'
    if (!window.confirm(`Are you sure you want to ${action} this account?`)) return
    setToggling(id)
    try {
      await toggleUserActive(id)
      fetchUsers()
    } catch (e) {
      alert(e.response?.data || `Failed to ${action} account.`)
    } finally {
      setToggling(null)
    }
  }

  const filtered = users.filter(u =>
    (u.name?.toLowerCase().includes(search.toLowerCase()) ||
     u.email?.toLowerCase().includes(search.toLowerCase())) &&
    (roleFilter === '' || u.role === roleFilter)
  )
  const visibleUsers = filtered.slice(0, visibleCount)

  const handleExport = () => {
    exportToCsv('skillbridge-users.csv', filtered, [
      { label: 'Name', accessor: u => u.name },
      { label: 'Email', accessor: u => u.email },
      { label: 'Role', accessor: u => u.role },
      { label: 'Company', accessor: u => u.companyName || '' },
      { label: 'Skills Count', accessor: u => u.skillsList?.length || 0 },
      { label: 'Verified Skills', accessor: u => u.verifiedSkillsList?.length || 0 },
      { label: 'Active', accessor: u => u.active === false ? 'No' : 'Yes' },
      { label: 'Joined', accessor: u => u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '' },
    ])
  }

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
              { to: '/jobs', icon: 'bi-briefcase', label: 'All Jobs' },
            ].map((item, i) => (
              <Link key={i} to={item.to} className="nav-link">
                <i className={`bi ${item.icon}`}></i>{item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex-fill main-content p-3">
          <div className="welcome-header">
            <h1 className="fw-bold mb-1"><i className="bi bi-people me-2"></i>Manage Users</h1>
            <p className="mb-0">{users.length} registered users on the platform</p>
          </div>

          {/* Stats Row */}
          <div className="row g-3 mb-4">
            {[
              { label: 'Total', value: users.length, color: '#123160' },
              { label: 'Seekers', value: users.filter(u => u.role === 'SEEKER').length, color: '#123160' },
              { label: 'Employers', value: users.filter(u => u.role === 'EMPLOYER').length, color: '#f59e0b' },
              { label: 'Admins', value: users.filter(u => u.role === 'ADMIN').length, color: '#dc3545' },
            ].map((s, i) => (
              <div key={i} className="col-6 col-md-3">
                <div className="stat-card">
                  <div className="number" style={{ color: s.color }}>{s.value}</div>
                  <div className="label">{s.label}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="card border-0 shadow-sm rounded-3">
            <div className="card-body p-4">
              {/* Search + Filter */}
              <div className="d-flex gap-2 mb-3 flex-wrap">
                <div className="input-group" style={{ maxWidth: 300 }}>
                  <span className="input-group-text bg-white border-end-0">
                    <i className="bi bi-search text-muted"></i>
                  </span>
                  <input className="form-control border-start-0" placeholder="Search name or email..."
                    value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <select className="form-select" style={{ maxWidth: 150 }}
                  value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
                  <option value="">All Roles</option>
                  <option value="SEEKER">Seeker</option>
                  <option value="EMPLOYER">Employer</option>
                  <option value="ADMIN">Admin</option>
                </select>
                <span className="text-muted small align-self-center ms-auto">
                  {filtered.length} result{filtered.length !== 1 ? 's' : ''}
                </span>
                <button className="btn btn-sm rounded-pill" style={{background:'#EEF3F8',color:'#123160',border:'1px solid #123160'}}
                  onClick={handleExport}>
                  <i className="bi bi-download me-1"></i>Export CSV
                </button>
              </div>

              {loading ? (
                <div className="text-center py-4"><div className="spinner-border text-primary"></div></div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-4">
                  <i className="bi bi-people fs-2 text-muted mb-2 d-block"></i>
                  <p className="text-muted small">No users found.</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0" style={{ fontSize: '0.85rem' }}>
                    <thead className="table-light">
                      <tr>
                        <th>User</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th className="d-none d-md-table-cell">Skills</th>
                        <th className="d-none d-md-table-cell">Verified</th>
                        <th className="d-none d-lg-table-cell">Joined</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleUsers.map(u => (
                        <tr key={u.id} style={{ opacity: deleting === u.id ? 0.5 : 1 }}>
                          <td>
                            <div className="d-flex align-items-center gap-2">
                              <div className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold flex-shrink-0"
                                style={{
                                  width: 36, height: 36, fontSize: 14,
                                  background: u.role === 'ADMIN' ? '#dc3545' : u.role === 'EMPLOYER' ? '#f59e0b' : '#123160'
                                }}>
                                {u.name?.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="fw-semibold" style={{ fontSize: '0.88rem' }}>{u.name}</div>
                                {u.companyName && <div className="text-muted" style={{ fontSize: '0.75rem' }}>{u.companyName}</div>}
                              </div>
                            </div>
                          </td>
                          <td className="text-muted small">{u.email}</td>
                          <td>
                            <span className={`badge bg-${roleColors[u.role] || 'secondary'}`} style={{ fontSize: '0.72rem' }}>
                              <i className={`bi ${roleIcons[u.role] || 'bi-person'} me-1`}></i>
                              {u.role}
                            </span>
                            {u.role !== 'ADMIN' && (
                              <span className={`badge ms-1 ${u.active === false ? 'bg-secondary' : 'bg-success'}`} style={{ fontSize: '0.65rem' }}>
                                {u.active === false ? 'Inactive' : 'Active'}
                              </span>
                            )}
                          </td>
                          <td className="d-none d-md-table-cell text-muted small">
                            {u.skillsList?.length || 0} skills
                          </td>
                          <td className="d-none d-md-table-cell">
                            {u.verifiedSkillsList?.length > 0 ? (
                              <span className="badge" style={{ background: '#D1FAE5', color: '#065f46', fontSize: '0.72rem' }}>
                                <i className="bi bi-patch-check-fill me-1"></i>
                                {u.verifiedSkillsList.length} verified
                              </span>
                            ) : (
                              <span className="text-muted small">—</span>
                            )}
                          </td>
                          <td className="d-none d-lg-table-cell text-muted small">
                            {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
                          </td>
                          <td>
                            {u.id === currentUser?.id || u.role === 'ADMIN' ? (
                              <span className="text-muted small">—</span>
                            ) : (
                              <div className="d-flex gap-1 flex-wrap">
                                <button
                                  className="btn btn-sm rounded-pill"
                                  style={{
                                    background: u.active === false ? '#D1FAE5' : '#FEF3C7',
                                    color: u.active === false ? '#065f46' : '#92400e',
                                    border: '1px solid ' + (u.active === false ? '#6EE7B7' : '#FCD34D'),
                                    fontSize: '0.75rem'
                                  }}
                                  disabled={toggling === u.id}
                                  onClick={() => handleToggleActive(u.id, u.active !== false)}>
                                  {toggling === u.id
                                    ? <span className="spinner-border spinner-border-sm"></span>
                                    : u.active === false
                                      ? <><i className="bi bi-check-circle me-1"></i>Reactivate</>
                                      : <><i className="bi bi-pause-circle me-1"></i>Deactivate</>}
                                </button>
                                <button
                                  className="btn btn-sm rounded-pill"
                                  style={{ background: '#FEE2E2', color: '#991b1b', border: '1px solid #fca5a5', fontSize: '0.75rem' }}
                                  disabled={deleting === u.id}
                                  onClick={() => handleDelete(u.id, u.name, u.role)}>
                                  {deleting === u.id
                                    ? <span className="spinner-border spinner-border-sm"></span>
                                    : <><i className="bi bi-trash me-1"></i>Delete</>}
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {!loading && filtered.length > visibleCount && (
                <div className="text-center mt-3">
                  <button className="btn btn-sm rounded-pill px-4"
                    style={{background:'#EEF3F8',color:'#123160',border:'1px solid #123160'}}
                    onClick={() => setVisibleCount(c => c + PAGE_SIZE)}>
                    Show More ({filtered.length - visibleCount} remaining)
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Info card — plain div on purpose, not .card: its colors are self-contained
              and shouldn't be swapped by dark mode, the way a normal card would be. */}
          <div className="border-0 mt-3 rounded-3" style={{ background: '#FEF3C7', border: '1px solid #FCD34D' }}>
            <div className="py-3 px-4">
              <div className="mb-0 small" style={{ color: '#92400e' }}>
                <i className="bi bi-info-circle-fill me-2"></i>
                <strong>Cascade Delete:</strong> Deleting a user also permanently removes all their job postings, applications, and interviews from the database.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}