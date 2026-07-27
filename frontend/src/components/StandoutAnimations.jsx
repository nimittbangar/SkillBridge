import React, { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'

// Color theme per page — drives the mouse glow and back-to-top button colors
function getColors(pathname) {
  if (pathname === '/') return ['#0A66C2','#7C3AED','#14B8A6','#06b6d4','#0ea5e9','#a855f7']
  if (pathname.includes('/career-room')) return ['#22c55e','#0A66C2','#a855f7','#06b6d4','#f59e0b','#ec4899']
  if (pathname.includes('/jobs')) return ['#14B8A6','#0A66C2','#06b6d4','#0ea5e9','#22c55e','#7C3AED']
  if (pathname.includes('/seeker')) return ['#22c55e','#0A66C2','#14B8A6','#06b6d4','#a855f7','#0ea5e9']
  if (pathname.includes('/employer')) return ['#f59e0b','#0A66C2','#7C3AED','#14B8A6','#ec4899','#06b6d4']
  if (pathname.includes('/admin')) return ['#8b5cf6','#0A66C2','#14B8A6','#a855f7','#06b6d4','#22c55e']
  if (pathname.includes('/login') || pathname.includes('/register') || pathname.includes('password'))
    return ['#0A66C2','#7C3AED','#06b6d4','#14B8A6','#a855f7','#0ea5e9']
  return ['#0A66C2','#7C3AED','#14B8A6','#06b6d4','#0ea5e9','#a855f7']
}

export default function StandoutAnimations() {
  const { pathname } = useLocation()
  const colors = getColors(pathname)
  const [scrollPct, setScrollPct] = useState(0)
  const [showTop, setShowTop] = useState(false)
  const [mouse, setMouse] = useState({ x: -999, y: -999 })

  useEffect(() => {
    const onScroll = () => {
      const t = window.scrollY
      const h = document.documentElement.scrollHeight - window.innerHeight
      setScrollPct(h > 0 ? (t / h) * 100 : 0)
      setShowTop(t > 300)
    }
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const onMove = e => setMouse({ x: e.clientX, y: e.clientY })
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  const mainColor = colors[0]

  return (
    <>
      {/* Scroll progress bar */}
      <div style={{
        position: 'fixed', top: 0, left: 0, zIndex: 9999,
        width: `${scrollPct}%`, height: 3, pointerEvents: 'none',
        background: `linear-gradient(90deg, ${mainColor}, ${colors[2]})`,
        borderRadius: '0 3px 3px 0',
        transition: 'width 0.1s linear',
      }} />

      {/* Mouse glow */}
      <div style={{
        position: 'fixed', pointerEvents: 'none', zIndex: 0,
        left: mouse.x, top: mouse.y,
        width: 320, height: 320,
        transform: 'translate(-50%,-50%)',
        background: `radial-gradient(circle, ${mainColor}15, transparent 65%)`,
        filter: 'blur(10px)',
        transition: 'left 0.06s linear, top 0.06s linear',
      }} />

      {/* Back to top */}
      {showTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          title="Back to top"
          style={{
            position: 'fixed', bottom: 76, right: 18,
            width: 46, height: 46, borderRadius: '50%',
            background: `linear-gradient(135deg, ${mainColor}, ${colors[2]})`,
            color: '#fff', border: 'none', cursor: 'pointer',
            zIndex: 9997, display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 22,
            boxShadow: `0 4px 20px ${mainColor}55`,
            animation: 'sbFadeInUp 0.3s ease',
            transition: 'transform 0.2s ease',
          }}
          onMouseOver={e => e.currentTarget.style.transform = 'translateY(-4px) scale(1.12)'}
          onMouseOut={e => e.currentTarget.style.transform = 'translateY(0) scale(1)'}
        >
          <i className="bi bi-arrow-up-short"></i>
        </button>
      )}
    </>
  )
}