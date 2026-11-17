import type { IconName } from '../components/ui'
import type { Category, Frequency, Gender, Location, PriceUnit, Purpose, QuantityUnit, Section, Teeth, VoiceParse } from './api'
import { formatAge, formatPrice, formatQuantity, FREQUENCY_LABEL, GENDER_LABEL, priceUnitLabel, PURPOSE_LABEL, TEETH_LABEL } from './format'
import { t } from '../i18n'

// What the server understood → what the user sees, hears, and what goes into the forms.
// Nothing here publishes anything: the sell and requirement forms are always shown and confirmed by the user.

export type Chip = { icon: IconName; text: string }

const MISSING_LABEL: Record<string, string> = {
  category: 'کیا چیز ہے',
  purpose: 'کس کے لیے (قربانی، ہوٹل، دودھ، عام)',
  price: 'قیمت',
  quantity: 'کتنے چاہییں',
}

const INTRO: Record<VoiceParse['intent'], string> = {
  sell: 'آپ بیچنا چاہتے ہیں',
  wanted: 'آپ کو چاہیے',
  search: 'آپ تلاش کر رہے ہیں',
  unknown: 'میں نے یہ سنا',
}

export function describeParse(p: VoiceParse, categories: Category[], locations: Location[]) {
  const chips: Chip[] = []
  const category = categories.find((c) => c.id === p.categoryId)
  const section: Section = p.section ?? 'livestock'

  if (category) chips.push({ icon: 'tag-outline', text: t(category.nameUr) })
  if (p.gender && p.gender !== 'unknown') chips.push({ icon: p.gender === 'male' ? 'gender-male' : 'gender-female', text: t(GENDER_LABEL[p.gender]) })
  if (p.breed) chips.push({ icon: 'dna', text: p.breed })
  if (p.quantity != null) chips.push({ icon: 'numeric', text: formatQuantity(p.quantity, p.quantityUnit ?? 'head') })
  if (p.shares === 7) chips.push({ icon: 'account-group-outline', text: t('سات حصے') })
  if (p.teeth) chips.push({ icon: 'tooth-outline', text: t(TEETH_LABEL[p.teeth]) })
  const age = formatAge(p.ageMonths)
  if (age) chips.push({ icon: 'calendar-clock', text: age })
  if (p.weightKg) chips.push({ icon: 'scale', text: `${p.weightKg} ${t('کلو')}` })
  if (p.minWeightKg || p.maxWeightKg) chips.push({ icon: 'scale', text: `${p.minWeightKg ?? '؟'}–${p.maxWeightKg ?? '؟'} ${t('کلو')}` })
  if (p.milkLitresPerDay) chips.push({ icon: 'cup-water', text: `${p.milkLitresPerDay} ${t('لیٹر دودھ روزانہ')}` })
  if (p.isPregnant) chips.push({ icon: 'baby-carriage', text: t('گابھن') })
  if (p.isVaccinated != null) chips.push({ icon: 'needle', text: t(p.isVaccinated ? 'ویکسین لگی ہے' : 'ویکسین نہیں لگی') })
  if (p.price != null) {
    const unit = p.priceUnit ? ` ${t(priceUnitLabel(p.priceUnit, section))}` : ''
    chips.push({ icon: 'cash', text: `${formatPrice(p.price)}${unit}` })
  }
  if (p.purposes.length) chips.push({ icon: 'star-outline', text: p.purposes.map((x) => t(PURPOSE_LABEL[x])).join('، ') })
  if (p.frequency && p.frequency !== 'oneTime') chips.push({ icon: 'calendar-sync', text: t(FREQUENCY_LABEL[p.frequency]) })
  const place = locations.find((l) => l.id === p.locationId)
  if (place) chips.push({ icon: 'map-marker-outline', text: place.nameUr })

  const missing = p.missing.map((m) => t(MISSING_LABEL[m] ?? m))
  const speech = [
    `${t(INTRO[p.intent])}: ${chips.map((c) => c.text).join('، ') || t('کچھ واضح نہیں ہوا')}`,
    missing.length ? `${t('بتانا باقی ہے')}: ${missing.join('، ')}` : '',
    chips.length ? t('کیا یہ ٹھیک ہے؟') : '',
  ].filter(Boolean).join('۔ ')

  return { chips, missing, speech }
}

// ---- Selling ---------------------------------------------------------------------------------

export type SellVoicePatch = {
  section: Section; categoryId: number; purposes: Purpose[]; breed: string; gender: Gender; teeth: Teeth | null
  ageMonths: number | null; weightKg: string; milk: string; pregnant: boolean; vaccinated: boolean | null
  shares: 1 | 7; frequency: Frequency; price: string; onCall: boolean; priceUnit: PriceUnit | null
  quantity: string; quantityUnit: QuantityUnit | null; locationId: number | null
}

