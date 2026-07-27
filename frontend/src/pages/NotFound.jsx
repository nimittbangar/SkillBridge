import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function NotFound() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const home = user?.role === 'EMPLOYER' ? '/employer/dashboard'
             : user?.role === 'ADMIN' ? '/admin/dashboard'
             : user?.role === 'SEEKER' ? '/seeker/dashboard' : '/'

  return (
    <div className="container py-5 text-center">
      <div style={{ maxWidth:480, margin:'0 auto' }}>
        <div style={{ fontSize:80, marginBottom:16 }}>🔍</div>
        <h1 className="fw-bold mb-2" style={{ fontSize:'var(--fs-display)', color:'#123160' }}>404</h1>
        <h4 className="fw-bold mb-3">Page Not Found</h4>
        <p className="text-muted mb-4">
          Oops! The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="d-flex gap-3 justify-content-center flex-wrap">
          <button className="btn text-white fw-bold rounded-pill px-4"
            style={{ background:'#123160' }} onClick={() => navigate(-1)}>
            <i className="bi bi-arrow-left me-2"></i>Go Back
          </button>
          <Link to={home} className="btn btn-outline-primary fw-bold rounded-pill px-4"
            style={{ color:'#123160', borderColor:'#123160' }}>
            <i className="bi bi-house me-2"></i>Go Home
          </Link>
          <Link to="/jobs" className="btn btn-outline-secondary fw-bold rounded-pill px-4">
            <i className="bi bi-briefcase me-2"></i>Browse Jobs
          </Link>
        </div>
      </div>
    </div>
  )
}