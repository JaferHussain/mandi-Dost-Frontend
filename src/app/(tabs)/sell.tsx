import { useEffect, useMemo, useRef, useState } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View, type ScrollViewInstance } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { Image } from 'expo-image'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Button, Card, Field, Loading, Notice, Txt, type IconName } from '@/components/ui'
import { HeaderAssist } from '@/components/assist'
import { useListen } from '@/lib/listen'
import { takeVoiceDraft } from '@/lib/voice-draft'
import { sellPatchFromVoice, sellStartStep } from '@/lib/voice-apply'
import { RequireLogin } from '@/components/require-login'
import { Choice, ChoiceGroup, digitsOnly, PhotoGrid, pickPhotos, Tile, Toggle, toUpload, type Photo } from '@/components/sell-parts'
import {
  api, mediaUrl, type Category, type ListingDetail, type Media, type Frequency, type Gender, type ListingInput, type PriceUnit, type Purpose, type QuantityUnit, type Section, type Teeth,
} from '@/lib/api'
import { errorMessage } from '@/lib/errors'
import { FREQUENCY_LABEL, formatPrice, KG_PER_MAUND, priceUnitLabel, PURPOSE_LABEL, QUANTITY_LABEL, TEETH_LABEL } from '@/lib/format'
import { ANIMAL_ICONS } from '@/data/sections'
import { useSession } from '@/lib/session'
import { colors, radius } from '@/theme'
import { t } from '@/i18n'

// ---- Form state -------------------------------------------------------------

type Draft = {
  section: Section | null
  categoryId: number | null
  purposes: Purpose[]
  photos: Photo[]
  // livestock
  breed: string; gender: Gender; teeth: Teeth | null; ageMonths: number | null; weightKg: string
  milk: string; pregnant: boolean; vaccinated: boolean | null; health: string
  shares: 1 | 7; frequency: Frequency
  // crops / supplies
  variety: string; grade: string; harvestDate: string | null; pickup: boolean
  brand: string; condition: 'new' | 'used'
  // price and quantity
  price: string; onCall: boolean; priceUnit: PriceUnit | null; negotiable: boolean
  quantity: string; quantityUnit: QuantityUnit | null; bulk: boolean; minOrder: string; delivery: boolean
  // place and text
  locationId: number | null; area: string; title: string; description: string
}

const EMPTY: Draft = {
  section: null, categoryId: null, purposes: [], photos: [],
  breed: '', gender: 'unknown', teeth: null, ageMonths: null, weightKg: '', milk: '', pregnant: false, vaccinated: null, health: '',
  shares: 1, frequency: 'oneTime',
  variety: '', grade: '', harvestDate: null, pickup: true, brand: '', condition: 'new',
  price: '', onCall: false, priceUnit: null, negotiable: true, quantity: '1', quantityUnit: null, bulk: false, minOrder: '', delivery: false,
  locationId: null, area: '', title: '', description: '',
}

type StepId = 'category' | 'purpose' | 'photos' | 'details' | 'price' | 'location' | 'preview'

const STEP_TITLE: Record<StepId, string> = {
  category: 'کیا بیچنا ہے؟',
  purpose: 'کس کے لیے؟',
  photos: 'تصویریں',
  details: 'معلومات',
  price: 'قیمت اور مقدار',
  location: 'جگہ',
  preview: 'دیکھ لیں اور لگائیں',
}

const STEP_SPEECH: Record<StepId, string> = {
  category: 'پہلے بتائیں کیا بیچنا ہے۔ جانور، فصل یا زرعی سامان۔ پھر اس کی قسم چنیں۔',
  purpose: 'یہ جانور کس کے لیے ہے؟ ایک سے زیادہ بھی چن سکتے ہیں۔ مثلاً قربانی اور ہوٹل دونوں۔',
  photos: 'تصویریں لگائیں۔ جانور کی پوری تصویر، منہ اور دانت کی تصویر لیں۔ روشنی میں تصویر کھینچیں۔',
  details: 'جو معلوم ہو وہ چنیں۔ جو نہ پتا ہو چھوڑ دیں۔',
  price: 'قیمت لکھیں، یا قیمت بات چیت سے چنیں۔ پھر بتائیں قیمت کس حساب سے ہے۔',
  location: 'اپنا شہر چنیں اور گاؤں یا چک کا نام لکھیں۔',
  preview: 'اشتہار دیکھ لیں۔ ٹھیک ہو تو اشتہار لگائیں دبائیں۔',
}

