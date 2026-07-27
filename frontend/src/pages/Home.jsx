import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getStats } from '../services/api'

export default function Home() {
  // Live platform counts for the hero — falls back to null until loaded.
  const [stats, setStats] = useState(null)
  useEffect(() => {
    getStats().then(({ data }) => setStats(data)).catch(() => {})
  }, [])

  // Formats a count with a trailing "+" once it's loaded; shows a neutral
  // placeholder while loading so the layout doesn't jump.
  const fmt = (n) => (n === undefined || n === null) ? '—' : `${n}+`

  const phrases = [
    'Find Your Dream Remote Job',
    'Get Matched by Your Skills',
    'Land Your Perfect Career',
    'Build Your Future Today',
  ]
  const [phraseIdx, setPhraseIdx] = React.useState(0)
  const [displayed, setDisplayed] = React.useState('')
  const [deleting, setDeleting] = React.useState(false)
  const [charIdx, setCharIdx] = React.useState(0)

  React.useEffect(() => {
    const current = phrases[phraseIdx]
    let timeout

    if (!deleting && charIdx < current.length) {
      timeout = setTimeout(() => {
        setDisplayed(current.slice(0, charIdx + 1))
        setCharIdx(c => c + 1)
      }, 55)
    } else if (!deleting && charIdx === current.length) {
      timeout = setTimeout(() => setDeleting(true), 2000)
    } else if (deleting && charIdx > 0) {
      timeout = setTimeout(() => {
        setDisplayed(current.slice(0, charIdx - 1))
        setCharIdx(c => c - 1)
      }, 28)
    } else if (deleting && charIdx === 0) {
      setDeleting(false)
      setPhraseIdx(i => (i + 1) % phrases.length)
    }

    return () => clearTimeout(timeout)
  }, [charIdx, deleting, phraseIdx])

  return (
    <div>
      {/* Hero */}
      <div style={{
        background:'linear-gradient(135deg, #123160 0%, #0A2347 100%)',
        position:'relative', overflow:'hidden'
      }}>
        <div className="container py-5 text-center text-white" style={{position:'relative'}}>
          {/* Trust pill badge */}
          <div className="d-inline-flex align-items-center gap-2 px-3 py-1 rounded-pill mb-3"
            style={{background:'rgba(255,255,255,0.12)', border:'1px solid rgba(255,255,255,0.3)', fontSize:'0.8rem'}}>
            <span style={{width:6,height:6,borderRadius:'50%',background:'#4ade80',display:'inline-block'}}></span>
            {stats ? `${stats.seekers}+ Active Seekers` : 'Active Seekers'} · Skill-Verified Job Matching
          </div>
          <div className="d-flex align-items-center justify-content-center gap-3 mb-3">
            <img src="/logo.svg" alt="SkillBridge" width={52} height={52} style={{borderRadius:12}} onError={e=>e.target.style.display='none'}/>
            <h1 className="heading-serif fw-bold mb-0">SkillBridge</h1>
          </div>
          <p className="mb-2 fs-4 opacity-90" style={{minHeight:'2.2rem', fontWeight:600}}>
            {displayed}<span style={{
              display:'inline-block', width:2, height:'1.1em',
              background:'#fff', marginLeft:2, verticalAlign:'middle',
              animation:'cursorBlink 0.8s step-end infinite'
            }}></span>
          </p>
          <p className="mb-4 opacity-75 small">Find jobs that match your skills. Employers find real talent.</p>
          <div className="d-flex justify-content-center gap-3 flex-wrap">
            <Link to="/jobs" className="btn btn-hero-primary fw-bold px-4 rounded-pill">
              <i className="bi bi-search me-2"></i>Browse Jobs
            </Link>
            <Link to="/register" className="btn btn-hero-ghost fw-bold px-4 rounded-pill">
              <i className="bi bi-person-plus me-2"></i>Get Started Free
            </Link>
          </div>
          {/* Trust badges — real counts from the database */}
          <div className="d-flex justify-content-center gap-4 mt-4 flex-wrap">
            {[
              { value: fmt(stats?.jobs),           label: 'Remote Jobs' },
              { value: fmt(stats?.seekers),        label: 'Seekers' },
              { value: fmt(stats?.employers),      label: 'Employers' },
              { value: fmt(stats?.verifiedSkills), label: 'Verified Skills' },
            ].map((s, i) => (
              <div key={i} className="text-white-50 small">
                <span className="fw-bold text-white">{s.value} </span>
                {s.label}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="container py-5">
        {/* Features */}
        <h4 className="fw-bold text-center mb-2">Why SkillBridge?</h4>
        <p className="text-muted text-center mb-4 small">Everything you need to land your remote job</p>
        <div className="row g-3 mb-5">
          {[
            {icon:'bi-patch-check-fill', color:'#057642', title:'Verified Skill Tagging', desc:'Admin-verified skill badges. Not just self-declared. Employers see real talent.'},
            {icon:'bi-bar-chart-fill', color:'#123160', title:'Skill Match Score', desc:'Auto-calculates your % match with every job. Know before you apply.'},
            {icon:'bi-kanban-fill', color:'#d97706', title:'Application Pipeline', desc:'Applied → Shortlisted → Interview → Offer. Track every stage.'},
            {icon:'bi-calendar-check-fill', color:'#123160', title:'Interview Scheduler', desc:'Employers schedule Video/Phone/In-Person. You get notified instantly.'},
            {icon:'bi-envelope-fill', color:'#7C3AED', title:'Auto Email Notifications', desc:'Get emails for shortlist, interview, offer. No manual messages needed.'},
            {icon:'bi-currency-rupee', color:'#dc3545', title:'Salary Range Filter', desc:'Filter by exact salary. No wasted time on wrong budgets.'},
          ].map((f,i)=>(
            <div key={i} className="col-12 col-sm-6 col-md-4">
              <div className="card h-100 border-0 shadow-sm rounded-4 p-2">
                <div className="card-body">
                  <div className="d-flex align-items-center gap-3 mb-2">
                    <div className="rounded-3 d-flex align-items-center justify-content-center"
                      style={{width:44,height:44,background:f.color+'18',flexShrink:0}}>
                      <i className={`bi ${f.icon}`} style={{color:f.color,fontSize:'1.3rem'}}></i>
                    </div>
                    <h6 className="fw-bold mb-0">{f.title}</h6>
                  </div>
                  <p className="text-muted small mb-0">{f.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* How it works */}
        <div className="text-center mb-4">
          <h4 className="fw-bold mb-2">How It Works</h4>
          <p className="text-muted small">Simple 4-step process to get hired</p>
        </div>
        <div className="row g-3 mb-5">
          {[
            {step:'01', icon:'bi-person-plus', color:'#123160', title:'Create Account', desc:'Register as Job Seeker or Employer. Free forever.'},
            {step:'02', icon:'bi-tools', color:'#057642', title:'Add Your Skills', desc:'Add skills to your profile. Admin verifies them for credibility.'},
            {step:'03', icon:'bi-search', color:'#d97706', title:'Browse & Apply', desc:'Find jobs matched to your skills. See % match before applying.'},
            {step:'04', icon:'bi-trophy', color:'#7C3AED', title:'Get Hired', desc:'Track applications. Get interview. Accept offer. Done!'},
          ].map((s,i)=>(
            <div key={i} className="col-6 col-md-3">
              <div className="text-center p-3">
                <div className="rounded-circle d-inline-flex align-items-center justify-content-center mb-3"
                  style={{width:56,height:56,background:s.color+'18'}}>
                  <i className={`bi ${s.icon}`} style={{color:s.color,fontSize:'1.5rem'}}></i>
                </div>
                <div className="fw-bold mb-1" style={{fontSize:'0.85rem',color:s.color}}>STEP {s.step}</div>
                <div className="fw-bold mb-1">{s.title}</div>
                <div className="text-muted" style={{fontSize:'0.8rem'}}>{s.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center p-5 rounded-4" style={{background:'linear-gradient(135deg,#123160,#0A2347)'}}>
          <h4 className="fw-bold text-white mb-2">Ready to find your remote job?</h4>
          <p className="text-white opacity-75 mb-4 small">Join thousands of professionals on SkillBridge</p>
          <div className="d-flex justify-content-center gap-3 flex-wrap">
            <Link to="/register" className="btn btn-hero-primary fw-bold px-4 rounded-pill">
              <i className="bi bi-person-plus me-2"></i>Join as Job Seeker
            </Link>
            <Link to="/register" className="btn btn-hero-ghost fw-bold px-4 rounded-pill">
              <i className="bi bi-building me-2"></i>Hire Talent
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}