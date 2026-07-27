import React, { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { getAllUsers, getAllApplications, getAllInterviews, getAllJobs } from '../../services/api'

const sidebarItems = [
  {to:'/admin/dashboard',icon:'bi-speedometer2',label:'Dashboard'},
  {to:'/admin/users',icon:'bi-people',label:'Manage Users'},
  {to:'/admin/skills',icon:'bi-patch-check',label:'Verify Skills'},
  {to:'/admin/jobs',icon:'bi-briefcase',label:'Manage Jobs'},
  {to:'/admin/applications',icon:'bi-file-text',label:'All Applications'},
  {to:'/admin/analytics',icon:'bi-graph-up',label:'Analytics'},
]

export default function AdminDashboard() {
  const [stats, setStats] = useState({users:0,jobs:0,applications:0,interviews:0,offers:0,accepted:0,seekers:0,employers:0})
  const [pipeline, setPipeline] = useState({})
  const [signupTrend, setSignupTrend] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([getAllUsers(),getAllApplications(),getAllInterviews(),getAllJobs()])
      .then(([u,a,i,j])=>{
        setStats({
          users: u.data.length,
          seekers: u.data.filter(x=>x.role==='SEEKER').length,
          employers: u.data.filter(x=>x.role==='EMPLOYER').length,
          jobs: j.data.length,
          applications: a.data.length,
          interviews: i.data.length,
          applied: a.data.filter(x=>x.status==='APPLIED').length,
          shortlisted: a.data.filter(x=>x.status==='SHORTLISTED').length,
          offers: a.data.filter(x=>x.status==='OFFERED').length,
          accepted: a.data.filter(x=>x.status==='ACCEPTED').length,
          rejected: a.data.filter(x=>x.status==='REJECTED').length,
        })

        // ─── Application pipeline funnel ───
        setPipeline({
          APPLIED: a.data.filter(x=>x.status==='APPLIED').length,
          SHORTLISTED: a.data.filter(x=>x.status==='SHORTLISTED').length,
          INTERVIEW_SCHEDULED: a.data.filter(x=>x.status==='INTERVIEW_SCHEDULED').length,
          OFFERED: a.data.filter(x=>x.status==='OFFERED').length,
          ACCEPTED: a.data.filter(x=>x.status==='ACCEPTED').length,
          REJECTED: a.data.filter(x=>x.status==='REJECTED').length,
        })

        // ─── Signups over the last 7 days ───
        const days = []
        for (let d = 6; d >= 0; d--) {
          const date = new Date()
          date.setDate(date.getDate() - d)
          const key = date.toISOString().slice(0, 10)
          const label = date.toLocaleDateString('en-US', { weekday: 'short' })
          const count = u.data.filter(x => x.createdAt && x.createdAt.slice(0, 10) === key).length
          days.push({ label, count })
        }
        setSignupTrend(days)

        setLoading(false)
      }).catch(()=>setLoading(false))
  }, [])

  useEffect(() => { load(); const t=setInterval(load,30000); return ()=>clearInterval(t) }, [load])

  return (
    <div className="container-fluid p-0">
      <div className="d-flex">
        <div className="sidebar d-none d-md-block">
          <p className="text-muted small fw-bold text-uppercase px-2 mb-2" style={{fontSize:'0.7rem',letterSpacing:'0.8px'}}>Admin Panel</p>
          <nav className="nav flex-column">
            {sidebarItems.map((item,i)=>(
              <Link key={i} to={item.to} className="nav-link"><i className={`bi ${item.icon}`}></i>{item.label}</Link>
            ))}
          </nav>
        </div>

        <div className="flex-fill main-content p-3">
          <div className="welcome-header">
            <div className="d-flex justify-content-between align-items-start flex-wrap gap-2">
              <div>
                <h1 className="fw-bold mb-1">Admin Dashboard</h1>
                <p className="mb-0">Full platform overview and control</p>
              </div>
              <button className="btn btn-sm btn-outline-light rounded-pill" onClick={load}>
                <i className="bi bi-arrow-clockwise me-1"></i>Refresh
              </button>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-5"><div className="spinner-border" style={{color:'#123160'}}></div></div>
          ) : (
            <>
              {/* Main Stats */}
              <div className="row g-3 mb-4">
                {[
                  {label:'Total Users',    value:stats.users,        color:'#123160', icon:'bi-people-fill'},
                  {label:'Job Seekers',    value:stats.seekers,      color:'#123160', icon:'bi-person-fill'},
                  {label:'Employers',      value:stats.employers,    color:'#d97706', icon:'bi-building-fill'},
                  {label:'Active Jobs',    value:stats.jobs,         color:'#057642', icon:'bi-briefcase-fill'},
                  {label:'Applications',   value:stats.applications, color:'#7C3AED', icon:'bi-file-text-fill'},
                  {label:'Interviews',     value:stats.interviews,   color:'#123160', icon:'bi-camera-video-fill'},
                  {label:'Pending Offers', value:stats.offers,       color:'#d97706', icon:'bi-trophy-fill'},
                  {label:'Hired',          value:stats.accepted,     color:'#057642', icon:'bi-check-circle-fill'},
                ].map((s,i)=>(
                  <div key={i} className="col-6 col-md-3">
                    <div className="stat-card h-100">
                      <i className={`bi ${s.icon} fs-3 mb-2 d-block`} style={{color:s.color}}></i>
                      <div className="number" style={{color:s.color,fontSize:'1.6rem'}}>{s.value}</div>
                      <div className="label">{s.label}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* ─── Charts ─── */}
              <div className="row g-3 mb-4">
                {/* Application Pipeline Funnel */}
                <div className="col-12 col-lg-7">
                  <div className="card border-0 shadow-sm rounded-4 h-100">
                    <div className="card-body p-4">
                      <h6 className="fw-bold mb-3"><i className="bi bi-funnel-fill me-2" style={{color:'#123160'}}></i>Application Pipeline</h6>
                      {(() => {
                        const stages = [
                          { key:'APPLIED', label:'Applied', color:'#123160' },
                          { key:'SHORTLISTED', label:'Shortlisted', color:'#123160' },
                          { key:'INTERVIEW_SCHEDULED', label:'Interview', color:'#d97706' },
                          { key:'OFFERED', label:'Offered', color:'#7C3AED' },
                          { key:'ACCEPTED', label:'Accepted', color:'#057642' },
                          { key:'REJECTED', label:'Rejected', color:'#dc3545' },
                        ]
                        const max = Math.max(1, ...stages.map(s => pipeline[s.key] || 0))
                        return stages.map(s => {
                          const value = pipeline[s.key] || 0
                          const widthPct = (value / max) * 100
                          return (
                            <div key={s.key} className="mb-2">
                              <div className="d-flex justify-content-between" style={{fontSize:'0.8rem'}}>
                                <span className="fw-semibold">{s.label}</span>
                                <span className="text-muted">{value}</span>
                              </div>
                              <div style={{background:'#EEF3F8', borderRadius:6, height:10, overflow:'hidden'}}>
                                <div style={{
                                  width:`${widthPct}%`, height:'100%', background:s.color,
                                  borderRadius:6, transition:'width 0.4s ease'
                                }}></div>
                              </div>
                            </div>
                          )
                        })
                      })()}
                    </div>
                  </div>
                </div>

                {/* Signups - Last 7 Days */}
                <div className="col-12 col-lg-5">
                  <div className="card border-0 shadow-sm rounded-4 h-100">
                    <div className="card-body p-4">
                      <h6 className="fw-bold mb-3"><i className="bi bi-graph-up me-2" style={{color:'#057642'}}></i>Signups — Last 7 Days</h6>
                      <div className="d-flex align-items-end gap-2" style={{height:120}}>
                        {(() => {
                          const max = Math.max(1, ...signupTrend.map(d => d.count))
                          return signupTrend.map((d, i) => (
                            <div key={i} className="flex-fill d-flex flex-column align-items-center justify-content-end h-100">
                              <span className="small text-muted mb-1">{d.count}</span>
                              <div style={{
                                width:'70%', minHeight: d.count > 0 ? 4 : 1,
                                height:`${(d.count / max) * 80}px`,
                                background: d.count > 0 ? '#123160' : '#EEF3F8',
                                borderRadius:'4px 4px 0 0', transition:'height 0.4s ease'
                              }}></div>
                              <span className="small text-muted mt-1" style={{fontSize:'0.7rem'}}>{d.label}</span>
                            </div>
                          ))
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Access Cards */}
              <div className="row g-3">
                {[
                  {title:'Manage Users',      desc:'View, search and delete all user accounts', icon:'bi-people-fill',      color:'#123160', link:'/admin/users'},
                  {title:'Verify Skills',     desc:'Approve skill badges for job seekers',       icon:'bi-patch-check-fill', color:'#057642', link:'/admin/skills'},
                  {title:'Manage Jobs',       desc:'View and delete all job postings',           icon:'bi-briefcase-fill',   color:'#d97706', link:'/admin/jobs'},
                  {title:'All Applications',  desc:'Monitor all applications and pipeline',       icon:'bi-file-text-fill',   color:'#7C3AED', link:'/admin/applications'},
                ].map((card,i)=>(
                  <div key={i} className="col-12 col-sm-6 col-lg-3">
                    <Link to={card.link} className="text-decoration-none">
                      <div className="card border-0 shadow-sm rounded-4 h-100 text-center p-3"
                        style={{transition:'transform 0.15s',cursor:'pointer'}}
                        onMouseOver={e=>e.currentTarget.style.transform='translateY(-3px)'}
                        onMouseOut={e=>e.currentTarget.style.transform='translateY(0)'}>
                        <i className={`bi ${card.icon} fs-2 mb-3 d-block`} style={{color:card.color}}></i>
                        <h6 className="fw-bold">{card.title}</h6>
                        <p className="text-muted small mb-0">{card.desc}</p>
                      </div>
                    </Link>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}