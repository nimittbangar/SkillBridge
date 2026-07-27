import React, { useState } from 'react'

// Auto-generates beautiful avatar with user's initials
// Uses ui-avatars.com API - no upload needed
export default function UserAvatar({ name, size = 40, className = '' }) {
  const [imgError, setImgError] = useState(false)

  const initials = name
    ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  const fallbackStyle = {
    width: size, height: size,
    borderRadius: '50%',
    background: '#123160',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: Math.floor(size * 0.38),
    fontWeight: 700,
    flexShrink: 0,
  }

  if (imgError || !name) {
    return <div style={fallbackStyle} className={className}>{initials}</div>
  }

  return (
    <img
      src={`https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0A66C2&color=fff&size=${size * 2}&bold=true`}
      alt={name}
      width={size} height={size}
      style={{ borderRadius: '50%', flexShrink: 0, objectFit: 'cover' }}
      className={className}
      onError={() => setImgError(true)}
    />
  )
}