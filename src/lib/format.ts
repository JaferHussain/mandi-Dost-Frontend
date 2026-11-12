import type { Frequency, Gender, PriceUnit, Purpose, QuantityUnit, Section, Teeth } from './api'
import { t } from '../i18n'

// Urdu labels for the values the API sends. Shown through t(), so Punjabi and
// Saraiki follow automatically where a translation exists.

export const PURPOSE_LABEL: Record<Purpose, string> = {
  qurbani: 'قربانی',
  meatSupply: 'گوشت / ہوٹل',
  dairy: 'دودھ',
  breeding: 'نسل کشی',
  general: 'عام',
}

export const TEETH_LABEL: Record<Teeth, string> = {
  milkTeeth: 'کھیرا (دودھ کے دانت)',
  two: 'دو دانت',
  four: 'چار دانت',
  six: 'چھ دانت',
  full: 'پورا منہ',
}

export const GENDER_LABEL: Record<Gender, string> = { male: 'نر', female: 'مادہ', unknown: 'معلوم نہیں' }

export const FREQUENCY_LABEL: Record<Frequency, string> = {
  oneTime: 'ایک بار',
  daily: 'روزانہ',
  weekly: 'ہفتہ وار',
  monthly: 'ماہانہ',
}

export const STATUS_LABEL: Record<string, string> = {
  draft: 'ابھی نہیں لگا',
  active: 'لگا ہوا',
  sold: 'بک گیا',
  expired: 'وقت ختم',
  removed: 'ہٹا دیا',
  hidden: 'روکا گیا',
}

export const BUSINESS_TYPE_LABEL: Record<string, string> = {
  restaurant: 'ریسٹورنٹ',
  hotel: 'ہوٹل',
  butcher: 'قصائی',
  meatSupplier: 'گوشت سپلائر',
  trader: 'بیوپاری',
  farm: 'فارم',
  agriSupplier: 'زرعی سامان والا',
  other: 'دیگر',
}

export const BUSINESS_TYPE_ICON: Record<string, string> = {
  restaurant: 'silverware-fork-knife', hotel: 'bed-outline', butcher: 'knife', meatSupplier: 'truck-outline',
  trader: 'account-cash-outline', farm: 'barn', agriSupplier: 'sack', other: 'store-outline',
}

export const VERIFICATION_LABEL: Record<string, string> = {
  unverified: 'تصدیق نہیں ہوئی',
  pending: 'تصدیق ہو رہی ہے',
  verified: 'تصدیق شدہ کاروبار',
  rejected: 'تصدیق نہیں ہو سکی',
}

export const REQUEST_STATUS_LABEL: Record<string, string> = {
  open: 'کھلی ہے',
  fulfilled: 'پوری ہو گئی',
  closed: 'بند',
  expired: 'وقت ختم',
}

export const OFFER_STATUS_LABEL: Record<string, string> = {
  pending: 'جواب کا انتظار',
  accepted: 'منظور',
  declined: 'نامنظور',
  withdrawn: 'واپس لے لی',
}

export const BOOKING_STATUS_LABEL: Record<string, string> = {
  requested: 'جواب کا انتظار',
  confirmed: 'پکی ہو گئی',
  declined: 'نامنظور',
  cancelled: 'منسوخ',
}

export const REPORT_REASON_LABEL: Record<string, string> = {
  notAvailable: 'جانور / مال بک چکا یا موجود نہیں',
  wrongMedia: 'تصویر کسی اور جانور کی ہے',
  wrongDetails: 'غلط معلومات (عمر، دانت، وزن)',
  advancePaymentScam: 'پیشگی رقم مانگ رہا ہے (دھوکہ)',
  hiddenIllness: 'بیمار جانور چھپایا گیا',
  inappropriate: 'نامناسب اشتہار',
  other: 'کوئی اور وجہ',
}

/** 0321-9876543 → 923219876543 (the format wa.me links need). */
export const toWhatsApp = (phone: string) => {
  const d = phone.replace(/\D/g, '')
  return d.startsWith('0') ? `92${d.slice(1)}` : d
}