const BREEDS: Record<string, string[]> = {
  cow: ['ساہیوال', 'چولستانی', 'ریڈ سندھی', 'تھرپارکر', 'دھنی', 'فریزین کراس', 'جرسی کراس', 'دیسی'],
  buffalo: ['نیلی راوی', 'کنڈی', 'دیسی'],
  goat: ['بیتل', 'ٹیڈی', 'ڈیرہ دین پناہ', 'کاموری', 'مکھی چینی', 'بربری', 'دیسی'],
  sheep: ['لوہی', 'کاجلی', 'تھلی', 'بلوچی دنبہ', 'دیسی'],
  camel: ['مریچہ', 'بریلا', 'براہوی', 'دیسی'],
  other: ['گدھا', 'گھوڑا', 'خچر'],
}

const AGES: { label: string; months: number }[] = [
  { label: '6 ماہ', months: 6 }, { label: '1 سال', months: 12 }, { label: 'ڈیڑھ سال', months: 18 }, { label: '2 سال', months: 24 },
  { label: '3 سال', months: 36 }, { label: '4 سال', months: 48 }, { label: '5 سال سے زیادہ', months: 60 },
]

const SECTION_TILES: { id: Section; label: string; sub: string; icon: IconName; color: string; bg: string }[] = [
  { id: 'livestock', label: 'جانور', sub: 'گائے، بکرا، بھینس…', icon: 'cow', color: '#9a3412', bg: '#ffedd5' },
  { id: 'crops', label: 'فصل', sub: 'گندم، کپاس، سبزی…', icon: 'sprout', color: '#854d0e', bg: '#fef9c3' },
  { id: 'supplies', label: 'زرعی سامان', sub: 'بیج، کھاد، مشینری…', icon: 'tractor-variant', color: '#1e3a8a', bg: '#dbeafe' },
]

