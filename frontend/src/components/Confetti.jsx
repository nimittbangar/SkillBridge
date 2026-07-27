import React, { useEffect, useRef } from 'react'

export default function Confetti({ active }) {
  const canvasRef = useRef()

  useEffect(() => {
    if (!active) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const colors = ['#123160','#22c55e','#f59e0b','#ec4899','#a855f7','#14B8A6','#ef4444','#fff']
    const pieces = Array.from({ length: 180 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height - canvas.height,
      w: 6 + Math.random() * 10,
      h: 4 + Math.random() * 6,
      color: colors[Math.floor(Math.random() * colors.length)],
      rot: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 8,
      vx: (Math.random() - 0.5) * 4,
      vy: 2 + Math.random() * 5,
      opacity: 1,
    }))

    let raf
    let frame = 0

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      frame++
      pieces.forEach(p => {
        p.x += p.vx
        p.y += p.vy
        p.rot += p.rotSpeed
        if (frame > 100) p.opacity -= 0.012
        p.opacity = Math.max(0, p.opacity)

        ctx.save()
        ctx.globalAlpha = p.opacity
        ctx.translate(p.x + p.w / 2, p.y + p.h / 2)
        ctx.rotate((p.rot * Math.PI) / 180)
        ctx.fillStyle = p.color
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
        ctx.restore()
      })
      if (frame < 200) raf = requestAnimationFrame(draw)
      else ctx.clearRect(0, 0, canvas.width, canvas.height)
    }
    draw()
    return () => cancelAnimationFrame(raf)
  }, [active])

  if (!active) return null
  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed', inset: 0,
        zIndex: 99999, pointerEvents: 'none'
      }}
    />
  )
}