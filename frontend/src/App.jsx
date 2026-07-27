import React, { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Navbar from './components/Navbar'
import StandoutAnimations from './components/StandoutAnimations'

import Home from './pages/Home'
const Login = lazy(() => import('./pages/Login'))
const Register = lazy(() => import('./pages/Register'))
const JobList = lazy(() => import('./pages/JobList'))
const JobDetail = lazy(() => import('./pages/JobDetail'))
const Profile = lazy(() => import('./pages/Profile'))
const ChangePassword = lazy(() => import('./pages/ChangePassword'))
const NotFound = lazy(() => import('./pages/NotFound'))
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'))
const SavedJobs = lazy(() => import('./pages/seeker/SavedJobs'))

const SeekerDashboard = lazy(() => import('./pages/seeker/SeekerDashboard'))
const MyApplications = lazy(() => import('./pages/seeker/MyApplications'))
const MyInterviews = lazy(() => import('./pages/seeker/MyInterviews'))
const MyOffers = lazy(() => import('./pages/seeker/MyOffers'))

const EmployerDashboard = lazy(() => import('./pages/employer/EmployerDashboard'))
const PostJob = lazy(() => import('./pages/employer/PostJob'))
const EditJob = lazy(() => import('./pages/employer/EditJob'))
const ManageApplications = lazy(() => import('./pages/employer/ManageApplications'))
const ScheduleInterview = lazy(() => import('./pages/employer/ScheduleInterview'))
const EmployerInterviews = lazy(() => import('./pages/employer/EmployerInterviews'))
const CompanyProfile = lazy(() => import('./pages/employer/CompanyProfile'))


const AdminLogin = lazy(() => import('./pages/admin/AdminLogin'))
const AdminRegister = lazy(() => import('./pages/admin/AdminRegister'))
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'))
const ManageUsers = lazy(() => import('./pages/admin/ManageUsers'))
const VerifySkills = lazy(() => import('./pages/admin/VerifySkills'))
const ManageJobs = lazy(() => import('./pages/admin/ManageJobs'))
const AllApplications = lazy(() => import('./pages/admin/AllApplications'))
const AdminAnalytics = lazy(() => import('./pages/admin/AdminAnalytics'))
const CareerRoom = lazy(() => import('./pages/CareerRoom'))

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="d-flex justify-content-center align-items-center" style={{ minHeight:'60vh' }}>
      <div className="spinner-border" style={{ color:'#123160' }}></div>
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />
  return children
}

function WithNav({ children }) {
  return <>
    <Navbar />
    <StandoutAnimations />
    <main className="sb-page-shell">{children}</main>
  </>
}

function WithBackground({ children }) {
  return <>
    <StandoutAnimations />
    <main className="sb-page-shell">{children}</main>
  </>
}