/** Ages the sell form offers as buttons; a spoken age snaps to the closest one when it is within 3 months. */
const AGE_BUTTONS = [6, 12, 18, 24, 36, 48, 60]

export function sellPatchFromVoice(p: VoiceParse, c: Category): SellVoicePatch {
  const livestock = c.section === 'livestock'
  const allowed = p.purposes.filter((x) => c.purposes.includes(x))
  const purposes = livestock ? (allowed.length ? allowed : c.purposes.length === 1 ? [c.purposes[0]] : []) : []
  const shares: 1 | 7 = p.shares === 7 && c.allowsQurbaniShares && purposes.includes('qurbani') ? 7 : 1
  const female = p.gender === 'female'
  const age = p.ageMonths != null ? (AGE_BUTTONS.find((a) => Math.abs(a - p.ageMonths!) <= 3) ?? p.ageMonths) : null

  return {
    section: c.section,
    categoryId: c.id,
    purposes,
    breed: livestock ? p.breed ?? '' : '',
    gender: livestock ? p.gender ?? 'unknown' : 'unknown',
    teeth: livestock ? p.teeth : null,
    ageMonths: livestock ? age : null,
    weightKg: livestock && p.weightKg ? String(p.weightKg) : '',
    milk: livestock && female && c.hasMilkProduction && p.milkLitresPerDay ? String(p.milkLitresPerDay) : '',
    pregnant: livestock && female && !!p.isPregnant,
    vaccinated: livestock ? p.isVaccinated : null,
    shares,
    frequency: p.frequency ?? 'oneTime',
    price: p.price != null ? String(p.price) : '',
    onCall: false,
    priceUnit: shares === 7 ? null : p.priceUnit && p.priceUnit !== 'perShare' && c.priceUnits.includes(p.priceUnit) ? p.priceUnit : c.defaultPriceUnit,
    quantity: shares === 7 ? '1' : p.quantity != null ? String(p.quantity) : livestock ? '1' : '',
    quantityUnit: p.quantityUnit && c.quantityUnits.includes(p.quantityUnit) ? p.quantityUnit : c.quantityUnits[0],
    locationId: p.locationId,
  }
}

/** Which step of the sell form to open on: skip what is already answered, but never skip photos. */
export function sellStartStep(patch: SellVoicePatch): number {
  const livestock = patch.section === 'livestock'
  if (livestock && patch.purposes.length === 0) return 1 // ask what it is for
  return livestock ? 2 : 1 // photos
}

// ---- Buying requirement -------------------------------------------------------------------------

export type RequestVoicePatch = {
  section: Section; categoryId: number; purpose: Purpose | null; quantity: string; unit: QuantityUnit
  minW: string; maxW: string; frequency: Frequency; price: string; priceUnit: PriceUnit | null; locationId: number | null
}

export function requestPatchFromVoice(p: VoiceParse, c: Category): RequestVoicePatch {
  const livestock = c.section === 'livestock'
  const purpose = livestock ? p.purposes.find((x) => c.purposes.includes(x)) ?? null : null
  const min = p.minWeightKg ?? p.weightKg
  const max = p.maxWeightKg ?? p.weightKg
  return {
    section: c.section,
    categoryId: c.id,
    purpose,
    quantity: p.quantity != null ? String(p.quantity) : '',
    unit: p.quantityUnit && c.quantityUnits.includes(p.quantityUnit) ? p.quantityUnit : c.quantityUnits[0],
    minW: livestock && min ? String(min) : '',
    maxW: livestock && max ? String(max) : '',
    frequency: p.frequency ?? 'oneTime',
    price: p.price != null ? String(p.price) : '',
    priceUnit: p.priceUnit && p.priceUnit !== 'perShare' && c.priceUnits.includes(p.priceUnit) ? p.priceUnit : c.defaultPriceUnit === 'perShare' ? 'perItem' : c.defaultPriceUnit,
    locationId: p.locationId,
  }
}

// ---- Searching ------------------------------------------------------------------------------------

/** The feed page that matches what was asked for, or null if nothing specific was said. */
export function searchTarget(p: VoiceParse): { section: string; category: string } | null {
  if (!p.categorySlug || !p.section) return null
  const section = p.purposes.includes('qurbani') ? 'qurbani' : p.purposes.includes('meatSupply') ? 'meat' : p.section
  return { section, category: p.categorySlug }
}
