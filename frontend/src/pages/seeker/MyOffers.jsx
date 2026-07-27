import React, { useState, useEffect } from 'react'
import Confetti from '../../components/Confetti'
import { Link } from 'react-router-dom'
import { getMyApplications, updateApplicationStatus, downloadOfferLetterPdf } from '../../services/api'

const scoreColor = s => s>=70?'#057642':s>=40?'#d97706':'#dc3545'

export default function MyOffers() {
  const [all, setAll] = useState([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(null)
  const [showConfetti, setShowConfetti] = useState(false)
  const [downloading, setDownloading] = useState(null)
  const [toast, setToast] = useState({ msg:'', type:'success' })

  const fetchOffers = () => {
    setLoading(true)
    getMyApplications()
      .then(({data}) => { setAll(data); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { fetchOffers(); const t=setInterval(fetchOffers,30000); return ()=>clearInterval(t) }, [])

  const showToast = (msg, type='success') => {
    setToast({ msg, type })
    setTimeout(() => setToast({ msg:'', type:'success' }), 4000)
  }

  const accept = async (id) => {
    setUpdating(id)
    try {
      await updateApplicationStatus(id, {status:'ACCEPTED'})
      setAll(prev => prev.map(a => a.id===id ? {...a, status:'ACCEPTED'} : a))
      // 🎉 CONFETTI!
      setShowConfetti(true)
      setTimeout(() => setShowConfetti(false), 5000)
      showToast('🎉 Offer accepted! Congratulations on your new job!')
    } catch { showToast('Failed to accept. Try again.', 'danger') } finally { setUpdating(null) }
  }

  const decline = async (id) => {
    if (!window.confirm('Decline this offer? This cannot be undone.')) return
    setUpdating(id)
    try {
      await updateApplicationStatus(id, {status:'REJECTED'})
      setAll(prev => prev.map(a => a.id===id ? {...a, status:'REJECTED'} : a))
      showToast('Offer declined.')
    } catch { showToast('Failed to decline. Try again.', 'danger') } finally { setUpdating(null) }
  }

  const handleDownloadPdf = async (app) => {
    setDownloading(app.id)
    try {
      const response = await downloadOfferLetterPdf(app.id)
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `OfferLetter_${app.jobTitle?.replace(/ /g,'_')}_${app.companyName?.replace(/ /g,'_')}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      showToast('✅ Offer letter downloaded!')
    } catch {
      showToast('Failed to download offer letter. Try again.', 'danger')
    } finally {
      setDownloading(null)
    }
  }

  const pending  = all.filter(a=>a.status==='OFFERED')
  const accepted = all.filter(a=>a.status==='ACCEPTED')
  const rejected = all.filter(a=>a.status==='REJECTED')

  if (loading) return (
    <div className="d-flex justify-content-center align-items-center" style={{minHeight:'60vh'}}>
      <div className="spinner-border" style={{color:'#123160'}}></div>
    </div>
  )

  return (
    <>
      <Confetti active={showConfetti} />
      <div className="container py-4">

      {/* Toast */}
      {toast.msg && (
        <div className={`alert alert-${toast.type} rounded-3 py-2 mb-3 d-flex align-items-center gap-2`}
          style={{position:'sticky',top:8,zIndex:99}}>
          <i className={`bi ${toast.type==='success'?'bi-check-circle-fill':'bi-exclamation-triangle-fill'}`}></i>
          <span className="fw-semibold">{toast.msg}</span>
        </div>
      )}

      <div className="welcome-header mb-4">
        <h1 className="fw-bold mb-1"><i className="bi bi-trophy me-2"></i>My Job Offers</h1>
        <p className="mb-0">{pending.length} pending • {accepted.length} accepted • {rejected.length} declined</p>
      </div>

      {/* Stats */}
      <div className="row g-3 mb-4">
        {[
          {label:'Pending Offers', value:pending.length, color:'#057642', bg:'#D1FAE5'},
          {label:'Accepted',       value:accepted.length, color:'#123160', bg:'#E6EDF5'},
          {label:'Declined',       value:rejected.length, color:'#991b1b', bg:'#FEE2E2'},
          {label:'Total',          value:pending.length+accepted.length+rejected.length, color:'#475569', bg:'#F1F5F9'},
        ].map((s,i)=>(
          <div key={i} className="col-6 col-md-3">
            <div className="text-center p-3 rounded-3" style={{background:s.bg}}>
              <div className="fw-bold" style={{fontSize:'1.6rem',color:s.color}}>{s.value}</div>
              <div style={{fontSize:'0.75rem',color:s.color}}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Pending Offers ── */}
      {pending.length > 0 && (
        <div className="mb-4">
          <h5 className="fw-bold mb-3" style={{color:'#057642'}}>
            <i className="bi bi-trophy-fill me-2"></i>Pending Offers — Action Required
          </h5>
          <div className="d-flex flex-column gap-3">
            {pending.map(app=>(
              <div key={app.id} className="card border-0 shadow rounded-4"
                style={{borderLeft:'4px solid #057642',opacity:updating===app.id?0.6:1}}>
                <div className="card-body p-4">
                  <div className="row align-items-start g-3">

                    {/* Job Info */}
                    <div className="col-12 col-md-5">
                      <div className="fw-bold" style={{fontSize:'1.1rem'}}>{app.jobTitle}</div>
                      <span className="company-badge"><i className="bi bi-building"></i>{app.companyName}</span>
                      <div className="mt-2">
                        <span className="badge rounded-pill px-3 py-2" style={{background:'#D1FAE5',color:'#065f46',fontSize:'0.8rem'}}>
                          <i className="bi bi-trophy-fill me-1"></i>Offer Received
                        </span>
                      </div>
                    </div>

                    {/* Match Score */}
                    <div className="col-6 col-md-2 text-center">
                      <div className="fw-bold" style={{color:scoreColor(app.skillMatchScore),fontSize:'1.4rem'}}>{app.skillMatchScore}%</div>
                      <div className="text-muted" style={{fontSize:'0.72rem'}}>Skill Match</div>
                    </div>

                    {/* Date */}
                    <div className="col-6 col-md-1 text-center text-muted small">
                      <i className="bi bi-calendar me-1"></i>
                      {app.appliedAt?new Date(app.appliedAt).toLocaleDateString('en-IN'):'—'}
                    </div>

                    {/* Actions */}
                    <div className="col-12 col-md-4">
                      <div className="d-flex gap-2 flex-column">

                        {/* ── DOWNLOAD OFFER LETTER ── prominent button */}
                        <button
                          className="btn fw-bold rounded-pill py-2 d-flex align-items-center justify-content-center gap-2"
                          style={{background:'#123160',color:'#fff',border:'none',fontSize:'0.95rem',boxShadow:'0 2px 8px rgba(10,102,194,0.3)'}}
                          disabled={downloading===app.id}
                          onClick={()=>handleDownloadPdf(app)}>
                          {downloading===app.id
                            ? <><span className="spinner-border spinner-border-sm" style={{width:14,height:14}}></span> Downloading...</>
                            : <><i className="bi bi-file-earmark-arrow-down-fill fs-5"></i> Download Offer Letter PDF</>
                          }
                        </button>

                        <button className="btn fw-semibold rounded-pill py-2"
                          style={{background:'#057642',color:'#fff',border:'none'}}
                          disabled={updating===app.id}
                          onClick={()=>accept(app.id)}>
                          {updating===app.id
                            ? <span className="spinner-border spinner-border-sm me-1" style={{width:14,height:14}}></span>
                            : <i className="bi bi-check-circle me-1"></i>}
                          Accept Offer
                        </button>

                        <button className="btn fw-semibold rounded-pill py-1"
                          style={{background:'#FEE2E2',color:'#991b1b',border:'1px solid #fca5a5',fontSize:'0.88rem'}}
                          disabled={updating===app.id}
                          onClick={()=>decline(app.id)}>
                          <i className="bi bi-x-circle me-1"></i>Decline
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Employer Message */}
                  {app.employerNote && (
                    <div className="mt-3 p-3 rounded-3" style={{background:'#D1FAE5',border:'1px solid #6EE7B7'}}>
                      <span className="fw-semibold" style={{color:'#065f46', fontSize:'0.8rem'}}>
                        <i className="bi bi-chat-square-text me-1"></i>Message from Employer:{' '}
                      </span>
                      <span style={{color:'#065f46', fontSize:'0.8rem'}}>{app.employerNote}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Accepted Offers ── */}
      {accepted.length > 0 && (
        <div className="mb-4">
          <h5 className="fw-bold mb-3" style={{color:'#123160'}}><i className="bi bi-check-circle-fill me-2"></i>Accepted Offers</h5>
          <div className="d-flex flex-column gap-3">
            {accepted.map(app=>(
              <div key={app.id} className="card border-0 shadow-sm rounded-4" style={{borderLeft:'4px solid #123160'}}>
                <div className="card-body p-4">
                  <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
                    <div>
                      <div className="fw-bold">{app.jobTitle}</div>
                      <span className="company-badge"><i className="bi bi-building"></i>{app.companyName}</span>
                    </div>
                    <div className="d-flex align-items-center gap-2 flex-wrap">
                      {/* Download button for accepted offers too */}
                      <button
                        className="btn btn-sm rounded-pill fw-semibold d-flex align-items-center gap-1"
                        style={{background:'#EEF3F8',color:'#123160',border:'1px solid #D0D9E0'}}
                        disabled={downloading===app.id}
                        onClick={()=>handleDownloadPdf(app)}>
                        {downloading===app.id
                          ? <span className="spinner-border spinner-border-sm" style={{width:12,height:12}}></span>
                          : <i className="bi bi-file-earmark-pdf-fill"></i>}
                        Download Offer Letter
                      </button>
                      <span className="badge rounded-pill px-3 py-2" style={{background:'#E6EDF5',color:'#123160',fontSize:'0.85rem'}}>
                        <i className="bi bi-check-circle-fill me-1"></i>Accepted — You got the job!
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Declined Offers ── */}
      {rejected.length > 0 && (
        <div className="mb-4">
          <h5 className="fw-bold mb-3 text-muted"><i className="bi bi-x-circle me-2"></i>Declined Offers</h5>
          <div className="d-flex flex-column gap-2">
            {rejected.map(app=>(
              <div key={app.id} className="card border-0 rounded-3" style={{background:'#F1F5F9'}}>
                <div className="card-body py-3 px-4 d-flex align-items-center justify-content-between flex-wrap gap-2">
                  <div>
                    <span className="fw-semibold">{app.jobTitle}</span>
                    <span className="text-muted small ms-2">— {app.companyName}</span>
                  </div>
                  <span className="badge rounded-pill" style={{background:'#FEE2E2',color:'#991b1b',fontSize:'0.75rem'}}>Declined</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Empty state ── */}
      {pending.length===0 && accepted.length===0 && rejected.length===0 && (
        <div className="text-center py-5">
          <i className="bi bi-trophy fs-1 text-muted mb-3 d-block"></i>
          <h5 className="text-muted">No offers yet</h5>
          <p className="text-muted small">Keep applying! When an employer offers you a job, it will appear here.</p>
          <Link to="/jobs" className="btn text-white rounded-pill px-4 mt-2" style={{background:'#123160'}}>Browse Jobs</Link>
        </div>
      )}
      </div>
    </>
  )
}