// ── Inline AllApplicants — no separate file needed ──
function AllApplicants() {
  const { user } = useAuth()
  const [jobs, setJobs] = React.useState([])
  const [loading, setLoading] = React.useState(true)
  React.useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL || ''}/api/jobs/my-jobs`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
    .then(r => r.json())
    .then(data => { setJobs(Array.isArray(data) ? data : []); setLoading(false) })
    .catch(() => setLoading(false))
  }, [])
  const statusBg    = { OPEN:'#D1FAE5', PAUSED:'#FEF3C7', CLOSED:'#FEE2E2' }
  const statusColor = { OPEN:'#057642', PAUSED:'#d97706', CLOSED:'#dc3545' }
  return (
    <div className="container-fluid p-0"><div className="d-flex">
      <div className="sidebar d-none d-md-block">
        <p className="text-muted small fw-bold text-uppercase px-2 mb-2" style={{fontSize:'0.7rem',letterSpacing:'0.8px'}}>Menu</p>
        <nav className="nav flex-column">
          {[{to:'/employer/dashboard',icon:'bi-speedometer2',label:'Dashboard'},{to:'/employer/post-job',icon:'bi-plus-circle',label:'Post a Job'},{to:'/employer/applicants',icon:'bi-people-fill',label:'Applicants',active:true},{to:'/employer/interviews',icon:'bi-camera-video',label:'Interviews'},{to:'/employer/company-profile',icon:'bi-building',label:'Company'}].map((item,i)=>(
            <a key={i} href={item.to} className={`nav-link${item.active?' active':''}`}><i className={`bi ${item.icon}`}></i>{item.label}</a>
          ))}
        </nav>
      </div>
      <div className="flex-fill main-content p-3">
        <div className="welcome-header mb-4">
          <h2 className="fw-bold mb-1"><i className="bi bi-people-fill me-2"></i>Applicants</h2>
          <p className="mb-0 opacity-75 small">Select a job to view its applicants</p>
        </div>
        {loading ? (
          <div className="text-center py-5"><div className="spinner-border" style={{color:'#123160'}}></div></div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-5">
            <i className="bi bi-briefcase fs-1 text-muted mb-3 d-block"></i>
            <p className="text-muted">No jobs posted yet</p>
            <a href="/employer/post-job" className="btn text-white rounded-pill px-4" style={{background:'#123160'}}>Post a Job</a>
          </div>
        ) : (
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body p-0">
              {jobs.map((job,i)=>(
                <div key={job.id} className="d-flex align-items-center gap-3 p-3"
                  style={{borderBottom:i<jobs.length-1?'1px solid #f1f5f9':'none'}}>
                  <div style={{flex:1}}>
                    <div className="fw-bold" style={{fontSize:'0.95rem'}}>{job.title}</div>
                    <div className="d-flex align-items-center gap-2 flex-wrap mt-1">
                      <span style={{background:'#EEF3F8',color:'#123160',padding:'2px 10px',borderRadius:20,fontSize:'0.75rem',fontWeight:600,display:'inline-flex',alignItems:'center',gap:4}}>
                        <i className="bi bi-building" style={{fontSize:'0.7rem'}}></i>
                        {job.companyName || user?.name || 'Company'}
                      </span>
                      <span className="text-muted" style={{fontSize:'0.78rem'}}>{job.jobType?.replace('_',' ')} · {job.location||'Remote'}</span>
                    </div>
                  </div>
                  <span className="badge rounded-pill px-3 py-2"
                    style={{background:statusBg[job.status]||'#F1F5F9',color:statusColor[job.status]||'#475569',fontSize:'0.75rem'}}>
                    {job.status}
                  </span>
                  <a href={`/employer/applications/${job.id}`}
                    className="btn rounded-pill fw-semibold"
                    style={{background:'#123160',color:'#fff',border:'none',fontSize:'0.85rem',padding:'7px 18px',whiteSpace:'nowrap'}}>
                    <i className="bi bi-people me-2"></i>{job.applicationCount||0} Applicants
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div></div>
  )
}

function AppRoutes() {
  return (
    <Suspense fallback={<div className="d-flex justify-content-center align-items-center" style={{minHeight:'60vh'}}><div className="spinner-border" style={{color:'#123160'}}></div></div>}>
    <Routes>
      {/* Admin standalone - no navbar */}
      <Route path="/admin/login" element={<WithBackground><AdminLogin /></WithBackground>} />
      <Route path="/admin/register" element={<WithBackground><AdminRegister /></WithBackground>} />

      {/* Public */}
      <Route path="/" element={<WithNav><Home /></WithNav>} />
      <Route path="/login" element={<WithNav><Login /></WithNav>} />
      <Route path="/register" element={<WithNav><Register /></WithNav>} />
      <Route path="/jobs" element={<WithNav><JobList /></WithNav>} />
      <Route path="/career-room" element={<ProtectedRoute roles={['SEEKER']}><WithNav><CareerRoom /></WithNav></ProtectedRoute>} />
      <Route path="/jobs/:id" element={<WithNav><JobDetail /></WithNav>} />

      {/* Forgot Password — public */}
      <Route path="/forgot-password" element={<WithNav><ForgotPassword /></WithNav>} />

      {/* Any logged in user */}
      <Route path="/profile" element={<ProtectedRoute><WithNav><Profile /></WithNav></ProtectedRoute>} />
      <Route path="/change-password" element={<ProtectedRoute><WithNav><ChangePassword /></WithNav></ProtectedRoute>} />

      {/* ── SEEKER ── */}
      <Route path="/seeker/dashboard" element={<ProtectedRoute roles={['SEEKER']}><WithNav><SeekerDashboard /></WithNav></ProtectedRoute>} />
      <Route path="/seeker/applications" element={<ProtectedRoute roles={['SEEKER']}><WithNav><MyApplications /></WithNav></ProtectedRoute>} />
      <Route path="/seeker/interviews" element={<ProtectedRoute roles={['SEEKER']}><WithNav><MyInterviews /></WithNav></ProtectedRoute>} />
      <Route path="/seeker/saved-jobs" element={<ProtectedRoute roles={['SEEKER']}><WithNav><SavedJobs /></WithNav></ProtectedRoute>} />
      <Route path="/seeker/offers" element={<ProtectedRoute roles={['SEEKER']}><WithNav><MyOffers /></WithNav></ProtectedRoute>} />

      {/* ── EMPLOYER ── */}
      <Route path="/employer/dashboard" element={<ProtectedRoute roles={['EMPLOYER']}><WithNav><EmployerDashboard /></WithNav></ProtectedRoute>} />
      <Route path="/employer/post-job" element={<ProtectedRoute roles={['EMPLOYER']}><WithNav><PostJob /></WithNav></ProtectedRoute>} />
      <Route path="/employer/edit-job/:jobId" element={<ProtectedRoute roles={['EMPLOYER']}><WithNav><EditJob /></WithNav></ProtectedRoute>} />
      <Route path="/employer/applications/:jobId" element={<ProtectedRoute roles={['EMPLOYER']}><WithNav><ManageApplications /></WithNav></ProtectedRoute>} />
      <Route path="/employer/schedule/:applicationId" element={<ProtectedRoute roles={['EMPLOYER']}><WithNav><ScheduleInterview /></WithNav></ProtectedRoute>} />
      <Route path="/employer/interviews" element={<ProtectedRoute roles={['EMPLOYER']}><WithNav><EmployerInterviews /></WithNav></ProtectedRoute>} />
      <Route path="/employer/company-profile" element={<ProtectedRoute roles={['EMPLOYER']}><WithNav><CompanyProfile /></WithNav></ProtectedRoute>} />
      <Route path="/employer/applicants" element={<ProtectedRoute roles={['EMPLOYER']}><WithNav><AllApplicants /></WithNav></ProtectedRoute>} />

      {/* ── ADMIN ── */}
      <Route path="/admin/dashboard" element={<ProtectedRoute roles={['ADMIN']}><WithNav><AdminDashboard /></WithNav></ProtectedRoute>} />
      <Route path="/admin/analytics" element={<ProtectedRoute roles={['ADMIN']}><WithNav><AdminAnalytics /></WithNav></ProtectedRoute>} />
      <Route path="/admin/users" element={<ProtectedRoute roles={['ADMIN']}><WithNav><ManageUsers /></WithNav></ProtectedRoute>} />
      <Route path="/admin/skills" element={<ProtectedRoute roles={['ADMIN']}><WithNav><VerifySkills /></WithNav></ProtectedRoute>} />
      <Route path="/admin/jobs" element={<ProtectedRoute roles={['ADMIN']}><WithNav><ManageJobs /></WithNav></ProtectedRoute>} />
      <Route path="/admin/applications" element={<ProtectedRoute roles={['ADMIN']}><WithNav><AllApplications /></WithNav></ProtectedRoute>} />

      {/* 404 */}
      <Route path="*" element={<WithNav><NotFound /></WithNav>} />
    </Routes>
    </Suspense>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}