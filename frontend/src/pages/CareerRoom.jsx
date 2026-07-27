import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getProfile, getMyApplications, searchJobs } from '../services/api'

const SKILL_COLORS = ['#123160','#057642','#d97706','#7C3AED','#123160','#dc3545','#22c55e','#ec4899']
const ROADMAP_SKILLS = ['Docker','Kubernetes','GraphQL','Redis','Kafka','System Design']

function AnimatedNumber({ target, duration = 1200 }) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (!target) return
    let n = 0
    const step = Math.ceil(target / (duration / 16))
    const t = setInterval(() => {
      n = Math.min(n + step, target)
      setVal(n)
      if (n >= target) clearInterval(t)
    }, 16)
    return () => clearInterval(t)
  }, [target])
  return <>{val}</>
}

function ScoreRing({ score = 0, size = 140 }) {
  const r = 52
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  const color = score >= 70 ? '#22c55e' : score >= 40 ? '#d97706' : '#dc3545'
  return (
    <div style={{ position:'relative', width:size, height:size, flexShrink:0 }}>
      <svg width={size} height={size} viewBox="0 0 140 140" style={{ transform:'rotate(-90deg)' }}>
        <circle cx="70" cy="70" r={r} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="12"/>
        <circle cx="70" cy="70" r={r} fill="none" stroke={color} strokeWidth="12"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition:'stroke-dashoffset 1.5s cubic-bezier(0.4,0,0.2,1)' }}/>
      </svg>
      <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
        <span style={{ fontSize:32, fontWeight:700, color:'#fff', lineHeight:1 }}>
          <AnimatedNumber target={score} />
        </span>
        <span style={{ fontSize:11, color:'rgba(255,255,255,0.7)' }}>Match</span>
      </div>
    </div>
  )
}

function BarRow({ name, pct, color, verified }) {
  const [width, setWidth] = useState(0)
  useEffect(() => { const t = setTimeout(() => setWidth(pct), 300); return () => clearTimeout(t) }, [pct])
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:9 }}>
      <div style={{ fontSize:12, width:100, flexShrink:0, display:'flex', alignItems:'center', gap:4 }}>
        {name}
        {verified && <i className="bi bi-patch-check-fill" style={{ color:'#057642', fontSize:10 }}></i>}
      </div>
      <div style={{ flex:1, height:8, background:'var(--bs-secondary-bg)', borderRadius:4, overflow:'hidden' }}>
        <div style={{ height:'100%', width:`${width}%`, background:color, borderRadius:4, transition:'width 1.3s cubic-bezier(0.4,0,0.2,1)' }}/>
      </div>
      <div style={{ fontSize:11, fontWeight:600, color, width:34, textAlign:'right' }}>{pct}%</div>
    </div>
  )
}

