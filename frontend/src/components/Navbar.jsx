import React, { useEffect, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import UserAvatar from './UserAvatar'
import NotificationBell from './NotificationBell'

export default function Navbar() {
  const { user, logout } = useAuth()
  const { dark, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const handleLogout = () => { logout(); navigate('/login') }

  const getDash = () => {
    if (!user) return '/login'
    if (user.role === 'EMPLOYER') return '/employer/dashboard'
    if (user.role === 'ADMIN') return '/admin/dashboard'
    return '/seeker/dashboard'
  }

  useEffect(() => {
    const fn = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'A') { e.preventDefault(); navigate('/admin/login') }
    }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [navigate])

  // ── Secret admin access: 5 clicks on the logo/brand within 1.5s ──
  const logoClickCount = useRef(0)
  const logoClickTimer = useRef(null)
  const handleLogoClick = (e) => {
    logoClickCount.current += 1
    if (logoClickTimer.current) clearTimeout(logoClickTimer.current)
    if (logoClickCount.current >= 5) {
      e.preventDefault()
      logoClickCount.current = 0
      navigate('/admin/login')
      return
    }
    // Reset the count if the user pauses for more than 1.5s between clicks
    logoClickTimer.current = setTimeout(() => { logoClickCount.current = 0 }, 1500)
  }

  const mobileNav = () => {
    if (!user) return [
      {to:'/', icon:'bi-house-fill', label:'Home'},
      {to:'/jobs', icon:'bi-briefcase-fill', label:'Jobs'},
      {to:'/login', icon:'bi-person-fill', label:'Login'},
      {to:'/register', icon:'bi-person-plus-fill', label:'Sign Up'},
    ]
    if (user.role === 'SEEKER') return [
      {to:'/seeker/dashboard', icon:'bi-speedometer2', label:'Dashboard'},
      {to:'/jobs', icon:'bi-search', label:'Jobs'},
      {to:'/seeker/applications', icon:'bi-file-text-fill', label:'Applied'},
      {to:'/seeker/saved-jobs', icon:'bi-bookmark-fill', label:'Saved'},
      {to:'/seeker/offers', icon:'bi-trophy-fill', label:'Offers'},
    ]
    if (user.role === 'EMPLOYER') return [
      {to:'/employer/dashboard', icon:'bi-speedometer2', label:'Dashboard'},
      {to:'/employer/post-job', icon:'bi-plus-circle-fill', label:'Post Job'},
      {to:'/employer/interviews', icon:'bi-camera-video-fill', label:'Interviews'},
      {to:'/jobs', icon:'bi-briefcase-fill', label:'Jobs'},
    ]
    if (user.role === 'ADMIN') return [
      {to:'/admin/dashboard', icon:'bi-speedometer2', label:'Dashboard'},
      {to:'/admin/users', icon:'bi-people-fill', label:'Users'},
      {to:'/admin/skills', icon:'bi-patch-check-fill', label:'Skills'},
      {to:'/admin/jobs', icon:'bi-briefcase-fill', label:'Jobs'},
      {to:'/admin/applications', icon:'bi-file-text-fill', label:'Apps'},
    ]
    return []
  }

  return (
    <>
      <nav className="navbar navbar-expand-lg sticky-top shadow-sm" style={{background:'#123160'}}>
        <div className="container-fluid px-3">
          <Link className="navbar-brand d-flex align-items-center gap-2 text-white fw-bold" to="/" onClick={handleLogoClick}>
            <img src="/logo.svg" alt="SkillBridge" width={28} height={28} style={{borderRadius:6}} onError={e=>e.target.style.display='none'}/>
            SkillBridge
          </Link>
          <button className="navbar-toggler border-0" type="button" data-bs-toggle="collapse" data-bs-target="#navMenu" style={{filter:'invert(1)'}}>
            <span className="navbar-toggler-icon"></span>
          </button>
          <div className="collapse navbar-collapse" id="navMenu">
            <ul className="navbar-nav me-auto gap-1">
              {(!user || user?.role === 'SEEKER') && (
                <li className="nav-item">
                  <Link className="nav-link text-white" to="/jobs"><i className="bi bi-briefcase me-1"></i>Browse Jobs</Link>
                </li>
              )}
              {user?.role==='SEEKER' && (
                <li className="nav-item">
                  <Link className="nav-link text-white d-flex align-items-center gap-1" to="/career-room">
                    <i className="bi bi-stars me-1"></i>Career Room
                    <span style={{
                      background:'#22c55e', color:'#fff',
                      fontSize:'0.6rem', fontWeight:700,
                      padding:'1px 6px', borderRadius:20,
                      letterSpacing:'0.5px', lineHeight:1.6,
                      animation:'pulse 2s infinite'
                    }}>NEW</span>
                  </Link>
                </li>
              )}
              {user && <li className="nav-item">
                <Link className="nav-link text-white" to={getDash()}><i className="bi bi-speedometer2 me-1"></i>Dashboard</Link>
              </li>}
              {user?.role==='EMPLOYER' && <>
                <li className="nav-item"><Link className="nav-link text-white" to="/employer/post-job"><i className="bi bi-plus-circle me-1"></i>Post Job</Link></li>
                <li className="nav-item"><Link className="nav-link text-white" to="/employer/applicants"><i className="bi bi-people me-1"></i>Applicants</Link></li>
                <li className="nav-item"><Link className="nav-link text-white" to="/employer/interviews"><i className="bi bi-camera-video me-1"></i>Interviews</Link></li>
                <li className="nav-item"><Link className="nav-link text-white" to="/employer/company-profile"><i className="bi bi-building me-1"></i>Company</Link></li>
              </>}
              {user?.role==='ADMIN' && <>
                <li className="nav-item"><Link className="nav-link text-white" to="/admin/users"><i className="bi bi-people me-1"></i>Users</Link></li>
                <li className="nav-item"><Link className="nav-link text-white" to="/admin/skills"><i className="bi bi-patch-check me-1"></i>Skills</Link></li>
                <li className="nav-item"><Link className="nav-link text-white" to="/admin/jobs"><i className="bi bi-briefcase me-1"></i>Jobs</Link></li>
                <li className="nav-item"><Link className="nav-link text-white" to="/admin/applications"><i className="bi bi-file-text me-1"></i>Applications</Link></li>
              </>}
            </ul>
            <ul className="navbar-nav align-items-center gap-2">

              {/* ── DARK MODE TOGGLE BUTTON ── */}
              <li className="nav-item">
                <button
                  onClick={toggleTheme}
                  title={dark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                  className="btn btn-sm d-flex align-items-center justify-content-center theme-toggle-btn icon-btn-circle"
                  style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: dark
                      ? 'linear-gradient(145deg, #FFD166 0%, #FB923C 100%)'
                      : 'linear-gradient(145deg, #6D28D9 0%, #4C1D95 100%)',
                    border: dark ? '1.5px solid #FFE8A3' : '1.5px solid #A78BFA',
                    boxShadow: dark
                      ? '0 0 10px rgba(251,191,36,0.6)'
                      : '0 0 10px rgba(167,139,250,0.55)',
                    color: '#fff',
                    transition: 'all 0.35s ease',
                    fontSize: '1rem'
                  }}>
                  <i className={`bi ${dark ? 'bi-sun-fill' : 'bi-moon-stars-fill'}`}></i>
                </button>
              </li>

              {!user ? (
                <>
                  <li className="nav-item">
                    <Link to="/login" className="btn btn-sm fw-semibold px-3 rounded-pill"
                      style={{background:'transparent',color:'#fff',border:'1.5px solid #fff',fontSize:'0.82rem'}}>
                      <i className="bi bi-person me-1"></i>Login
                    </Link>
                  </li>
                  <li className="nav-item">
                    <Link to="/register" className="btn btn-sm fw-semibold px-3 rounded-pill"
                      style={{background:'#fff',color:'#123160',border:'1.5px solid #fff',fontSize:'0.82rem'}}>
                      <i className="bi bi-person-plus me-1"></i>Sign Up
                    </Link>
                  </li>
                </>
              ) : (
                <>
                  <li className="nav-item">
                    <NotificationBell />
                  </li>
                  <li className="nav-item dropdown">
                    <a className="nav-link dropdown-toggle text-white d-flex align-items-center gap-2" href="#" data-bs-toggle="dropdown">
                      <UserAvatar name={user.name} size={32} />
                      <span className="d-none d-md-inline">{user.name}</span>
                      {user.role==='ADMIN' && <span className="badge rounded-pill ms-1" style={{background:'#b91c1c',fontSize:'0.65rem'}}>ADMIN</span>}
                    </a>
                    <ul className="dropdown-menu dropdown-menu-end shadow border-0 rounded-3">
                      <li><span className="dropdown-item-text text-muted small"><i className="bi bi-shield-check me-1"></i>{user.role}</span></li>
                      <li><hr className="dropdown-divider my-1"/></li>
                      <li><Link className="dropdown-item" to="/profile"><i className="bi bi-person me-2"></i>My Profile</Link></li>
                      <li><Link className="dropdown-item" to="/change-password"><i className="bi bi-shield-lock me-2"></i>Change Password</Link></li>
                      {user.role==='SEEKER' && (
                        <li><Link className="dropdown-item" to="/seeker/saved-jobs"><i className="bi bi-bookmark me-2"></i>Saved Jobs</Link></li>
                      )}
                      <li><hr className="dropdown-divider my-1"/></li>
                      {/* Dark mode toggle in dropdown too */}
                      <li>
                        <button className="dropdown-item d-flex align-items-center gap-2" onClick={toggleTheme}>
                          <span className="d-inline-flex align-items-center justify-content-center"
                            style={{
                              width: 22, height: 22, borderRadius: '50%',
                              background: dark
                                ? 'linear-gradient(145deg, #FFD166 0%, #FB923C 100%)'
                                : 'linear-gradient(145deg, #6D28D9 0%, #4C1D95 100%)',
                              color: '#fff', fontSize: '0.7rem', flexShrink: 0
                            }}>
                            <i className={`bi ${dark ? 'bi-sun-fill' : 'bi-moon-stars-fill'}`}></i>
                          </span>
                          {dark ? 'Light Mode' : 'Dark Mode'}
                        </button>
                      </li>
                      <li><hr className="dropdown-divider my-1"/></li>
                      <li><button className="dropdown-item text-danger" onClick={handleLogout}><i className="bi bi-box-arrow-right me-2"></i>Logout</button></li>
                    </ul>
                  </li>
                </>
              )}
            </ul>
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Nav */}
      <div className="mobile-bottom-nav">
        {mobileNav().map((item,i)=>(
          <Link key={i} to={item.to} className={location.pathname===item.to?'active':''}>
            <i className={`bi ${item.icon}`}></i>
            {item.label}
          </Link>
        ))}
      </div>
    </>
  )
}