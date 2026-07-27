import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getNotifications, markAllRead, markNotifRead, clearNotifications, getUnreadCount } from '../services/api'

// ── Play notification sound using base64 audio ──
const NOTIF_SOUND = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbz6xwSkVil7PUzLCAWUZHZKO+3dS4jWhOS2iuwuDavJByUE5wts3m5+C9lHNWVXq/1+bm38KYeF1XgMTb6eTkyJ99Y1+JzN3r5+bPpIF2aZHV5u3p5tGrjX1wmNzp7urn1bSZhXujz+Pq6efYuKCSiKzT4evp6N/FqpOIr9Pi6unp4cmwmpCz1+Lq6ujk0LiinrTY4urq6OXSuaWhuNnk6Ojn5NK9p6W53OXo5+fl1cCsqLzd5efn5uXWwq6qv97m5+bm5NfEsKzB3+bn5ubk2MWxrsLf5+bl5uTYxrKww+Dn5uXm5NnHs7HD4Ofm5Obl2ceysMTg5+bl5uXa'

const playNotifSound = () => {
  try {
    const audio = new Audio(NOTIF_SOUND)
    audio.volume = 0.5
    audio.play().catch(() => {})
  } catch(e) {}
}

const typeIcon = {
  APPLICATION: 'bi-send-fill',
  SHORTLIST:   'bi-star-fill',
  INTERVIEW:   'bi-camera-video-fill',
  OFFER:       'bi-trophy-fill',
  SYSTEM:      'bi-info-circle-fill'
}
const typeColor = {
  APPLICATION: '#0A66C2',
  SHORTLIST:   '#0ea5e9',
  INTERVIEW:   '#d97706',
  OFFER:       '#057642',
  SYSTEM:      '#6c757d'
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([])
  const [unread, setUnread] = useState(0)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const dropRef = useRef(null)
  const navigate = useNavigate()
  const prevCountRef = useRef(0)
  const mountedRef = useRef(true)
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false } }, [])

  // ── Fetch unread count every 5 seconds ──
  const fetchCount = useCallback(async () => {
    try {
      const { data } = await getUnreadCount()
      if (!mountedRef.current) return
      const newCount = data.count || 0
      // If count increased — play sound and refresh
      if (newCount > prevCountRef.current && prevCountRef.current !== 0) {
        setUnread(newCount)
        playNotifSound()
        // If panel is open refresh notifications too
        if (open) fetchAll()
      }
      prevCountRef.current = newCount
      setUnread(newCount)
    } catch {}
  }, [open])

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await getNotifications()
      if (!mountedRef.current) return
      setNotifications(data || [])
      const unreadCount = (data || []).filter(n => !n.read).length
      setUnread(unreadCount)
      prevCountRef.current = unreadCount
    } catch {}
    finally { if (mountedRef.current) setLoading(false) }
  }, [])

  // Poll every 5 seconds for new notifications
  useEffect(() => {
    fetchCount()
    const t = setInterval(fetchCount, 5000)
    return () => clearInterval(t)
  }, [fetchCount])

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleOpen = () => {
    const next = !open
    setOpen(next)
    if (next) fetchAll()
  }

  const handleMarkRead = async () => {
    await markAllRead()
    setUnread(0)
    prevCountRef.current = 0
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  const handleClear = async () => {
    await clearNotifications()
    setNotifications([])
    setUnread(0)
    prevCountRef.current = 0
  }

  const handleNotifClick = async (notif) => {
    if (!notif.read) {
      await markNotifRead(notif.id)
      setNotifications(prev => prev.map(n => n.id===notif.id ? {...n, read:true} : n))
      setUnread(prev => Math.max(0, prev - 1))
      prevCountRef.current = Math.max(0, prevCountRef.current - 1)
    }
    setOpen(false)
    if (notif.link) navigate(notif.link)
  }

  const formatTime = (dateStr) => {
    if (!dateStr) return ''
    // Backend sends LocalDateTime without Z — append Z to treat as UTC
    const utcStr = dateStr.includes('Z') || dateStr.includes('+') ? dateStr : dateStr + 'Z'
    const diff = Date.now() - new Date(utcStr).getTime()
    const secs = Math.floor(diff / 1000)
    const mins = Math.floor(secs / 60)
    const hrs  = Math.floor(mins / 60)
    const days = Math.floor(hrs  / 24)
    if (secs < 30)  return 'just now'
    if (mins < 1)   return `${secs}s ago`
    if (mins < 60)  return `${mins} min ago`
    if (hrs  < 24)  return `${hrs} hr ago`
    if (days < 7)   return `${days} day${days>1?'s':''} ago`
    return new Date(utcStr).toLocaleDateString('en-IN', { day:'numeric', month:'short' })
  }

  return (
    <div ref={dropRef} style={{ position: 'relative' }}>
      {/* Bell Button */}
      <button
        onClick={handleOpen}
        className="btn btn-sm d-flex align-items-center justify-content-center position-relative icon-btn-circle"
        style={{
          width: 36, height: 36, minWidth: 36, flexShrink: 0, borderRadius: '50%',
          padding: 0,
          background: open ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.15)',
          border: '1.5px solid rgba(255,255,255,0.4)',
          color: '#fff',
          transition: 'all 0.2s',
          animation: unread > 0 ? 'bellShake 2s ease infinite' : 'none'
        }}>
        <i className="bi bi-bell-fill" style={{ fontSize: '0.95rem' }}></i>
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: -4, right: -4,
            background: '#dc3545', color: '#fff',
            borderRadius: '50%', width: 18, height: 18,
            fontSize: '0.62rem', fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '1.5px solid #0A66C2',
            animation: 'badgePop 0.3s ease'
          }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'fixed',
          top: 60,
          left: 8,
          right: 8,
          width: 'auto',
          maxWidth: 400,
          maxHeight: '75vh',
          margin: '0 auto',
          background: 'var(--notif-bg, #fff)',
          borderRadius: 14,
          boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
          border: '1px solid var(--notif-border, #e2e8f0)',
          zIndex: 9999, overflow: 'hidden',
          display: 'flex', flexDirection: 'column'
        }}>
          {/* Header */}
          <div style={{
            padding: '12px 16px',
            borderBottom: '1px solid var(--notif-border, #e2e8f0)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'var(--notif-bg, #fff)'
          }}>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--notif-text, #191919)' }}>
              <i className="bi bi-bell-fill me-2" style={{ color: '#0A66C2' }}></i>
              Notifications
              {unread > 0 && (
                <span className="badge rounded-pill ms-2"
                  style={{ background: '#dc3545', color: '#fff', fontSize: '0.65rem' }}>
                  {unread} new
                </span>
              )}
            </div>
            <div className="d-flex gap-2">
              {unread > 0 && (
                <button onClick={handleMarkRead}
                  style={{ border: 'none', background: 'none', color: '#0A66C2', fontSize: '0.72rem', cursor: 'pointer', fontWeight: 500 }}>
                  Mark all read
                </button>
              )}
              {notifications.length > 0 && (
                <button onClick={handleClear}
                  style={{ border: 'none', background: 'none', color: '#dc3545', fontSize: '0.72rem', cursor: 'pointer', fontWeight: 500 }}>
                  Clear all
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <div style={{ overflowY: 'auto', flex: 1, background: 'var(--notif-bg, #fff)' }}>
            {loading ? (
              <div style={{ padding: 32, textAlign: 'center' }}>
                <div className="spinner-border spinner-border-sm" style={{ color: '#0A66C2' }}></div>
              </div>
            ) : notifications.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--notif-muted, #adb5bd)' }}>
                <i className="bi bi-bell-slash d-block mb-2" style={{ fontSize: 32 }}></i>
                <div style={{ fontSize: '0.85rem' }}>No notifications yet</div>
              </div>
            ) : notifications.map(n => (
              <div key={n.id}
                onClick={() => handleNotifClick(n)}
                style={{
                  padding: '11px 16px',
                  borderBottom: '1px solid var(--notif-border, #f3f2ef)',
                  cursor: 'pointer',
                  background: n.read
                    ? 'var(--notif-bg, #fff)'
                    : 'var(--notif-unread, #EEF3F8)',
                  display: 'flex', gap: 10, alignItems: 'flex-start',
                  transition: 'background 0.1s'
                }}
                onMouseOver={e => e.currentTarget.style.background = n.read ? 'var(--notif-hover, #f8f9fa)' : '#dce8f5'}
                onMouseOut={e => e.currentTarget.style.background = n.read ? 'var(--notif-bg, #fff)' : 'var(--notif-unread, #EEF3F8)'}>
                {/* Icon */}
                <div style={{
                  width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                  background: (typeColor[n.type] || '#0A66C2') + '18',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <i className={`bi ${typeIcon[n.type] || 'bi-info-circle-fill'}`}
                    style={{ color: typeColor[n.type] || '#0A66C2', fontSize: '0.9rem' }}></i>
                </div>
                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontWeight: n.read ? 500 : 700,
                    fontSize: '0.85rem',
                    color: 'var(--notif-text, #191919)',
                    marginBottom: 2
                  }}>
                    {n.title}
                  </div>
                  <div style={{
                    fontSize: '0.78rem',
                    color: 'var(--notif-muted, #666)',
                    lineHeight: 1.4, marginBottom: 3
                  }}>
                    {n.message}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#aaa' }}>
                    {n.createdAt ? formatTime(n.createdAt) : ''}
                  </div>
                </div>
                {/* Unread dot */}
                {!n.read && (
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: '#0A66C2', flexShrink: 0, marginTop: 4
                  }}></div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        @keyframes bellShake {
          0%,100% { transform: rotate(0deg); }
          10%      { transform: rotate(-15deg); }
          20%      { transform: rotate(15deg); }
          30%      { transform: rotate(-10deg); }
          40%      { transform: rotate(10deg); }
          50%      { transform: rotate(0deg); }
        }
        @keyframes badgePop {
          0%   { transform: scale(0); }
          70%  { transform: scale(1.3); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  )
}