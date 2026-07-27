import React, { useState } from 'react'

// Auto-fetches company logo from Clearbit API
// Falls back to colored initial avatar if logo not found
export default function CompanyLogo({ companyName, size = 40, className = '' }) {
  const [imgError, setImgError] = useState(false)

  // Clean company name for logo URL
  const getDomain = (name) => {
    if (!name) return ''
    return name.toLowerCase()
      .replace(/\s+(pvt|ltd|private|limited|inc|corp|corporation|technologies|technology|solutions|services|systems|group|india|global)\.?/gi, '')
      .replace(/[^a-z0-9]/g, '')
      .trim()
  }

  const domain = getDomain(companyName)
  const initial = companyName?.charAt(0).toUpperCase() || '?'

  // Color based on company name (consistent color per company)
  const colors = ['#123160','#057642','#d97706','#7C3AED','#dc3545','#0F766E','#b91c1c','#065f46']
  const colorIndex = (companyName || '').charCodeAt(0) % colors.length
  const bgColor = colors[colorIndex]

  const style = {
    width: size,
    height: size,
    borderRadius: Math.floor(size * 0.2),
    flexShrink: 0,
    objectFit: 'contain',
    border: '1px solid #e2e8f0',
    background: '#fff',
    padding: 2
  }

  const fallbackStyle = {
    width: size,
    height: size,
    borderRadius: Math.floor(size * 0.2),
    background: bgColor,
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: Math.floor(size * 0.42),
    fontWeight: 700,
    flexShrink: 0,
  }

  if (imgError || !domain) {
    return <div style={fallbackStyle} className={className}>{initial}</div>
  }

  return (
    <img
      src={`https://logo.clearbit.com/${domain}.com`}
      alt={companyName}
      style={style}
      className={className}
      onError={() => setImgError(true)}
    />
  )
}