/** First day of the month, n months ago, as YYYY-MM-DD (harvest date chips). */
const monthsAgo = (n: number) => {
  const d = new Date()
  d.setDate(1)
  d.setMonth(d.getMonth() - n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

const num = (s: string) => (s.trim() === '' ? null : Number(s))

/** Fill the form from an existing listing (editing). */
function draftFrom(l: ListingDetail): Draft {
  const shares = l.qurbani?.totalShares === 7 ? 7 : 1
  const a = l.livestock
  return {
    ...EMPTY,
    section: l.section, categoryId: l.category.id, purposes: l.purposes, photos: [],
    breed: a?.breed ?? '', gender: a?.gender ?? 'unknown', teeth: a?.teeth ?? null, ageMonths: a?.ageMonths ?? null,
    weightKg: a?.liveWeightKg ? String(a.liveWeightKg) : '', milk: a?.milkLitresPerDay ? String(a.milkLitresPerDay) : '',
    pregnant: !!a?.isPregnant, vaccinated: a?.isVaccinated ?? null, health: a?.healthNotes ?? '',
    shares, frequency: l.meatSupply?.frequency ?? 'oneTime',
    variety: l.crop?.variety ?? '', grade: l.crop?.grade ?? '', harvestDate: l.crop?.harvestDate ?? null, pickup: l.crop?.pickupAvailable ?? true,
    brand: l.supply?.brand ?? '', condition: l.supply?.condition ?? 'new',
    price: l.price != null ? String(shares === 7 ? l.qurbani?.pricePerShare ?? l.price : l.price) : '', onCall: l.price == null,
    priceUnit: l.priceUnit === 'perShare' ? null : l.priceUnit, negotiable: l.isNegotiable,
    quantity: String(l.quantity), quantityUnit: l.quantityUnit, bulk: l.isBulkAvailable,
    minOrder: l.minOrderQuantity ? String(l.minOrderQuantity) : '', delivery: l.deliveryAvailable,
    locationId: l.location.id, area: l.areaText ?? '', title: l.title, description: l.description ?? '',
  }
}

// ---- Screen -------------------------------------------------------------------

export default function Sell() {
  const insets = useSafeAreaInsets()
  const { user, location, locations } = useSession()
  const [categories, setCategories] = useState<Category[] | null>(null)
  const [draft, setDraft] = useState<Draft>(EMPTY)
  const [stepIndex, setStepIndex] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const scroll = useRef<ScrollViewInstance>(null)
  // Editing an existing listing: ?edit=<id>
  const { edit, weight: weightParam, voice } = useLocalSearchParams<{ edit?: string; weight?: string; voice?: string }>()
  const [voiceFilled, setVoiceFilled] = useState(false)
  const editId = edit ? Number(edit) : null
  const [editing, setEditing] = useState<ListingDetail | null>(null)
  const [keptPhotos, setKeptPhotos] = useState<Media[]>([])

  useEffect(() => {
    api.categories().then(setCategories).catch((e) => setError(errorMessage(e)))
  }, [])

  useEffect(() => {
    if (!editId) return
    api.listing(editId).then((l) => {
      setEditing(l)
      setKeptPhotos(l.media)
      setDraft(draftFrom(l))
      setStepIndex(0)
    }, (e) => setError(errorMessage(e)))
  }, [editId])

  // Sent here by the voice assistant: fill the form with what was understood. The user still checks every step and presses publish.
  useEffect(() => {
    if (!voice || !categories) return
    const v = takeVoiceDraft()
    router.setParams({ voice: '' })
    const c = v && categories.find((x) => x.id === v.categoryId)
    if (!v || !c) return
    const patch = sellPatchFromVoice(v, c)
    /* eslint-disable react-hooks/set-state-in-effect */
    setEditing(null)
    setKeptPhotos([])
    if (editId) router.setParams({ edit: '' })
    setDraft({ ...EMPTY, ...patch })
    setStepIndex(sellStartStep(patch))
    setVoiceFilled(true)
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [voice, categories, editId])

  // Coming back from the tape-measure calculator with an estimated weight
  useEffect(() => {
    if (!weightParam) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraft((d) => ({ ...d, weightKg: weightParam }))
    router.setParams({ weight: '' })
  }, [weightParam])

  const photoCount = keptPhotos.length + draft.photos.length
  const stopEditing = () => {
    setEditing(null)
    setKeptPhotos([])
    setDraft(EMPTY)
    setStepIndex(0)
    router.setParams({ edit: '' })
  }

  const category = categories?.find((c) => c.id === draft.categoryId) ?? null
  const steps = useMemo<StepId[]>(
    () => ['category', ...(draft.section === 'livestock' ? (['purpose'] as StepId[]) : []), 'photos', 'details', 'price', 'location', 'preview'],
    [draft.section],
  )
  const step = steps[Math.min(stepIndex, steps.length - 1)]
  useListen(`${t(STEP_TITLE[step])}۔ ${t(STEP_SPEECH[step])}`)
  const set = (patch: Partial<Draft>) => {
    setError(null)
    setDraft((d) => ({ ...d, ...patch }))
  }

  if (!user) {
    return (
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: insets.top + 12, gap: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Txt bold size={24} style={{ flex: 1 }}>بیچیں</Txt>
          <HeaderAssist fallback="بیچیں" />
        </View>
        <RequireLogin icon="storefront-outline" title="اشتہار لگانے کے لیے لاگ اِن کریں" text="ایک ہی اکاؤنٹ سے خرید بھی سکتے ہیں اور بیچ بھی سکتے ہیں" />
      </ScrollView>
    )
  }
  if (!categories) return <View style={{ flex: 1, paddingTop: insets.top + 40 }}>{error ? <Notice tone="error" text={error} /> : <Loading />}</View>

  const chooseCategory = (c: Category) => {
    // Sensible defaults for the chosen category
    set({
      categoryId: c.id,
      purposes: c.purposes.length === 1 ? [c.purposes[0]] : draft.categoryId === c.id ? draft.purposes : [],
      priceUnit: c.defaultPriceUnit,
      quantityUnit: c.quantityUnits[0],
      quantity: c.section === 'livestock' ? '1' : '',
      breed: draft.categoryId === c.id ? draft.breed : '',
      shares: 1,
    })
  }

  // ---- Validation per step ----
  const problem = (s: StepId): string | null => {
    switch (s) {
      case 'category': return category ? null : 'قسم چنیں'
      case 'purpose': return draft.purposes.length ? null : 'کم از کم ایک چنیں'
      case 'photos': return draft.section === 'livestock' && photoCount === 0 ? 'جانور کی کم از کم ایک تصویر لگائیں' : null
      case 'price': {
        if (!draft.onCall && !(Number(draft.price) > 0)) return 'قیمت لکھیں یا "قیمت بات چیت سے" چنیں'
        if (!(Number(draft.quantity) > 0)) return 'مقدار لکھیں'
        if (draft.minOrder && Number(draft.minOrder) > Number(draft.quantity)) return 'کم از کم خریداری کل مقدار سے زیادہ نہیں ہو سکتی'
        return null
      }
      case 'location': return draft.locationId ?? location?.id ? null : 'شہر چنیں'
      case 'preview': return suggestedTitle().trim().length >= 3 || draft.title.trim().length >= 3 ? null : 'عنوان لکھیں'
      default: return null
    }
  }

  const next = () => {
    const p = problem(step)
    if (p) return setError(t(p))
    setError(null)
    setStepIndex((i) => Math.min(i + 1, steps.length - 1))
    scroll.current?.scrollTo({ y: 0, animated: false })
  }
  const back = () => {
    setError(null)
    setStepIndex((i) => Math.max(i - 1, 0))
    scroll.current?.scrollTo({ y: 0, animated: false })
  }

  function suggestedTitle() {
    if (!category) return ''
    if (category.section === 'livestock') {
      // "گائے / بیل" → گائے for a female, بیل for a male, both when unknown
      const parts = category.nameUr.split(' / ')
      const animal = parts.length > 1 && draft.gender !== 'unknown' ? parts[draft.gender === 'female' ? 0 : 1] : category.nameUr
      const name = draft.breed ? `${draft.breed} ${animal}` : animal
      return [name, draft.teeth ? t(TEETH_LABEL[draft.teeth]).split(' (')[0] : null, draft.weightKg ? `${draft.weightKg} ${t('کلو')}` : null]
        .filter(Boolean).join('، ')
    }
    return [category.nameUr, draft.variety || null, draft.quantity ? `${draft.quantity} ${t(QUANTITY_LABEL[draft.quantityUnit ?? 'piece'])}` : null]
      .filter(Boolean).join('، ')
  }

  const toInput = (): ListingInput => {
    const c = category!
    const input: ListingInput = {
      categoryId: c.id,
      locationId: (draft.locationId ?? location?.id)!,
      title: (draft.title.trim() || suggestedTitle()).slice(0, 120),
      description: draft.description.trim() || undefined,
      areaText: draft.area.trim() || undefined,
      price: draft.onCall ? null : Number(draft.price),
      priceUnit: draft.shares === 7 ? 'perShare' : draft.priceUnit ?? c.defaultPriceUnit,
      isNegotiable: draft.negotiable,
      quantity: Number(draft.quantity) || 1,
      quantityUnit: draft.quantityUnit ?? c.quantityUnits[0],
      minOrderQuantity: num(draft.minOrder),
      isBulkAvailable: draft.bulk,
      deliveryAvailable: draft.delivery,
    }
    if (c.section === 'livestock') {
      const female = draft.gender === 'female'
      input.purposes = draft.purposes
      input.livestock = {
        breed: draft.breed.trim() || undefined,
        gender: draft.gender,
        ageMonths: draft.ageMonths,
        teeth: draft.teeth,
        liveWeightKg: num(draft.weightKg),
        isVaccinated: draft.vaccinated,
        // Only send what applies – the server rejects milk for males, pregnancy for non-females.
        isPregnant: female && draft.pregnant ? true : null,
        milkLitresPerDay: female && c.hasMilkProduction ? num(draft.milk) : null,
        healthNotes: draft.health.trim() || undefined,
      }
      if (draft.purposes.includes('qurbani')) {
        input.qurbani = { totalShares: draft.shares, pricePerShare: draft.shares === 7 && !draft.onCall ? Number(draft.price) : null }
      }
      if (draft.purposes.includes('meatSupply')) input.meatSupply = { frequency: draft.frequency }
    } else if (c.section === 'crops') {
      input.crop = { variety: draft.variety.trim() || undefined, grade: draft.grade || undefined, harvestDate: draft.harvestDate, pickupAvailable: draft.pickup }
    } else {
      input.supply = { brand: draft.brand.trim() || undefined, condition: draft.condition }
    }
    return input
  }

  /** Save changes to an existing listing: details, removed photos, new photos; re-publish a draft/expired one. */
  const saveEdit = async (l: ListingDetail) => {
    try {
      setBusy(t('اشتہار بدلا جا رہا ہے…'))
      await api.updateListing(l.id, toInput())
      for (const m of l.media.filter((m) => !keptPhotos.some((k) => k.id === m.id))) await api.deletePhoto(l.id, m.id)
      for (let i = 0; i < draft.photos.length; i++) {
        setBusy(`${t('تصویر')} ${i + 1} / ${draft.photos.length} ${t('بھیجی جا رہی ہے…')}`)
        await api.uploadPhoto(l.id, await toUpload(draft.photos[i], i))
      }
      if (l.status === 'draft' || l.status === 'expired') await api.publishListing(l.id)
      stopEditing()
      router.push({ pathname: '/listing/[id]', params: { id: String(l.id) } })
    } catch (e) {
      setError(t(errorMessage(e)))
    } finally {
      setBusy(null)
    }
  }

  const publish = async () => {
    const p = problem('preview')
    if (p) return setError(t(p))
    setError(null)
    if (editing) return saveEdit(editing)
    let createdId: number | null = null
    try {
      setBusy(t('اشتہار بن رہا ہے…'))
      const created = await api.createListing(toInput())
      createdId = created.id
      for (let i = 0; i < draft.photos.length; i++) {
        setBusy(`${t('تصویر')} ${i + 1} / ${draft.photos.length} ${t('بھیجی جا رہی ہے…')}`)
        await api.uploadPhoto(created.id, await toUpload(draft.photos[i], i))
      }
      setBusy(t('اشتہار لگ رہا ہے…'))
      await api.publishListing(created.id)
      setDraft(EMPTY)
      setStepIndex(0)
      setVoiceFilled(false)
      router.push({ pathname: '/listing/[id]', params: { id: String(created.id) } })
    } catch (e) {
      // If the listing was created but a photo or publishing failed, it stays as a draft in "My listings".
      setError(createdId ? `${t(errorMessage(e))}۔ ${t('اشتہار "میرے اشتہار" میں محفوظ ہے، وہاں سے دوبارہ لگائیں')}` : t(errorMessage(e)))
    } finally {
      setBusy(null)
    }
  }

  // ---- Render ----
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Txt size={13} color={colors.muted}>{`${t('قدم')} ${stepIndex + 1} / ${steps.length}`}</Txt>
            <Txt bold size={21}>{STEP_TITLE[step]}</Txt>
            {editing && <Txt size={13} color={colors.earth} numberOfLines={1}>{`${t('بدل رہے ہیں')}: ${editing.title}`}</Txt>}
          </View>
          {editing && <Button label="چھوڑیں" icon="close" variant="outline" onPress={stopEditing} />}
          <HeaderAssist fallback={STEP_TITLE[step]} />
        </View>
        <View style={styles.progress}>
          <View style={[styles.progressFill, { width: `${((stepIndex + 1) / steps.length) * 100}%` }]} />
        </View>
      </View>

      <ScrollView ref={scroll} contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
        {voiceFilled && (
          <Notice tone="success" icon="microphone" text="آپ کی آواز سے معلومات بھر دی گئی ہیں۔ ہر قدم پر دیکھ لیں اور ٹھیک کر لیں۔ اشتہار تب ہی لگے گا جب آپ آخر میں 'اشتہار لگائیں' دبائیں گے" />
        )}
        {step === 'category' && (
          <>
            <View style={styles.grid}>
              {SECTION_TILES.map((s) => (
                <Tile key={s.id} label={s.label} sub={s.sub} icon={s.icon} color={s.color} bg={s.bg} on={draft.section === s.id}
                  onPress={() => set({ section: s.id, categoryId: draft.section === s.id ? draft.categoryId : null, purposes: draft.section === s.id ? draft.purposes : [] })} />
              ))}
            </View>
            {draft.section && (
              <>
                <Txt bold size={17}>قسم چنیں</Txt>
                <View style={styles.grid}>
                  {categories.filter((c) => c.section === draft.section).map((c) => (
                    <Tile key={c.id} label={c.nameUr} on={c.id === draft.categoryId} onPress={() => chooseCategory(c)}
                      icon={(c.section === 'livestock' ? ANIMAL_ICONS[c.slug] : (c.iconKey as IconName)) ?? 'tag-outline'} />
                  ))}
                </View>
              </>
            )}
          </>
        )}

        {step === 'purpose' && category && (
          <>
            <Txt size={15} color={colors.muted}>ایک سے زیادہ چن سکتے ہیں۔ ایک ہی اشتہار ہر چنے ہوئے حصے میں نظر آئے گا</Txt>
            <View style={{ gap: 10 }}>
              {category.purposes.map((p) => (
                <Choice key={p} wide label={PURPOSE_LABEL[p]} icon={PURPOSE_ICON[p]} on={draft.purposes.includes(p)}
                  onPress={() => set({ purposes: draft.purposes.includes(p) ? draft.purposes.filter((x) => x !== p) : [...draft.purposes, p] })} />
              ))}
            </View>
          </>
        )}

        {step === 'photos' && (
          <>
            <Txt size={15} color={colors.muted}>
              {draft.section === 'livestock' ? 'پوری تصویر سائیڈ سے، منہ اور دانت کی تصویر۔ دن کی روشنی میں' : 'صاف تصویر سے خریدار جلدی رابطہ کرتے ہیں'}
            </Txt>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Button label="کیمرہ" icon="camera" style={{ flex: 1 }} onPress={async () => set({ photos: [...draft.photos, ...(await pickPhotos('camera', 8 - photoCount))] })} />
              <Button label="گیلری" icon="image-multiple" variant="outline" style={{ flex: 1 }} onPress={async () => set({ photos: [...draft.photos, ...(await pickPhotos('library', 8 - photoCount))] })} />
            </View>
            {keptPhotos.length > 0 && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {keptPhotos.map((m) => (
                  <View key={m.id} style={styles.kept}>
                    <Image source={mediaUrl(m.url)} style={StyleSheet.absoluteFill} contentFit="cover" />
                    <Button label="" icon="close" variant="danger" style={styles.keptRemove} onPress={() => setKeptPhotos(keptPhotos.filter((k) => k.id !== m.id))} />
                  </View>
                ))}
              </View>
            )}
            <PhotoGrid photos={draft.photos} onRemove={(i) => set({ photos: draft.photos.filter((_, j) => j !== i) })} />
            <Txt size={13} color={colors.muted}>{`${photoCount} / 8 ${t('تصویریں')}`}</Txt>
          </>
        )}

        {step === 'details' && category && (
          <DetailsStep draft={draft} set={set} category={category} />
        )}

        {step === 'price' && category && (
          <>
            {draft.purposes.includes('qurbani') && category.allowsQurbaniShares && (
              <ChoiceGroup label="قربانی کیسے بیچنی ہے؟">
                <Choice label="پورا جانور" icon="cow" on={draft.shares === 1} onPress={() => set({ shares: 1 })} />
                <Choice label="سات حصے" icon="account-group-outline" on={draft.shares === 7} onPress={() => set({ shares: 7, quantity: '1' })} />
              </ChoiceGroup>
            )}
            <Toggle label="قیمت بات چیت سے" icon="phone-in-talk-outline" value={draft.onCall} onChange={(v) => set({ onCall: v })} />
            {!draft.onCall && (
              <>
                <Field label={draft.shares === 7 ? 'ایک حصے کی قیمت (روپے)' : 'قیمت (روپے)'} icon="cash" ltr keyboardType="number-pad" placeholder="250000"
                  value={draft.price} onChangeText={(v) => set({ price: digitsOnly(v) })} maxLength={10} />
                {Number(draft.price) > 0 && <Txt bold size={16} color={colors.brand700}>{formatPrice(Number(draft.price))}</Txt>}
                {draft.shares !== 7 && (
                  <ChoiceGroup label="قیمت کس حساب سے؟">
                    {category.priceUnits.filter((u) => u !== 'perShare').map((u) => (
                      <Choice key={u} label={priceUnitLabel(u, category.section)} on={(draft.priceUnit ?? category.defaultPriceUnit) === u} onPress={() => set({ priceUnit: u })} />
                    ))}
                  </ChoiceGroup>
                )}
                <Toggle label="قیمت میں کمی بیشی ہو سکتی ہے" icon="handshake-outline" value={draft.negotiable} onChange={(v) => set({ negotiable: v })} />
              </>
            )}
            {draft.shares !== 7 && (
              <>
                <Field label={category.section === 'livestock' ? 'کتنے جانور؟' : 'کل مقدار'} icon="package-variant" ltr keyboardType="decimal-pad"
                  value={draft.quantity} onChangeText={(v) => set({ quantity: digitsOnly(v, category.section !== 'livestock') })} maxLength={9} />
                {category.quantityUnits.length > 1 && (
                  <ChoiceGroup label="اکائی">
                    {category.quantityUnits.map((u) => (
                      <Choice key={u} label={QUANTITY_LABEL[u]} on={(draft.quantityUnit ?? category.quantityUnits[0]) === u} onPress={() => set({ quantityUnit: u })} />
                    ))}
                  </ChoiceGroup>
                )}
                <Toggle label="تھوک میں بھی دستیاب" icon="warehouse" value={draft.bulk} onChange={(v) => set({ bulk: v })} />
                {draft.bulk && (
                  <Field label="کم از کم کتنا خریدنا ہوگا؟ (اختیاری)" icon="package-down" ltr keyboardType="decimal-pad"
                    value={draft.minOrder} onChangeText={(v) => set({ minOrder: digitsOnly(v, true) })} maxLength={9} />
                )}
              </>
            )}
            <Toggle label="ڈیلیوری ہو سکتی ہے" icon="truck-delivery-outline" value={draft.delivery} onChange={(v) => set({ delivery: v })} />
          </>
        )}

        {step === 'location' && (
          <>
            <ChoiceGroup label="شہر">
              {locations.map((l) => (
                <Choice key={l.id} label={l.nameUr} icon="map-marker-outline" on={(draft.locationId ?? location?.id) === l.id} onPress={() => set({ locationId: l.id })} />
              ))}
            </ChoiceGroup>
            {locations.length === 0 && <Notice tone="error" text="شہروں کی فہرست نہیں ملی۔ انٹرنیٹ چیک کریں" />}
            <Field label="گاؤں / چک / محلہ (اختیاری)" icon="home-map-marker" placeholder="مثلاً: چک 12 ایم" value={draft.area} onChangeText={(v) => set({ area: v })} maxLength={120} />
          </>
        )}

        {step === 'preview' && category && (
          <>
            <Field label="عنوان" icon="format-title" placeholder={suggestedTitle()} value={draft.title} onChangeText={(v) => set({ title: v })} maxLength={120} />
            <Txt size={13} color={colors.muted}>خالی چھوڑیں تو اوپر والا عنوان لگے گا</Txt>
            <Field label="مزید تفصیل (اختیاری)" icon="text" placeholder="مثلاً: گھر کا پلا ہوا، شریف جانور" value={draft.description} onChangeText={(v) => set({ description: v })} multiline maxLength={1500} />
            <Card style={{ gap: 6 }}>
              <Txt bold size={18}>{draft.title.trim() || suggestedTitle()}</Txt>
              <Txt bold size={20} color={colors.brand700}>
                {draft.onCall ? formatPrice(null) : `${formatPrice(Number(draft.price))} ${t(priceUnitLabel(draft.shares === 7 ? 'perShare' : draft.priceUnit ?? category.defaultPriceUnit, category.section))}`}
              </Txt>
              {draft.purposes.length > 0 && <Txt size={14}>{draft.purposes.map((p) => t(PURPOSE_LABEL[p])).join('، ')}</Txt>}
              <Txt size={14} color={colors.muted}>
                {[locations.find((l) => l.id === (draft.locationId ?? location?.id))?.nameUr, draft.area, `${photoCount} ${t('تصویریں')}`].filter(Boolean).join(' · ')}
              </Txt>
            </Card>
            <Notice text="اشتہار 60 دن لگا رہے گا۔ بک جائے تو میرے اشتہار سے بک گیا دبا دیں" />
          </>
        )}

        {error && <Notice tone="error" text={error} />}
        {busy && <Notice tone="success" icon="progress-upload" text={busy} />}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: 10 }]}>
        {stepIndex > 0 && <Button label="پیچھے" icon="arrow-right" variant="outline" style={{ flex: 1 }} onPress={back} disabled={!!busy} />}
        {step === 'preview' ? (
          <Button label={editing ? 'تبدیلی محفوظ کریں' : 'اشتہار لگائیں'} icon={editing ? 'content-save-outline' : 'rocket-launch-outline'} style={{ flex: 2 }} onPress={publish} loading={!!busy} />
        ) : (
          <Button label="آگے" icon="arrow-left" style={{ flex: 2 }} onPress={next} />
        )}
      </View>
    </KeyboardAvoidingView>
  )
}

