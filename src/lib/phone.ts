// Pakistani mobile numbers: 03XXXXXXXXX, +923XXXXXXXXX or 923XXXXXXXXX.
// The server does the final check; this only gives instant feedback.

export function cleanPhone(input: string): string {
  // Accept Urdu/Arabic-Indic digits too (۰۱۲… / ٠١٢…) – some keyboards type them.
  return input
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[^\d+]/g, '')
}

export function isValidPkMobile(input: string): boolean {
  const p = cleanPhone(input)
  return /^03\d{9}$/.test(p) || /^\+923\d{9}$/.test(p) || /^923\d{9}$/.test(p)
}
