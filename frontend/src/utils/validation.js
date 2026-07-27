// Shared validation helpers — used by Register, Login's reset flow, ChangePassword,
// Profile, and AdminRegister, so the rules are defined once and stay consistent
// everywhere instead of being copy-pasted (and drifting out of sync) in each file.

export const COUNTRY_CODES = [
  { code: '+91', name: 'India', digits: 10 },
  { code: '+1',  name: 'USA/Canada', digits: 10 },
  { code: '+44', name: 'UK', digits: 10 },
  { code: '+971', name: 'UAE', digits: 9 },
  { code: '+61', name: 'Australia', digits: 9 },
  { code: '+65', name: 'Singapore', digits: 8 },
]

/** Strips everything except digits — used on every keystroke in a phone field. */
export function digitsOnly(value) {
  return value.replace(/\D/g, '')
}

/** Validates a phone number's digit count for the selected country code. */
export function validatePhone(countryCode, number) {
  if (!number) return { valid: true, message: '' } // phone is optional everywhere it's used
  const country = COUNTRY_CODES.find(c => c.code === countryCode) || COUNTRY_CODES[0]
  if (number.length !== country.digits) {
    return { valid: false, message: `${country.name} numbers need exactly ${country.digits} digits.` }
  }
  return { valid: true, message: '' }
}

/**
 * Password rules: at least 8 characters, one uppercase, one lowercase, one number.
 * Returns { valid, message } — message is empty when valid.
 */
export function validatePassword(pwd) {
  if (!pwd || pwd.length < 8) return { valid: false, message: 'Password must be at least 8 characters.' }
  if (!/[A-Z]/.test(pwd)) return { valid: false, message: 'Password needs at least one uppercase letter.' }
  if (!/[a-z]/.test(pwd)) return { valid: false, message: 'Password needs at least one lowercase letter.' }
  if (!/[0-9]/.test(pwd)) return { valid: false, message: 'Password needs at least one number.' }
  return { valid: true, message: '' }
}

/** Visual strength meter — purely cosmetic feedback, validatePassword() above is the real gate. */
export function getPasswordStrength(pwd) {
  if (!pwd) return { width: '0%', color: '#e2e8f0', label: '' }
  let score = 0
  if (pwd.length >= 8) score++
  if (pwd.length >= 12) score++
  if (/[A-Z]/.test(pwd)) score++
  if (/[0-9]/.test(pwd)) score++
  if (/[^A-Za-z0-9]/.test(pwd)) score++
  const levels = [
    { width: '20%',  color: '#dc3545', label: 'Very Weak' },
    { width: '40%',  color: '#d97706', label: 'Weak' },
    { width: '60%',  color: '#f59e0b', label: 'Fair' },
    { width: '80%',  color: '#0ea5e9', label: 'Strong' },
    { width: '100%', color: '#057642', label: 'Very Strong' },
  ]
  return levels[score - 1] || levels[0]
}