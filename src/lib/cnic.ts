import { cleanPhone } from './phone'

// Pakistani national ID card number (CNIC): 13 digits, written 35202-1234567-1.
// The server does the final check; this only gives instant feedback.

/** Digits only (Urdu/Arabic digits converted), at most 13. */
export function cnicDigits(input: string): string {
  return cleanPhone(input).replace(/\D/g, '').slice(0, 13)
}

/** Formats as the user types: 35202-1234567-1 */
export function formatCnic(input: string): string {
  const d = cnicDigits(input)
  if (d.length <= 5) return d
  if (d.length <= 12) return `${d.slice(0, 5)}-${d.slice(5)}`
  return `${d.slice(0, 5)}-${d.slice(5, 12)}-${d.slice(12)}`
}

/** Empty is fine (CNIC is optional); otherwise 13 digits not starting with 0. */
export function isValidCnicOrEmpty(input: string): boolean {
  const d = cnicDigits(input)
  return d.length === 0 || (d.length === 13 && d[0] !== '0')
}