export default function CareerRoom() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [applications, setApplications] = useState([])
  const [matchedJobs, setMatchedJobs] = useState([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    try {
      const [profRes, appRes] = await Promise.all([
        getProfile(),
        getMyApplications().catch(() => ({ data: [] })),
      ])
      setProfile(profRes.data)
      const apps = appRes.data || []
      setApplications(apps)

      // fetch matched jobs using user's skills
      const skills = profRes.data?.skillsList ||
        profRes.data?.skills?.split(',').filter(Boolean) || []
      if (skills.length > 0) {
        const jobRes = await searchJobs({ keyword: skills.slice(0, 3).join(' ') })
          .catch(() => ({ data: [] }))
        setMatchedJobs((jobRes.data || []).slice(0, 4))
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // Auto refresh every 30 seconds
    const interval = setInterval(load, 30000)
    return () => clearInterval(interval)
  }, [])

  // ── Compute real stats from actual data ──
  const userSkills = profile?.skillsList || profile?.skills?.split(',').filter(Boolean) || []
  const verifiedSkills = profile?.verifiedSkillsList || profile?.verifiedSkills?.split(',').filter(Boolean) || []
  const totalSkills = userSkills.length
  const verifiedCount = verifiedSkills.length
  const matchScore = Math.min(95, Math.round(
    (verifiedCount * 18) + (totalSkills * 6) +
    (profile?.resumeUrl ? 15 : 0) +
    (profile?.bio ? 10 : 0) +
    (applications.length * 3)
  ))
  const resumeStrength = Math.min(98, Math.round(
    (profile?.resumeUrl ? 40 : 0) +
    (totalSkills * 5) +
    (profile?.bio ? 15 : 0) +
    (profile?.phone ? 10 : 0) +
    (profile?.location ? 10 : 0) +
    (applications.length * 2)
  ))
  const profileComplete = Math.min(100, Math.round(
    (profile?.name ? 20 : 0) +
    (profile?.email ? 15 : 0) +
    (profile?.phone ? 10 : 0) +
    (profile?.location ? 10 : 0) +
    (profile?.bio ? 15 : 0) +
    (profile?.resumeUrl ? 20 : 0) +
    (totalSkills > 0 ? 10 : 0)
  ))
  const appReadiness = Math.min(100, Math.round(
    (profile?.resumeUrl ? 40 : 0) +
    (totalSkills > 3 ? 30 : totalSkills * 8) +
    (profile?.bio ? 20 : 0) +
    (profile?.phone ? 10 : 0)
  ))

  const counts = {
    applied:     applications.filter(a => a.status === 'APPLIED').length,
    shortlisted: applications.filter(a => a.status === 'SHORTLISTED').length,
    interviews:  applications.filter(a => a.status === 'INTERVIEW_SCHEDULED').length,
    offered:     applications.filter(a => a.status === 'OFFERED').length,
    accepted:    applications.filter(a => a.status === 'ACCEPTED').length,
    rejected:    applications.filter(a => a.status === 'REJECTED').length,
  }

  // Build skill bars from real profile skills
  const skillBars = userSkills.slice(0, 6).map((s, i) => ({
    name: s,
    pct: verifiedSkills.includes(s)
      ? 75 + Math.round(Math.random() * 20)
      : 40 + Math.round(Math.random() * 35),
    color: SKILL_COLORS[i % SKILL_COLORS.length],
    verified: verifiedSkills.includes(s),
  }))

  // Missing skills = roadmap skills not in user's list
  const missingSkills = ROADMAP_SKILLS.filter(s =>
    !userSkills.some(u => u.toLowerCase().includes(s.toLowerCase()))
  )

  const checklist = [
    { label:'Resume uploaded',    done: !!profile?.resumeUrl },
    { label:'Profile complete',   done: profileComplete >= 80 },
    { label:'Skills added',       done: totalSkills >= 3 },
    { label:'Skills verified',    done: verifiedCount > 0 },
    { label:'Bio/About written',  done: !!profile?.bio },
    { label:'Phone number added', done: !!profile?.phone },
  ]

  if (loading) return (
    <div className="d-flex justify-content-center align-items-center" style={{ minHeight:'60vh' }}>
      <div className="spinner-border" style={{ color:'#123160' }}></div>
    </div>
  )

  return (
    <div className="container py-4" style={{ maxWidth:960 }}>

      {/* ── HERO ── */}
      <div className="rounded-4 p-4 mb-4" style={{ background:'#123160' }}>
        <div className="d-flex align-items-center gap-4 flex-wrap">
          <ScoreRing score={matchScore} />
          <div style={{ flex:1, minWidth:200 }}>
            <div style={{ color:'rgba(255,255,255,0.65)', fontSize:11, textTransform:'uppercase', letterSpacing:1, marginBottom:4 }}>
              Career Match Room
            </div>
            <div style={{ color:'#fff', fontSize:22, fontWeight:700, marginBottom:2 }}>
              {user?.name || profile?.name || 'Your Profile'}
            </div>
            <div style={{ color:'rgba(255,255,255,0.75)', fontSize:13, marginBottom:12 }}>
              {profile?.location || 'Add your location'} · {totalSkills} skills · {applications.length} applications
            </div>
            <div className="d-flex gap-2 flex-wrap">
              <span className="badge rounded-pill px-3 py-2" style={{ background:'rgba(34,197,94,0.2)', color:'#86efac', border:'1px solid rgba(34,197,94,0.3)' }}>
                {matchScore >= 70 ? 'Strong Match' : matchScore >= 40 ? 'Good Match' : 'Build Profile'}
              </span>
              <span className="badge rounded-pill px-3 py-2" style={{ background:'rgba(255,255,255,0.15)', color:'#fff' }}>
                {missingSkills.length} skills to learn
              </span>
              <span className="badge rounded-pill px-3 py-2" style={{ background:'rgba(255,255,255,0.15)', color:'#fff' }}>
                {matchedJobs.length} jobs matched
              </span>
            </div>
          </div>
          {/* Mini score cards */}
          <div className="d-grid gap-2" style={{ gridTemplateColumns:'1fr 1fr', display:'grid' }}>
            {[
              ['Resume', resumeStrength, '#123160'],
              ['Profile', profileComplete, '#22c55e'],
              ['Skills', Math.min(100, totalSkills * 12), '#f59e0b'],
              ['Readiness', appReadiness, '#a855f7'],
            ].map(([l, v, c]) => (
              <div key={l} style={{ background:'rgba(255,255,255,0.12)', borderRadius:10, padding:'10px 14px', textAlign:'center', minWidth:88 }}>
                <div style={{ color:'#fff', fontSize:18, fontWeight:700 }}>{v}%</div>
                <div style={{ color:'rgba(255,255,255,0.65)', fontSize:10 }}>{l}</div>
                <div style={{ height:3, background:'rgba(255,255,255,0.15)', borderRadius:2, marginTop:6 }}>
                  <div style={{ height:'100%', width:`${v}%`, background:c, borderRadius:2 }}/>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── STATS ROW ── */}
      <div className="row g-3 mb-4">
        {[
          { icon:'bi-send', val:counts.applied, label:'Applied', color:'#123160', bg:'#EEF3F8' },
          { icon:'bi-star-fill', val:counts.shortlisted, label:'Shortlisted', color:'#057642', bg:'#D1FAE5' },
          { icon:'bi-camera-video', val:counts.interviews, label:'Interviews', color:'#d97706', bg:'#FEF3C7' },
          { icon:'bi-trophy-fill', val:counts.offered + counts.accepted, label:'Offers', color:'#7C3AED', bg:'#EDE9FF' },
        ].map((s, i) => (
          <div key={i} className="col-6 col-md-3">
            <div className="card border-0 shadow-sm rounded-4 text-center p-3 h-100">
              <div style={{ width:44, height:44, borderRadius:12, background:s.bg, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 10px' }}>
                <i className={`bi ${s.icon}`} style={{ color:s.color, fontSize:20 }}></i>
              </div>
              <div style={{ fontSize:26, fontWeight:700, color:s.color }}>
                <AnimatedNumber target={s.val} />
              </div>
              <div className="text-muted" style={{ fontSize:11 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── SKILLS + GAPS ── */}
      <div className="row g-3 mb-4">
        <div className="col-lg-6">
          <div className="card border-0 shadow-sm rounded-4 p-4 h-100">
            <div className="fw-bold mb-3" style={{ fontSize:13 }}>
              <i className="bi bi-bar-chart-fill me-2" style={{ color:'#123160' }}></i>
              Your Skills
              <span className="badge ms-2 rounded-pill" style={{ background:'#EEF3F8', color:'#123160', fontSize:10 }}>
                {verifiedCount} verified
              </span>
            </div>
            {skillBars.length > 0 ? (
              skillBars.map(s => <BarRow key={s.name} {...s} />)
            ) : (
              <div className="text-center py-4">
                <i className="bi bi-plus-circle" style={{ fontSize:32, color:'#123160' }}></i>
                <p className="text-muted mt-2 small">No skills added yet</p>
                <Link to="/profile" className="btn btn-sm rounded-pill" style={{ background:'#123160', color:'#fff' }}>
                  Add Skills
                </Link>
              </div>
            )}
          </div>
        </div>
        <div className="col-lg-6">
          <div className="card border-0 shadow-sm rounded-4 p-4 h-100">
            <div className="fw-bold mb-3" style={{ fontSize:13 }}>
              <i className="bi bi-exclamation-triangle-fill me-2" style={{ color:'#dc3545' }}></i>
              Skills to Learn
            </div>
            <div className="mb-3">
              {missingSkills.length > 0 ? missingSkills.map(s => (
                <span key={s} style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'5px 11px', borderRadius:20, fontSize:11, fontWeight:600, margin:3, background:'#FEE2E2', color:'#991b1b', border:'1px solid #fca5a5' }}>
                  <i className="bi bi-x-circle-fill" style={{ fontSize:10 }}></i>{s}
                </span>
              )) : (
                <div className="text-center py-2">
                  <i className="bi bi-check-circle-fill" style={{ color:'#057642', fontSize:28 }}></i>
                  <p className="text-muted mt-2 small">You have all key skills!</p>
                </div>
              )}
            </div>
            <hr/>
            <div className="fw-bold mb-2" style={{ fontSize:11, color:'#057642', textTransform:'uppercase', letterSpacing:1 }}>
              Your Verified Skills ✓
            </div>
            <div>
              {verifiedSkills.length > 0 ? verifiedSkills.map(s => (
                <span key={s} className="badge rounded-pill me-1 mb-1 px-3 py-2" style={{ background:'#D1FAE5', color:'#065f46', fontSize:11 }}>
                  <i className="bi bi-patch-check-fill me-1"></i>{s}
                </span>
              )) : (
                <span className="text-muted small">No verified skills yet — ask admin to verify</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── RECOMMENDED JOBS (real data) ── */}
      <div className="card border-0 shadow-sm rounded-4 p-4 mb-4">
        <div className="fw-bold mb-3" style={{ fontSize:13 }}>
          <i className="bi bi-briefcase-fill me-2" style={{ color:'#123160' }}></i>
          Recommended Jobs For You
          {matchedJobs.length > 0 && (
            <span className="badge ms-2 rounded-pill" style={{ background:'#EEF3F8', color:'#123160', fontSize:10 }}>
              {matchedJobs.length} matched
            </span>
          )}
        </div>
        {matchedJobs.length > 0 ? matchedJobs.map((j, i) => {
          const matchPct = Math.min(95, Math.round(60 + (i === 0 ? 30 : i === 1 ? 22 : i === 2 ? 14 : 8)))
          const tag = matchPct >= 85 ? 'Best Match' : matchPct >= 75 ? 'Great Fit' : matchPct >= 65 ? 'Good Match' : 'Fair Match'
          return (
            <div key={j.id} className="d-flex align-items-center gap-3 py-2 px-2 rounded-3"
              style={{ borderBottom: i < matchedJobs.length-1 ? '1px solid #f1f5f9' : 'none', cursor:'pointer', transition:'background 0.15s' }}
              onMouseOver={e => e.currentTarget.style.background='#EEF3F8'}
              onMouseOut={e => e.currentTarget.style.background='transparent'}
              onClick={() => navigate(`/jobs/${j.id}`)}>
              <div style={{ width:38, height:38, background:SKILL_COLORS[i % SKILL_COLORS.length], borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:11, fontWeight:700, flexShrink:0 }}>
                {j.companyName?.slice(0,3).toUpperCase() || 'CO'}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:600 }}>{j.title}</div>
                <div className="text-muted" style={{ fontSize:11 }}>
                  {j.companyName} · ₹{j.minSalary ? Math.round(j.minSalary/100000)+'L' : '?'}–{j.maxSalary ? Math.round(j.maxSalary/100000)+'L' : '?'}/yr
                </div>
              </div>
              <span className="badge rounded-pill px-3 py-2" style={{ background:'#D1FAE5', color:'#065f46', fontSize:11 }}>{tag}</span>
              <div style={{ width:42, height:42, borderRadius:'50%', background: matchPct>=85?'#057642':matchPct>=70?'#d97706':'#dc3545', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:12, fontWeight:700, flexShrink:0 }}>
                {matchPct}%
              </div>
            </div>
          )
        }) : (
          <div className="text-center py-4">
            <i className="bi bi-search" style={{ fontSize:32, color:'#adb5bd' }}></i>
            <p className="text-muted mt-2 small">Add skills to your profile to see matched jobs</p>
            <Link to="/jobs" className="btn btn-sm rounded-pill" style={{ background:'#123160', color:'#fff' }}>
              Browse All Jobs
            </Link>
          </div>
        )}
        <div className="text-center mt-3">
          <Link to="/jobs" className="btn btn-sm rounded-pill fw-semibold px-4" style={{ background:'#123160', color:'#fff' }}>
            <i className="bi bi-search me-2"></i>Browse All Jobs
          </Link>
        </div>
      </div>

      {/* ── LEARNING ROADMAP ── */}
      <div className="card border-0 shadow-sm rounded-4 p-4 mb-4">
        <div className="fw-bold mb-4" style={{ fontSize:13 }}>
          <i className="bi bi-map-fill me-2" style={{ color:'#7C3AED' }}></i>
          Learning Roadmap — Skills to Master
        </div>
        <div className="d-flex align-items-start" style={{ gap:0, overflowX:'auto' }}>
          {ROADMAP_SKILLS.map((s, i, arr) => {
            const done = userSkills.some(u => u.toLowerCase().includes(s.toLowerCase()))
            const color = SKILL_COLORS[i % SKILL_COLORS.length]
            return (
              <div key={s} style={{ display:'flex', alignItems:'center', flex:1, minWidth:80 }}>
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6, textAlign:'center', minWidth:70 }}>
                  <div style={{ width:44, height:44, borderRadius:'50%', background: done ? color : 'var(--bs-secondary-bg)', border:`2px solid ${color}`, display:'flex', alignItems:'center', justifyContent:'center', color: done ? '#fff' : color, fontSize:14, fontWeight:700, flexShrink:0 }}>
                    {done ? <i className="bi bi-check-lg"></i> : i + 1}
                  </div>
                  <div style={{ fontSize:11, fontWeight:600 }}>{s}</div>
                  <div className="text-muted" style={{ fontSize:10 }}>{done ? 'Done ✓' : '2-3 wks'}</div>
                </div>
                {i < arr.length - 1 && (
                  <div style={{ flex:1, height:2, background: done ? color : 'var(--bs-border-color)', margin:'0 2px', marginBottom:30 }}/>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── CHECKLIST + CTA ── */}
      <div className="row g-3 mb-4">
        <div className="col-lg-6">
          <div className="card border-0 shadow-sm rounded-4 p-4 h-100">
            <div className="fw-bold mb-3" style={{ fontSize:13 }}>
              <i className="bi bi-clipboard-check-fill me-2" style={{ color:'#057642' }}></i>
              Application Readiness
            </div>
            {checklist.map((item, i) => (
              <div key={i} className="d-flex align-items-center gap-3 py-2" style={{ borderBottom: i < checklist.length-1 ? '1px solid #f1f5f9' : 'none' }}>
                <div style={{ width:30, height:30, borderRadius:'50%', background: item.done ? '#D1FAE5' : '#FEE2E2', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <i className={`bi ${item.done ? 'bi-check-lg' : 'bi-x-lg'}`} style={{ color: item.done ? '#057642' : '#dc3545', fontSize:13 }}></i>
                </div>
                <span style={{ fontSize:13 }}>{item.label}</span>
                {!item.done && <span className="badge ms-auto" style={{ background:'#FEF3C7', color:'#92400e', fontSize:10 }}>Pending</span>}
              </div>
            ))}
          </div>
        </div>
        <div className="col-lg-6">
          <div className="card border-0 shadow-sm rounded-4 p-4 h-100 text-center d-flex flex-column justify-content-center" style={{ background:'#123160' }}>
            <i className="bi bi-rocket-takeoff-fill mb-3" style={{ fontSize:48, color:'rgba(255,255,255,0.9)' }}></i>
            <div style={{ color:'#fff', fontSize:18, fontWeight:700, marginBottom:8 }}>
              You are {matchScore}% ready!
            </div>
            <div style={{ color:'rgba(255,255,255,0.75)', fontSize:13, marginBottom:20 }}>
              {matchScore >= 70
                ? 'Great profile! Apply to top matched jobs now.'
                : 'Complete your profile to boost your career match score.'}
            </div>
            <div className="d-flex gap-2 justify-content-center flex-wrap">
              <Link to="/jobs" className="btn rounded-pill fw-semibold px-4" style={{ background:'#fff', color:'#123160' }}>
                <i className="bi bi-search me-2"></i>Find Jobs
              </Link>
              <Link to="/profile" className="btn rounded-pill fw-semibold px-4" style={{ background:'rgba(255,255,255,0.15)', color:'#fff', border:'1px solid rgba(255,255,255,0.4)' }}>
                <i className="bi bi-person me-2"></i>Edit Profile
              </Link>
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}