const PURPOSE_ICON: Record<Purpose, IconName> = {
  qurbani: 'star-crescent', meatSupply: 'silverware-fork-knife', dairy: 'cup-water', breeding: 'dna', general: 'barn',
}

/** Step 4: only the questions that make sense for this category and purpose. */
function DetailsStep({ draft, set, category }: { draft: Draft; set: (p: Partial<Draft>) => void; category: Category }) {
  if (category.section === 'crops') {
    return (
      <>
        <Field label="قسم / ورائٹی (اختیاری)" icon="sprout" placeholder="مثلاً: اکبر 2019، سپر باسمتی" value={draft.variety} onChangeText={(v) => set({ variety: v })} maxLength={48} />
        <ChoiceGroup label="معیار">
          {['اول', 'دوم', 'سوم'].map((g) => <Choice key={g} label={g} on={draft.grade === g} onPress={() => set({ grade: draft.grade === g ? '' : g })} />)}
        </ChoiceGroup>
        <ChoiceGroup label="کٹائی کب ہوئی؟">
          {[{ l: 'اس مہینے', n: 0 }, { l: 'پچھلے مہینے', n: 1 }, { l: 'دو مہینے پہلے', n: 2 }, { l: 'اس سے پہلے', n: 4 }].map((o) => (
            <Choice key={o.l} label={o.l} on={draft.harvestDate === monthsAgo(o.n)} onPress={() => set({ harvestDate: draft.harvestDate === monthsAgo(o.n) ? null : monthsAgo(o.n) })} />
          ))}
        </ChoiceGroup>
        <Toggle label="خریدار خود اٹھا سکتا ہے" icon="hand-extended-outline" value={draft.pickup} onChange={(v) => set({ pickup: v })} />
      </>
    )
  }
  if (category.section === 'supplies') {
    return (
      <>
        <Field label="برانڈ / کمپنی (اختیاری)" icon="tag-outline" value={draft.brand} onChangeText={(v) => set({ brand: v })} maxLength={48} />
        <ChoiceGroup label="حالت">
          <Choice label="نیا" icon="new-box" on={draft.condition === 'new'} onPress={() => set({ condition: 'new' })} />
          <Choice label="پرانا / استعمال شدہ" icon="history" on={draft.condition === 'used'} onPress={() => set({ condition: 'used' })} />
        </ChoiceGroup>
      </>
    )
  }

  const female = draft.gender === 'female'
  const weight = Number(draft.weightKg)
  return (
    <>
      <ChoiceGroup label="نسل" hint="نہ ہو تو نیچے لکھ دیں">
        {(BREEDS[category.slug] ?? []).map((b) => <Choice key={b} label={b} on={draft.breed === b} onPress={() => set({ breed: draft.breed === b ? '' : b })} />)}
      </ChoiceGroup>
      <Field label="یا نسل لکھیں" icon="pencil-outline" value={draft.breed} onChangeText={(v) => set({ breed: v })} maxLength={48} />

      <ChoiceGroup label="نر یا مادہ؟">
        <Choice label="نر" icon="gender-male" on={draft.gender === 'male'} onPress={() => set({ gender: draft.gender === 'male' ? 'unknown' : 'male', milk: '', pregnant: false })} />
        <Choice label="مادہ" icon="gender-female" on={female} onPress={() => set({ gender: female ? 'unknown' : 'female' })} />
      </ChoiceGroup>

      <ChoiceGroup label="دانت">
        {(Object.keys(TEETH_LABEL) as Teeth[]).map((k) => (
          <Choice key={k} label={TEETH_LABEL[k]} on={draft.teeth === k} onPress={() => set({ teeth: draft.teeth === k ? null : k })} />
        ))}
      </ChoiceGroup>

      <ChoiceGroup label="عمر">
        {AGES.map((a) => <Choice key={a.months} label={a.label} on={draft.ageMonths === a.months} onPress={() => set({ ageMonths: draft.ageMonths === a.months ? null : a.months })} />)}
      </ChoiceGroup>

      <Field label="زندہ وزن (کلو) – اندازہ بھی چلے گا" icon="scale" ltr keyboardType="number-pad" placeholder="320"
        value={draft.weightKg} onChangeText={(v) => set({ weightKg: digitsOnly(v) })} maxLength={4} />
      {weight > 0 && <Txt size={14} color={colors.muted}>{`= ${(weight / KG_PER_MAUND).toFixed(1)} ${t('من')}`}</Txt>}
      <Button label="وزن معلوم نہیں؟ فیتے سے اندازہ لگائیں" icon="tape-measure" variant="soft"
        onPress={() => router.push({ pathname: '/tools/weight', params: { slug: category.slug } })} />

      {female && category.hasMilkProduction && (
        <>
          <Field label="روزانہ دودھ (لیٹر)" icon="cup-water" ltr keyboardType="decimal-pad" value={draft.milk} onChangeText={(v) => set({ milk: digitsOnly(v, true) })} maxLength={4} />
          <Toggle label="گابھن / حاملہ ہے" icon="baby-carriage" value={draft.pregnant} onChange={(v) => set({ pregnant: v })} />
        </>
      )}

      <ChoiceGroup label="ویکسین لگی ہے؟">
        <Choice label="ہاں" on={draft.vaccinated === true} onPress={() => set({ vaccinated: draft.vaccinated === true ? null : true })} />
        <Choice label="نہیں" on={draft.vaccinated === false} onPress={() => set({ vaccinated: draft.vaccinated === false ? null : false })} />
      </ChoiceGroup>

      {draft.purposes.includes('meatSupply') && (
        <ChoiceGroup label="ہوٹل / قصائی کو کتنی بار سپلائی؟">
          {(Object.keys(FREQUENCY_LABEL) as Frequency[]).map((f) => (
            <Choice key={f} label={FREQUENCY_LABEL[f]} on={draft.frequency === f} onPress={() => set({ frequency: f })} />
          ))}
        </ChoiceGroup>
      )}

      <Field label="صحت کے بارے میں (اختیاری)" icon="heart-pulse" placeholder="مثلاً: بالکل تندرست، کوئی بیماری نہیں" value={draft.health} onChangeText={(v) => set({ health: v })} maxLength={300} />
    </>
  )
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingBottom: 10, backgroundColor: colors.cream, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 8 },
  kept: { width: 104, height: 104, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.sand },
  keptRemove: { position: 'absolute', top: 4, end: 4, minHeight: 34, width: 34, paddingHorizontal: 0, borderRadius: 17 },
  progress: { height: 8, borderRadius: 4, backgroundColor: colors.sand, overflow: 'hidden' },
  progressFill: { height: 8, borderRadius: 4, backgroundColor: colors.brand600 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  footer: {
    flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 10,
    backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.border, borderRadius: radius.sm,
  },
})
