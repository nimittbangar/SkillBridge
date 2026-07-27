import React, { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { getProfile, updateProfile, updateMySkills, getResumes, setPrimaryResume, deleteResumeById, toggle2FA, openResume } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { changePassword } from '../services/api'
import PhoneInput from '../components/PhoneInput'
import { validatePassword, getPasswordStrength } from '../utils/validation'
import axios from 'axios'

export default function Profile() {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [newSkill, setNewSkill] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadMsg, setUploadMsg] = useState('')
  const [suggestedSkills, setSuggestedSkills] = useState([])
  const [resumes, setResumes] = useState([])
  const [twoFALoading, setTwoFALoading] = useState(false)

  const handleToggle2FA = async (e) => {
    const enabled = e.target.checked
    setTwoFALoading(true)
    try {
      await toggle2FA(enabled)
      setProfile(prev => ({ ...prev, twoFactorEnabled: enabled }))
    } catch {
      setError('Failed to update two-factor authentication setting.')
    } finally {
      setTwoFALoading(false)
    }
  }

  const loadResumes = async () => {
    try { const { data } = await getResumes(); setResumes(data || []) } catch { /* ignore */ }
  }
  const fileInputRef = useRef()

  // Change Password state — inside profile page
  const [pwdForm, setPwdForm] = useState({ currentPassword:'', newPassword:'', confirmPassword:'' })
  const [pwdLoading, setPwdLoading] = useState(false)
  const [pwdSuccess, setPwdSuccess] = useState(false)
  const [pwdError, setPwdError] = useState('')
  const [showPwd, setShowPwd] = useState({ current:false, new:false, confirm:false })
  const [activeTab, setActiveTab] = useState('profile') // profile | password

  useEffect(() => {
    getProfile()
      .then(({ data }) => {
        setProfile(data); setLoading(false)
        if (data?.role === 'SEEKER') loadResumes()
      })
      .catch(() => { setError('Failed to load profile'); setLoading(false) })
  }, [])

  const handleSave = async () => {
    setSaving(true); setError('')
    try {
      const { data } = await updateProfile(profile)
      setProfile(data); setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (e) {
      setError('Failed to save. Try again.')
    } finally { setSaving(false) }
  }

  const addSkill = async () => {
    if (!newSkill.trim()) return
    const current = profile.skillsList || []
    if (current.map(s => s.toLowerCase()).includes(newSkill.trim().toLowerCase())) { setNewSkill(''); return }
    const updated = [...current, newSkill.trim()]
    setProfile({ ...profile, skillsList: updated })
    setNewSkill('')
    try { await updateMySkills(updated) } catch { setError('Failed to add skill') }
  }

  const removeSkill = async (skill) => {
    const updated = (profile.skillsList || []).filter(s => s !== skill)
    setProfile({ ...profile, skillsList: updated })
    try { await updateMySkills(updated) } catch { setError('Failed to remove skill') }
  }

  const handleResumeUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (!file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf')) { setUploadMsg('error:Only PDF files allowed'); return }
    if (file.size > 5 * 1024 * 1024) { setUploadMsg('error:File too large. Max 5MB'); return }
    setUploading(true); setUploadMsg('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      const token = localStorage.getItem('token')
      const baseUrl = import.meta.env.VITE_API_URL || ''
      const { data } = await axios.post(`${baseUrl}/api/files/upload-resume`, formData, {
        headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${token}` }
      })
      setProfile(prev => ({ ...prev, resumeUrl: data.url || prev.resumeUrl }))
      setUploadMsg('success:Resume uploaded successfully!')
      setSuggestedSkills(data.suggestedSkills || [])
      await loadResumes()
    } catch (err) {
      const msg = err.response?.data?.error || 'Upload failed. Only PDF, max 5MB.'
      setUploadMsg('error:' + msg)
    } finally {
      setUploading(false)
      setTimeout(() => setUploadMsg(''), 4000)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const acceptSuggestedSkill = async (skill) => {
    const current = profile.skillsList || []
    if (current.map(s => s.toLowerCase()).includes(skill.toLowerCase())) {
      setSuggestedSkills(prev => prev.filter(s => s !== skill))
      return
    }
    const updated = [...current, skill]
    setProfile({ ...profile, skillsList: updated })
    setSuggestedSkills(prev => prev.filter(s => s !== skill))
    try { await updateMySkills(updated) } catch { setError('Failed to add skill') }
  }

  const dismissSuggestedSkill = (skill) => {
    setSuggestedSkills(prev => prev.filter(s => s !== skill))
  }

  const handleDeleteResumeById = async (resumeId) => {
    if (!window.confirm('Delete this resume?')) return
    try {
      await deleteResumeById(resumeId)
      await loadResumes()
      const { data } = await getProfile()
      setProfile(data)
      setUploadMsg('success:Resume deleted')
      setTimeout(() => setUploadMsg(''), 3000)
    } catch { setUploadMsg('error:Failed to delete') }
  }

  const handleSetPrimary = async (resumeId) => {
    try {
      await setPrimaryResume(resumeId)
      await loadResumes()
      const { data } = await getProfile()
      setProfile(data)
    } catch { setUploadMsg('error:Failed to set as primary') }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    setPwdError(''); setPwdSuccess(false)
    if (pwdForm.newPassword !== pwdForm.confirmPassword) { setPwdError('Passwords do not match'); return }
    const pwdCheck = validatePassword(pwdForm.newPassword)
    if (!pwdCheck.valid) { setPwdError(pwdCheck.message); return }
    if (pwdForm.currentPassword === pwdForm.newPassword) { setPwdError('New password must be different from current'); return }
    setPwdLoading(true)
    try {
      await changePassword({ currentPassword: pwdForm.currentPassword, newPassword: pwdForm.newPassword })
      setPwdSuccess(true)
      setPwdForm({ currentPassword:'', newPassword:'', confirmPassword:'' })
      setTimeout(() => setPwdSuccess(false), 4000)
    } catch (err) {
      setPwdError(err.response?.data || 'Incorrect current password. Please try again.')
    } finally { setPwdLoading(false) }
  }

  const msgType = uploadMsg.startsWith('success:') ? 'success' : uploadMsg.startsWith('error:') ? 'danger' : ''
  const msgText = uploadMsg.includes(':') ? uploadMsg.split(':').slice(1).join(':') : uploadMsg
  const strength = getPasswordStrength(pwdForm.newPassword)

  if (loading) return (
    <div className="d-flex justify-content-center align-items-center" style={{ minHeight:'60vh' }}>
      <div className="spinner-border" style={{ color:'#0A66C2' }}></div>
    </div>
  )

  return (
    <div className="container py-4">
      <div className="row justify-content-center">
        <div className="col-lg-8">

          {/* Header */}
          <div className="welcome-header mb-4">
            <div className="d-flex align-items-center gap-3">
              <div className="rounded-circle text-white d-flex align-items-center justify-content-center fw-bold"
                style={{ width:60, height:60, fontSize:22, background:'rgba(255,255,255,0.2)', border:'2px solid rgba(255,255,255,0.4)', flexShrink:0 }}>
                {profile?.name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <h4 className="fw-bold mb-1 text-white">{profile?.name}</h4>
                <span className="badge" style={{ background:'rgba(255,255,255,0.2)', color:'#fff' }}>
                  <i className={`bi ${profile?.role==='SEEKER'?'bi-person':profile?.role==='EMPLOYER'?'bi-building':'bi-shield'} me-1`}></i>
                  {profile?.role}
                </span>
              </div>
            </div>
          </div>

          {/* ── TABS ── */}
          <div className="d-flex gap-0 mb-4" style={{ borderBottom:'2px solid #e2e8f0' }}>
            {[
              { key:'profile', icon:'bi-person-fill', label:'My Profile' },
              { key:'password', icon:'bi-shield-lock-fill', label:'Change Password' },
              ...(profile?.role==='SEEKER' ? [{ key:'resume', icon:'bi-file-earmark-pdf-fill', label:'Resume' }] : []),
              ...(profile?.role==='SEEKER' ? [{ key:'skills', icon:'bi-tools', label:'My Skills' }] : []),
            ].map(tab => (
              <button key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className="btn rounded-0 fw-semibold d-flex align-items-center gap-2"
                style={{
                  borderBottom: activeTab===tab.key ? '2px solid #0A66C2' : '2px solid transparent',
                  color: activeTab===tab.key ? '#0A66C2' : '#6c757d',
                  background: 'transparent',
                  fontSize: '0.88rem',
                  padding: '10px 16px',
                  marginBottom: '-2px',
                  transition: 'all 0.15s'
                }}>
                <i className={`bi ${tab.icon}`}></i>
                {tab.label}
              </button>
            ))}
          </div>

          {/* ══════ TAB: PROFILE ══════ */}
          {activeTab === 'profile' && (
            <div className="card border-0 shadow-sm rounded-4">
              <div className="card-body p-4">
                <h6 className="fw-bold mb-3 d-flex align-items-center gap-2" style={{ color:'#0A66C2' }}>
                  <i className="bi bi-person-circle fs-5"></i>Basic Information
                </h6>
                {success && <div className="alert alert-success rounded-3 py-2 mb-3"><i className="bi bi-check-circle-fill me-2"></i>Profile updated successfully!</div>}
                {error && <div className="alert alert-danger rounded-3 py-2 mb-3"><i className="bi bi-exclamation-triangle-fill me-2"></i>{error}</div>}
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label fw-semibold small">Full Name</label>
                    <input className="form-control rounded-3" value={profile?.name||''} onChange={e=>setProfile({...profile,name:e.target.value})}/>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-semibold small">Phone</label>
                    <PhoneInput value={profile?.phone||''} onChange={phone => setProfile({...profile, phone})} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-semibold small">Email</label>
                    <input className="form-control rounded-3 bg-light" value={profile?.email||''} disabled/>
                    <small className="text-muted">Email cannot be changed</small>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-semibold small">Location</label>
                    <input className="form-control rounded-3" value={profile?.location||''} onChange={e=>setProfile({...profile,location:e.target.value})} placeholder="City, Country"/>
                  </div>
                  <div className="col-12">
                    <label className="form-label fw-semibold small">Bio</label>
                    <textarea className="form-control rounded-3" rows={3} value={profile?.bio||''} onChange={e=>setProfile({...profile,bio:e.target.value})} placeholder="Tell employers about yourself..."/>
                  </div>
                  {profile?.role==='SEEKER' && (
                    <div className="col-md-6">
                      <label className="form-label fw-semibold small">Experience (years)</label>
                      <input type="number" className="form-control rounded-3" value={profile?.experienceYears||''} onChange={e=>setProfile({...profile,experienceYears:parseInt(e.target.value)||0})} min="0" max="50"/>
                    </div>
                  )}
                  {profile?.role==='EMPLOYER' && (
                    <>
                      <div className="col-md-6">
                        <label className="form-label fw-semibold small">Company Name</label>
                        <input className="form-control rounded-3" value={profile?.companyName||''} onChange={e=>setProfile({...profile,companyName:e.target.value})}/>
                      </div>
                      <div className="col-md-6">
                        <label className="form-label fw-semibold small">Company Website</label>
                        <input className="form-control rounded-3" value={profile?.companyWebsite||''} onChange={e=>setProfile({...profile,companyWebsite:e.target.value})} placeholder="https://yourcompany.com"/>
                      </div>
                    </>
                  )}
                </div>
                <button className="btn text-white fw-bold mt-4 px-5 rounded-pill" style={{ background:'#0A66C2' }} onClick={handleSave} disabled={saving}>
                  {saving?<span className="spinner-border spinner-border-sm me-2"></span>:<i className="bi bi-check-circle me-2"></i>}Save Changes
                </button>
              </div>
            </div>
          )}

          {/* ══════ TAB: CHANGE PASSWORD ══════ */}
          {activeTab === 'password' && (
            <div className="card border-0 shadow-sm rounded-4">
              <div className="card-body p-4">
                <h6 className="fw-bold mb-1 d-flex align-items-center gap-2" style={{ color:'#0A66C2' }}>
                  <i className="bi bi-shield-lock-fill fs-5"></i>Change Password
                </h6>
                <p className="text-muted small mb-4">Enter your current password, then choose a new one</p>

                {pwdSuccess && (
                  <div className="alert alert-success rounded-3 mb-3">
                    <i className="bi bi-check-circle-fill me-2"></i>
                    <strong>Password changed successfully!</strong> Your new password is now active.
                  </div>
                )}
                {pwdError && (
                  <div className="alert alert-danger rounded-3 py-2 mb-3">
                    <i className="bi bi-exclamation-triangle-fill me-2"></i>{pwdError}
                  </div>
                )}

                <form onSubmit={handleChangePassword}>
                  <div className="row g-3">
                    {/* Current Password */}
                    <div className="col-12">
                      <label className="form-label fw-semibold small">
                        Current Password <span className="text-danger">*</span>
                      </label>
                      <div className="pwd-wrap">
                        <input type={showPwd.current?'text':'password'} className="form-control rounded-3" required
                          value={pwdForm.currentPassword}
                          onChange={e=>setPwdForm({...pwdForm,currentPassword:e.target.value})}
                          placeholder="Enter your current password"/>
                        <button type="button" className="pwd-toggle"
                          onClick={()=>setShowPwd({...showPwd,current:!showPwd.current})}
                          aria-label={showPwd.current?'Hide password':'Show password'} tabIndex={-1}>
                          <i className={`bi ${showPwd.current?'bi-eye-slash':'bi-eye'}`}></i>
                        </button>
                      </div>
                    </div>

                    {/* New Password */}
                    <div className="col-12">
                      <label className="form-label fw-semibold small">
                        New Password <span className="text-danger">*</span>
                      </label>
                      <div className="pwd-wrap">
                        <input type={showPwd.new?'text':'password'} className="form-control rounded-3" required
                          value={pwdForm.newPassword}
                          onChange={e=>setPwdForm({...pwdForm,newPassword:e.target.value})}
                          placeholder="At least 8 characters"/>
                        <button type="button" className="pwd-toggle"
                          onClick={()=>setShowPwd({...showPwd,new:!showPwd.new})}
                          aria-label={showPwd.new?'Hide password':'Show password'} tabIndex={-1}>
                          <i className={`bi ${showPwd.new?'bi-eye-slash':'bi-eye'}`}></i>
                        </button>
                      </div>
                      {/* Strength bar */}
                      {pwdForm.newPassword && (
                        <div className="mt-2">
                          <div className="progress rounded-pill" style={{ height:6, background:'#e2e8f0' }}>
                            <div className="progress-bar rounded-pill"
                              style={{ width:strength.width, background:strength.color, transition:'all 0.3s' }}></div>
                          </div>
                          <span style={{ color:strength.color, fontSize:'0.8rem' }}>
                            <i className="bi bi-shield me-1"></i>{strength.label}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Confirm Password */}
                    <div className="col-12">
                      <label className="form-label fw-semibold small">
                        Confirm New Password <span className="text-danger">*</span>
                      </label>
                      <div className="pwd-wrap">
                        <input
                          type={showPwd.confirm?'text':'password'}
                          className={`form-control rounded-3 ${pwdForm.confirmPassword&&(pwdForm.newPassword!==pwdForm.confirmPassword?'is-invalid':'is-valid')}`}
                          required
                          value={pwdForm.confirmPassword}
                          onChange={e=>setPwdForm({...pwdForm,confirmPassword:e.target.value})}
                          placeholder="Repeat new password"/>
                        <button type="button" className="pwd-toggle"
                          onClick={()=>setShowPwd({...showPwd,confirm:!showPwd.confirm})}
                          aria-label={showPwd.confirm?'Hide password':'Show password'} tabIndex={-1}>
                          <i className={`bi ${showPwd.confirm?'bi-eye-slash':'bi-eye'}`}></i>
                        </button>
                        {pwdForm.confirmPassword && pwdForm.newPassword===pwdForm.confirmPassword && (
                          <div className="valid-feedback">Passwords match!</div>
                        )}
                        {pwdForm.confirmPassword && pwdForm.newPassword!==pwdForm.confirmPassword && (
                          <div className="invalid-feedback">Passwords do not match</div>
                        )}
                      </div>
                    </div>
                  </div>

                  <button type="submit" className="btn text-white fw-bold mt-4 px-5 rounded-pill"
                    style={{ background:'#0A66C2' }} disabled={pwdLoading}>
                    {pwdLoading?<span className="spinner-border spinner-border-sm me-2"></span>:<i className="bi bi-shield-check me-2"></i>}
                    Update Password
                  </button>
                </form>

                {/* Tips */}
                <div className="mt-4 p-3 rounded-3" style={{ background:'#EEF3F8' }}>
                  <div className="small fw-semibold mb-2" style={{ color:'#0A66C2' }}>
                    <i className="bi bi-info-circle me-1"></i>Password Tips:
                  </div>
                  <ul className="mb-0 text-muted small" style={{ paddingLeft:16, lineHeight:1.8 }}>
                    <li>At least 6 characters long</li>
                    <li>Mix uppercase + lowercase letters</li>
                    <li>Include numbers and symbols (@, #, !)</li>
                    <li>Don't use your name or email as password</li>
                  </ul>
                </div>

                {/* 2FA Toggle */}
                <div className="mt-4 p-3 rounded-3 d-flex align-items-center justify-content-between flex-wrap gap-2"
                  style={{ background:'#F8FAFC', border:'1px solid #E2E8F0' }}>
                  <div>
                    <div className="fw-semibold small">
                      <i className="bi bi-shield-lock-fill me-1" style={{color:'#0A66C2'}}></i>
                      Two-Factor Authentication
                    </div>
                    <div className="text-muted" style={{fontSize:'0.78rem'}}>
                      {profile?.twoFactorEnabled
                        ? "Enabled — we'll email you a code each time you log in."
                        : "Off — add an extra email-code step when logging in."}
                    </div>
                  </div>
                  <div className="form-check form-switch">
                    <input className="form-check-input" type="checkbox" role="switch"
                      style={{width:42,height:22,cursor:'pointer'}}
                      checked={!!profile?.twoFactorEnabled}
                      disabled={twoFALoading}
                      onChange={handleToggle2FA}/>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══════ TAB: RESUME ══════ */}
          {activeTab === 'resume' && profile?.role==='SEEKER' && (
            <div className="card border-0 shadow-sm rounded-4">
              <div className="card-body p-4">
                <h6 className="fw-bold mb-3 d-flex align-items-center gap-2" style={{ color:'#0A66C2' }}>
                  <i className="bi bi-file-earmark-pdf fs-5"></i>Resume / CV
                  <span className="badge ms-1" style={{ background:'#EEF3F8', color:'#0A66C2', fontSize:'0.7rem' }}>PDF Only</span>
                </h6>

                {msgText && (
                  <div className={`alert alert-${msgType} rounded-3 py-2 mb-3`}>
                    <i className={`bi ${msgType==='success'?'bi-check-circle-fill':'bi-exclamation-triangle-fill'} me-2`}></i>
                    {msgText}
                  </div>
                )}

                {resumes.length > 0 ? (
                  <div className="mb-4">
                    {resumes.map(r => (
                      <div key={r.id} className="rounded-3 p-3 mb-2 d-flex align-items-center gap-3 flex-wrap"
                        style={{ background: r.isPrimary ? '#D1FAE5' : '#F8FAFC', border: r.isPrimary ? '1px solid #6EE7B7' : '1px solid #E2E8F0' }}>
                        <div className="rounded-3 d-flex align-items-center justify-content-center"
                          style={{ width:44, height:44, background:'#dc3545', flexShrink:0 }}>
                          <i className="bi bi-file-earmark-pdf-fill text-white" style={{ fontSize:20 }}></i>
                        </div>
                        <div className="flex-fill">
                          <div className="fw-bold small">
                            {r.fileName}
                            {r.isPrimary && <span className="badge rounded-pill ms-2" style={{background:'#057642',fontSize:'0.65rem'}}>Primary — used when you apply</span>}
                          </div>
                          <div className="text-muted" style={{fontSize:'0.72rem'}}>
                            {r.uploadedAt ? new Date(r.uploadedAt).toLocaleDateString() : ''}
                          </div>
                        </div>
                        <div className="d-flex gap-2 flex-wrap">
                          <button type="button" onClick={() => openResume(r.id, true)}
                            className="btn btn-sm fw-semibold rounded-pill" style={{ background:'#0A66C2', color:'#fff', fontSize:'0.75rem' }}>
                            <i className="bi bi-eye me-1"></i>View
                          </button>
                          {!r.isPrimary && (
                            <button className="btn btn-sm fw-semibold rounded-pill" onClick={() => handleSetPrimary(r.id)}
                              style={{ background:'#EEF3F8', color:'#0A66C2', border:'1px solid #0A66C2', fontSize:'0.75rem' }}>
                              <i className="bi bi-star me-1"></i>Set Primary
                            </button>
                          )}
                          <button className="btn btn-sm rounded-pill" onClick={() => handleDeleteResumeById(r.id)}
                            style={{ background:'#FEE2E2', color:'#991b1b', border:'1px solid #fca5a5', fontSize:'0.75rem' }}>
                            <i className="bi bi-trash me-1"></i>Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-3 p-3 mb-4 d-flex align-items-center gap-3"
                    style={{ background:'#FEF3C7', border:'1px solid #FCD34D' }}>
                    <i className="bi bi-exclamation-circle fs-3" style={{ color:'#d97706', flexShrink:0 }}></i>
                    <div>
                      <div className="fw-semibold" style={{ color:'#92400e' }}>No resume uploaded yet</div>
                      <div className="text-muted small">Upload so employers can download it when you apply</div>
                    </div>
                  </div>
                )}

                {resumes.length >= 5 ? (
                  <div className="rounded-3 p-3 text-center text-muted small" style={{border:'1px dashed #D0D9E0'}}>
                    You've reached the 5-resume limit. Delete one to upload another.
                  </div>
                ) : (
                <div className="rounded-3 p-4 text-center"
                  style={{ border:'2px dashed #D0D9E0', background:'#F8FAFC', cursor:'pointer' }}
                  onClick={()=>fileInputRef.current?.click()}
                  onDragOver={e=>{e.preventDefault();e.currentTarget.style.borderColor='#0A66C2'}}
                  onDragLeave={e=>{e.currentTarget.style.borderColor='#D0D9E0'}}
                  onDrop={e=>{e.preventDefault();e.currentTarget.style.borderColor='#D0D9E0';const f=e.dataTransfer.files[0];if(f)handleResumeUpload({target:{files:[f],value:''}}) }}>
                  {uploading ? (
                    <><div className="spinner-border mb-2" style={{ color:'#0A66C2' }}></div><div style={{ color:'#0A66C2' }}>Uploading...</div></>
                  ) : (
                    <>
                      <i className="bi bi-cloud-upload fs-1 mb-2 d-block" style={{ color:'#0A66C2' }}></i>
                      <div className="fw-semibold mb-1">{resumes.length>0 ? 'Add Another Resume' : 'Upload Resume'}</div>
                      <div className="text-muted small">Click or drag & drop your PDF here</div>
                      <div className="mt-2 d-flex gap-2 justify-content-center">
                        <span className="badge rounded-pill" style={{ background:'#EEF3F8', color:'#0A66C2', fontSize:'0.72rem' }}>PDF only</span>
                        <span className="badge rounded-pill" style={{ background:'#EEF3F8', color:'#0A66C2', fontSize:'0.72rem' }}>Max 5MB</span>
                        <span className="badge rounded-pill" style={{ background:'#EEF3F8', color:'#0A66C2', fontSize:'0.72rem' }}>Up to 5 resumes</span>
                      </div>
                    </>
                  )}
                </div>
                )}
                <input type="file" accept=".pdf" ref={fileInputRef} style={{ display:'none' }} onChange={handleResumeUpload}/>
              </div>

              {suggestedSkills.length > 0 && (
                <div className="mt-3 p-3 rounded-3" style={{ background:'#EEF3F8', border:'1px solid #0A66C2' }}>
                  <div className="fw-semibold mb-2" style={{ color:'#0A66C2', fontSize:'0.85rem' }}>
                    <i className="bi bi-stars me-1"></i> Found these skills in your resume — add them?
                  </div>
                  <div className="d-flex flex-wrap gap-2">
                    {suggestedSkills.map((skill, i) => (
                      <span key={i} className="d-inline-flex align-items-center gap-1 rounded-pill px-2 py-1"
                        style={{ background:'#fff', border:'1px solid #0A66C2', fontSize:'0.78rem' }}>
                        {skill}
                        <i className="bi bi-check-circle-fill text-success" style={{ cursor:'pointer' }}
                          title="Add to my skills" onClick={() => acceptSuggestedSkill(skill)}></i>
                        <i className="bi bi-x-circle text-muted" style={{ cursor:'pointer' }}
                          title="Dismiss" onClick={() => dismissSuggestedSkill(skill)}></i>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ══════ TAB: SKILLS ══════ */}
          {activeTab === 'skills' && profile?.role==='SEEKER' && (
            <div className="card border-0 shadow-sm rounded-4">
              <div className="card-body p-4">
                <h6 className="fw-bold mb-3 d-flex align-items-center gap-2" style={{ color:'#0A66C2' }}>
                  <i className="bi bi-tools fs-5"></i>My Skills
                </h6>
                {(profile?.verifiedSkillsList||[]).length>0 && (
                  <div className="mb-3 p-3 rounded-3" style={{ background:'#D1FAE5' }}>
                    <div className="text-success small fw-semibold mb-2">
                      <i className="bi bi-patch-check-fill me-1"></i>Admin Verified
                    </div>
                    <div className="d-flex flex-wrap gap-2">
                      {(profile.verifiedSkillsList||[]).map((s,i)=>(
                        <span key={i} className="skill-badge verified">
                          <i className="bi bi-patch-check-fill me-1"></i>{s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="d-flex flex-wrap gap-2 mb-3">
                  {(profile?.skillsList||[]).length===0 && <span className="text-muted small">No skills added yet</span>}
                  {(profile?.skillsList||[]).map((s,i)=>(
                    <span key={i} className={`skill-badge ${(profile?.verifiedSkillsList||[]).includes(s)?'verified':'unverified'}`}>
                      {(profile?.verifiedSkillsList||[]).includes(s)&&<i className="bi bi-patch-check-fill me-1"></i>}
                      {s}
                      <i className="bi bi-x ms-1" style={{ cursor:'pointer' }} onClick={()=>removeSkill(s)}></i>
                    </span>
                  ))}
                </div>
                <div className="input-group" style={{ maxWidth:380 }}>
                  <input className="form-control rounded-start-3" placeholder="Add a skill..."
                    value={newSkill} onChange={e=>setNewSkill(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addSkill()}/>
                  <button className="btn text-white fw-semibold rounded-end-3" style={{ background:'#0A66C2' }} onClick={addSkill}>
                    <i className="bi bi-plus me-1"></i>Add
                  </button>
                </div>
                <small className="text-muted mt-2 d-block">
                  <i className="bi bi-info-circle me-1"></i>Verified skills get 1.5x weight in match score
                </small>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}