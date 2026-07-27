import React, { useState, useEffect } from 'react'
import { COUNTRY_CODES, digitsOnly, validatePhone } from '../utils/validation'

// Splits a combined "+91 9876543210" string into {code, number}, defaulting to +91.
function parsePhone(value) {
  if (!value) return { code: '+91', number: '' }
  const match = value.match(/^(\+\d{1,4})\s?(\d*)$/)
  if (match) return { code: match[1], number: match[2] }
  return { code: '+91', number: digitsOnly(value) }
}

/**
 * Reusable phone field: a country-code dropdown + a number field that only accepts
 * digits (anything else typed is silently dropped, not just rejected on submit).
 * Calls onChange with one combined string, e.g. "+91 9876543210", same shape the
 * backend already stores — no API/schema change needed.
 */
export default function PhoneInput({ value, onChange, required = false }) {
  const [code, setCode] = useState(() => parsePhone(value).code)
  const [number, setNumber] = useState(() => parsePhone(value).number)
  const [touched, setTouched] = useState(false)

  useEffect(() => {
    const parsed = parsePhone(value)
    setCode(parsed.code)
    setNumber(parsed.number)
  }, [value])

  const emit = (newCode, newNumber) => {
    onChange(newNumber ? `${newCode} ${newNumber}` : '')
  }

  const { valid, message } = validatePhone(code, number)
  const country = COUNTRY_CODES.find(c => c.code === code) || COUNTRY_CODES[0]

  return (
    <div>
      <div className="input-group">
        <select
          className="form-select flex-shrink-0"
          style={{ maxWidth: 110 }}
          value={code}
          onChange={e => { setCode(e.target.value); emit(e.target.value, number) }}>
          {COUNTRY_CODES.map(c => (
            <option key={c.code} value={c.code}>{c.code} {c.name}</option>
          ))}
        </select>
        <input
          type="tel"
          inputMode="numeric"
          className="form-control"
          required={required}
          maxLength={country.digits}
          value={number}
          placeholder={`${country.digits}-digit number`}
          onChange={e => { const d = digitsOnly(e.target.value); setNumber(d); emit(code, d) }}
          onBlur={() => setTouched(true)}
        />
      </div>
      {touched && number && !valid && (
        <span className="text-danger d-block mt-1" style={{ fontSize: '0.8rem' }}>{message}</span>
      )}
    </div>
  )
}