export const QUANTITY_LABEL: Record<QuantityUnit, string> = {
  head: 'جانور', kg: 'کلو', maund: 'من', ton: 'ٹن', bag: 'بوری', litre: 'لیٹر', piece: 'عدد',
}

export function priceUnitLabel(unit: PriceUnit, section: Section): string {
  switch (unit) {
    case 'perItem': return section === 'livestock' ? 'فی جانور' : 'فی عدد'
    case 'perKg': return 'فی کلو'
    case 'perMaund': return 'فی من'
    case 'perTon': return 'فی ٹن'
    case 'perBag': return 'فی بوری'
    case 'perLitre': return 'فی لیٹر'
    case 'perShare': return 'فی حصہ'
  }
}

/** 285000 → "2 لاکھ 85 ہزار"; null → "قیمت بات چیت سے". Rupees as people say them in the mandi. */
export function formatPrice(price: number | null | undefined): string {
  if (price == null) return t('قیمت بات چیت سے')
  if (price < 1000) return `${price} ${t('روپے')}`
  const lakh = Math.floor(price / 100_000)
  const hazar = Math.floor((price % 100_000) / 1000)
  const rest = price % 1000
  const parts: string[] = []
  if (lakh) parts.push(`${lakh} ${t('لاکھ')}`)
  if (hazar) parts.push(`${hazar} ${t('ہزار')}`)
  if (rest) parts.push(`${rest}`)
  return parts.join(' ')
}

export function formatQuantity(q: number, unit: QuantityUnit): string {
  const n = Number.isInteger(q) ? q : Number(q.toFixed(2))
  return `${n} ${t(QUANTITY_LABEL[unit])}`
}

export function formatAge(months: number | null | undefined): string | null {
  if (months == null) return null
  const y = Math.floor(months / 12)
  const m = months % 12
  if (!y) return `${m} ${t('ماہ')}`
  return m ? `${y} ${t('سال')} ${m} ${t('ماہ')}` : `${y} ${t('سال')}`
}

/** One maund (من) = 40 kg in Pakistani mandis. */
export const KG_PER_MAUND = 40

/** Price per maund of live weight, from the seller's own price and weight. Not a market rate. */
export function pricePerMaund(price: number | null, weightKg: number | null, unit: PriceUnit): number | null {
  if (price == null || !weightKg || unit !== 'perItem') return null
  return Math.round(price / (weightKg / KG_PER_MAUND))
}

/**
 * Rough meat estimate from live weight. Dressing percentage (meat with bone ÷ live weight)
 * is commonly about 45–55% for cattle, buffalo and camels and about 40–50% for goats and sheep.
 * Always shown as a range and labelled as an estimate.
 */
export function meatEstimate(weightKg: number | null, categorySlug: string): { min: number; max: number; ratio: string } | null {
  if (!weightKg) return null
  const small = categorySlug === 'goat' || categorySlug === 'sheep'
  const [lo, hi] = small ? [0.4, 0.5] : [0.45, 0.55]
  return { min: Math.round(weightKg * lo), max: Math.round(weightKg * hi), ratio: small ? '40–50%' : '45–55%' }
}

export function timeAgo(iso: string | null): string {
  if (!iso) return ''
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  if (days <= 0) return t('آج')
  if (days === 1) return t('کل')
  if (days < 7) return `${days} ${t('دن پہلے')}`
  if (days < 30) return `${Math.floor(days / 7)} ${t('ہفتے پہلے')}`
  return `${Math.floor(days / 30)} ${t('ماہ پہلے')}`
}

/**
 * Live-weight estimate from a tape measure (Schaeffer's formula, widely used for cattle,
 * and as a rough guide for goats and sheep): weight (lb) = girth² (in) × length (in) ÷ 300.
 * Always shown as a range and labelled as an estimate – a scale is the only exact answer.
 */
export function estimateWeightKg(girthIn: number, lengthIn: number) {
  if (!(girthIn > 0) || !(lengthIn > 0)) return null
  const kg = ((girthIn * girthIn * lengthIn) / 300) * 0.4536
  return { kg: Math.round(kg), min: Math.round(kg * 0.9), max: Math.round(kg * 1.1) }
}
