import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getAnalytics } from '../../services/api'

const menu = [
  {to:'/admin/dashboard',icon:'bi-speedometer2',label:'Dashboard'},
  {to:'/admin/users',icon:'bi-people',label:'Manage Users'},
  {to:'/admin/skills',icon:'bi-patch-check',label:'Verify Skills'},
  {to:'/admin/jobs',icon:'bi-briefcase',label:'Manage Jobs'},
  {to:'/admin/applications',icon:'bi-file-earmark-text',label:'All Applications'},
  {to:'/admin/analytics',icon:'bi-graph-up',label:'Analytics'},
]

const STATUS_COLORS = {
  APPLIED:'#6c757d', SHORTLISTED:'#0ea5e9', INTERVIEW_SCHEDULED:'#0F766E',
  OFFERED:'#057642', ACCEPTED:'#123160', REJECTED:'#dc3545',
  OPEN:'#057642', PAUSED:'#f59e0b', CLOSED:'#dc3545',
}

export default function AdminAnalytics() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    getAnalytics()
      .then(({ data }) => { setData(data); setLoading(false) })
      .catch(() => { setError('Failed to load analytics'); setLoading(false) })
  }, [])

  return (
    <div className="container-fluid p-0"><div className="d-flex">
      <div className="sidebar d-none d-md-block">
        <div className="p-3">
          <h6 className="text-white-50 text-uppercase small fw-bold mb-3 px-2">Admin Panel</h6>
          {menu.map((item,i)=>(
            <Link key={i} to={item.to} className={`nav-link ${item.to==='/admin/analytics'?'active':''}`}>
              <i className={`bi ${item.icon}`}></i>{item.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="flex-fill main-content p-3">
        <div className="page-header mb-4">
          <h1 className="fw-bold mb-1"><i className="bi bi-graph-up me-2"></i>Analytics</h1>
          <p className="mb-0 text-muted">Platform activity and trends</p>
        </div>

        {loading && <div className="text-center py-5"><div className="spinner-border" style={{color:'#123160'}}></div></div>}
        {error && <div className="alert alert-danger">{error}</div>}

        {data && (
          <>
            {/* Summary cards */}
            <div className="row g-3 mb-4">
              {[
                {label:'Seekers', value:data.summary.seekers, icon:'bi-person', color:'#123160'},
                {label:'Employers', value:data.summary.employers, icon:'bi-building', color:'#FB923C'},
                {label:'Total Jobs', value:data.summary.jobs, icon:'bi-briefcase', color:'#057642'},
                {label:'Applications', value:data.summary.applications, icon:'bi-file-text', color:'#0ea5e9'},
              ].map((s,i)=>(
                <div key={i} className="col-6 col-lg-3">
                  <div className="card border-0 shadow-sm rounded-4 h-100">
                    <div className="card-body p-3 d-flex align-items-center gap-3">
                      <div className="rounded-3 d-flex align-items-center justify-content-center"
                        style={{width:44,height:44,background:`${s.color}18`,color:s.color,fontSize:'1.2rem'}}>
                        <i className={`bi ${s.icon}`}></i>
                      </div>
                      <div>
                        <div className="h4 fw-bold mb-0">{s.value}</div>
                        <div className="small text-muted">{s.label}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="row g-3">
              {/* Applications over time — line chart */}
              <div className="col-lg-7">
                <div className="card border-0 shadow-sm rounded-4 h-100">
                  <div className="card-body p-4">
                    <h6 className="fw-bold mb-3">Applications — last 14 days</h6>
                    <LineChart series={data.applicationsByDay} />
                  </div>
                </div>
              </div>

              {/* Applications by status — horizontal bars */}
              <div className="col-lg-5">
                <div className="card border-0 shadow-sm rounded-4 h-100">
                  <div className="card-body p-4">
                    <h6 className="fw-bold mb-3">Applications by stage</h6>
                    <BarList data={data.applicationsByStatus} />
                  </div>
                </div>
              </div>

              {/* Top skills */}
              <div className="col-lg-7">
                <div className="card border-0 shadow-sm rounded-4 h-100">
                  <div className="card-body p-4">
                    <h6 className="fw-bold mb-3">Most in-demand skills</h6>
                    {data.topSkills.length === 0
                      ? <p className="text-muted small mb-0">No skills data yet.</p>
                      : <BarList data={Object.fromEntries(data.topSkills.map(s=>[s.skill,s.count]))} accent="#123160" />}
                  </div>
                </div>
              </div>

              {/* Jobs by status */}
              <div className="col-lg-5">
                <div className="card border-0 shadow-sm rounded-4 h-100">
                  <div className="card-body p-4">
                    <h6 className="fw-bold mb-3">Jobs by status</h6>
                    <BarList data={data.jobsByStatus} />
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div></div>
  )
}

/* ── Pure-SVG line chart (no dependency) ── */
function LineChart({ series }) {
  const entries = Object.entries(series || {})
  if (entries.length === 0) return <p className="text-muted small">No data.</p>
  const values = entries.map(([,v])=>v)
  const max = Math.max(...values, 1)
  const W = 560, H = 180, pad = 24
  const stepX = (W - pad*2) / Math.max(entries.length - 1, 1)
  const points = entries.map(([,v],i)=>{
    const x = pad + i*stepX
    const y = H - pad - (v/max)*(H - pad*2)
    return [x,y]
  })
  const path = points.map((p,i)=>`${i===0?'M':'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
  const area = `${path} L${points[points.length-1][0].toFixed(1)},${H-pad} L${pad},${H-pad} Z`
  return (
    <div style={{overflowX:'auto'}}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%',minWidth:480,height:'auto'}} role="img" aria-label="Applications per day over the last 14 days">
        <path d={area} fill="#12316015" />
        <path d={path} fill="none" stroke="#123160" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p,i)=>(<circle key={i} cx={p[0]} cy={p[1]} r="3" fill="#123160" />))}
        {entries.map(([label],i)=> i % 2 === 0 ? (
          <text key={i} x={pad+i*stepX} y={H-6} fontSize="9" fill="#94a3b8" textAnchor="middle">{label}</text>
        ) : null)}
      </svg>
    </div>
  )
}

/* ── Horizontal bar list (no dependency) ── */
function BarList({ data, accent }) {
  const entries = Object.entries(data || {}).filter(([,v])=>v>0 || true)
  const max = Math.max(...entries.map(([,v])=>v), 1)
  return (
    <div className="d-flex flex-column gap-2">
      {entries.map(([label,value])=>(
        <div key={label}>
          <div className="d-flex justify-content-between small mb-1">
            <span className="text-muted">{label.replace(/_/g,' ')}</span>
            <span className="fw-bold">{value}</span>
          </div>
          <div className="progress rounded-pill" style={{height:8,background:'#eef1f5'}}>
            <div className="progress-bar rounded-pill" role="progressbar"
              style={{width:`${(value/max)*100}%`,background:accent||STATUS_COLORS[label]||'#123160'}}></div>
          </div>
        </div>
      ))}
    </div>
  )
}