import pa from './pa'
import skr from './skr'
import mobilePa from './mobile-pa'
import mobileSkr from './mobile-skr'

// Urdu is the source text. Punjabi and Saraiki are dictionaries keyed by the
// Urdu text (gettext style); anything missing falls back to Urdu.
// The dictionaries were written for the web prototype and are drafts that a
// native speaker from the launch area must review.
export type LangId = 'ur' | 'pa' | 'skr'

export const LANGUAGES: { id: LangId; name: string; hint: string; greeting: string; speechLocale: string }[] = [
  { id: 'ur', name: 'اردو', hint: 'پورے پاکستان میں', greeting: 'منڈی دوست میں خوش آمدید۔ آپ نے اردو چنی ہے۔', speechLocale: 'ur-PK' },
  { id: 'pa', name: 'پنجابی', hint: 'پنجاب', greeting: 'منڈی دوست وچ جی آیاں نوں۔ تُسیں پنجابی چُنی اے۔', speechLocale: 'ur-PK' },
  { id: 'skr', name: 'سرائیکی', hint: 'لودھراں، ملتان، بہاولپور', greeting: 'منڈی دوست وِچ جی آیاں کوں۔ تُساں سرائیکی چُݨی ہے۔', speechLocale: 'ur-PK' },
]

const DICTS: Record<LangId, Record<string, string> | null> = {
  ur: null,
  pa: { ...(pa as Record<string, string>), ...mobilePa },
  skr: { ...(skr as Record<string, string>), ...mobileSkr },
}

let current: LangId = 'ur'

export const getLanguage = () => current
export const isLangId = (v: unknown): v is LangId => v === 'ur' || v === 'pa' || v === 'skr'

export function setLanguage(id: LangId) {
  current = DICTS[id] !== undefined ? id : 'ur'
}

/** Translate an Urdu UI string into the chosen language. */
export function t(text: string): string {
  if (!text || current === 'ur') return text
  const dict = DICTS[current]
  return dict?.[text] ?? dict?.[text.trim()] ?? text
}
