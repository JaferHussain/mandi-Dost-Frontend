import { useEffect, useState } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { Button, Field, Loading, Notice, SpeakButton, TopBar, Txt, type IconName } from '@/components/ui'
import { RequireLogin } from '@/components/require-login'
import { Choice, ChoiceGroup, digitsOnly, Tile, Toggle } from '@/components/sell-parts'
import { api, type Business, type Category, type Frequency, type PriceUnit, type Purpose, type QuantityUnit, type Section } from '@/lib/api'
import { errorMessage } from '@/lib/errors'
import { formatPrice, FREQUENCY_LABEL, priceUnitLabel, PURPOSE_LABEL, QUANTITY_LABEL } from '@/lib/format'
import { ANIMAL_ICONS } from '@/data/sections'
import { useSession } from '@/lib/session'
import { colors } from '@/theme'
import { t } from '@/i18n'

const close = () => (router.canGoBack() ? router.back() : router.replace('/'))

/** YYYY-MM-DD, n days from today (needed-by chips). */
const inDays = (n: number) => {
  const d = new Date(Date.now() + n * 86_400_000)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const NEEDED_BY = [
  { label: 'اسی ہفتے', days: 7 },
  { label: 'دو ہفتے میں', days: 14 },
  { label: 'ایک مہینے میں', days: 30 },
]

const SPEECH = 'یہاں بتائیں آپ کو کیا چاہیے، کتنا چاہیے، اور کتنی بار چاہیے۔ بیچنے والے آپ کو پیشکش بھیجیں گے اور آپ ان کو کال کر سکیں گے۔'

export default function NewRequest() {
  const params = useLocalSearchParams<{ section?: string; purpose?: string }>()
  const { user, location, locations } = useSession()
  const [categories, setCategories] = useState<Category[] | null>(null)
  const [business, setBusiness] = useState<Business | null>(null)
  const [section, setSection] = useState<Section | null>((params.section as Section) || null)
  const [categoryId, setCategoryId] = useState<number | null>(null)
  const [purpose, setPurpose] = useState<Purpose | null>((params.purpose as Purpose) || null)
  const [quantity, setQuantity] = useState('')
  const [unit, setUnit] = useState<QuantityUnit | null>(null)
  const [minW, setMinW] = useState('')
  const [maxW, setMaxW] = useState('')
  const [frequency, setFrequency] = useState<Frequency>('oneTime')
  const [price, setPrice] = useState('')
  const [priceUnit, setPriceUnit] = useState<PriceUnit | null>(null)
  const [neededBy, setNeededBy] = useState<string | null>(null)
  const [locationId, setLocationId] = useState<number | null>(null)
  const [delivery, setDelivery] = useState(false)
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api.categories().then(setCategories, (e) => setError(errorMessage(e)))
    if (user) api.myBusiness().then(setBusiness).catch(() => {})
  }, [user])

  if (!user) {
    return (
      <View style={{ flex: 1 }}>
        <TopBar title="اپنی ضرورت بتائیں" onBack={close} />
        <RequireLogin icon="bullhorn-outline" title="ضرورت لگانے کے لیے لاگ اِن کریں" text="بیچنے والے آپ کو پیشکش بھیجیں گے" />
      </View>
    )
  }
  if (!categories) return <View style={{ flex: 1 }}><TopBar title="اپنی ضرورت بتائیں" onBack={close} /><Loading /></View>

  const category = categories.find((c) => c.id === categoryId) ?? null
  const choices = categories.filter((c) => c.section === section && (!purpose || c.section !== 'livestock' || c.purposes.includes(purpose)))
  const city = locationId ?? business?.location.id ?? location?.id ?? null

  const pick = (c: Category) => {
    setCategoryId(c.id)
    setUnit(c.quantityUnits[0])
    setPriceUnit(c.defaultPriceUnit === 'perShare' ? 'perItem' : c.defaultPriceUnit)
    if (c.section !== 'livestock') setPurpose(null)
    else if (purpose && !c.purposes.includes(purpose)) setPurpose(null)
    setError(null)
  }

  const submit = async () => {
    if (!category) return setError(t('کیا چاہیے؟ قسم چنیں'))
    if (!(Number(quantity) > 0)) return setError(t('کتنا چاہیے؟ مقدار لکھیں'))
    if (minW && maxW && Number(minW) > Number(maxW)) return setError(t('کم وزن زیادہ وزن سے بڑا نہیں ہو سکتا'))
    if (!city) return setError(t('شہر چنیں'))
    setBusy(true)
    setError(null)
    try {
      const created = await api.createRequest({
        categoryId: category.id,
        purpose: category.section === 'livestock' ? purpose : null,
        locationId: city,
        quantity: Number(quantity),
        quantityUnit: unit ?? category.quantityUnits[0],
        frequency,
        minWeightKg: category.section === 'livestock' && minW ? Number(minW) : null,
        maxWeightKg: category.section === 'livestock' && maxW ? Number(maxW) : null,
        targetPrice: price ? Number(price) : null,
        targetPriceUnit: price ? priceUnit ?? 'perItem' : null,
        neededBy,
        deliveryNeeded: delivery,
        notes: notes.trim() || undefined,
      })
      router.replace({ pathname: '/request/[id]', params: { id: String(created.id) } })
    } catch (e) {
      setError(t(errorMessage(e)))
    } finally {
      setBusy(false)
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <TopBar title="اپنی ضرورت بتائیں" onBack={close} right={<SpeakButton text={SPEECH} />} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        {!business && params.purpose === 'meatSupply' && (
          <Notice icon="store-outline" text="ہوٹل یا دکان ہے؟ پروفائل میں اپنے کاروبار کا نام لکھیں، بیچنے والے زیادہ بھروسہ کرتے ہیں" />
        )}

        {!params.section && (
          <ChoiceGroup label="کیا چاہیے؟">
            <Choice label="جانور" icon="cow" on={section === 'livestock'} onPress={() => { setSection('livestock'); setCategoryId(null) }} />
            <Choice label="فصل" icon="sprout" on={section === 'crops'} onPress={() => { setSection('crops'); setCategoryId(null); setPurpose(null) }} />
            <Choice label="زرعی سامان" icon="tractor-variant" on={section === 'supplies'} onPress={() => { setSection('supplies'); setCategoryId(null); setPurpose(null) }} />
          </ChoiceGroup>
        )}

        {section && (
          <View style={{ gap: 6 }}>
            <Txt bold size={16}>قسم</Txt>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {choices.map((c) => (
                <Tile key={c.id} label={c.nameUr} on={c.id === categoryId} onPress={() => pick(c)}
                  icon={(c.section === 'livestock' ? ANIMAL_ICONS[c.slug] : (c.iconKey as IconName)) ?? 'tag-outline'} />
              ))}
            </View>
          </View>
        )}

        {category && (
          <>
            {category.section === 'livestock' && (
              <ChoiceGroup label="کس کام کے لیے؟">
                {category.purposes.map((p) => (
                  <Choice key={p} label={PURPOSE_LABEL[p]} on={purpose === p} onPress={() => setPurpose(purpose === p ? null : p)} />
                ))}
              </ChoiceGroup>
            )}

            <Field label={category.section === 'livestock' ? 'کتنے جانور چاہییں؟' : 'کتنا چاہیے؟'} icon="package-variant" ltr keyboardType="decimal-pad"
              placeholder={category.section === 'livestock' ? '10' : '500'} value={quantity}
              onChangeText={(v) => setQuantity(digitsOnly(v, category.section !== 'livestock'))} maxLength={9} />
            {category.quantityUnits.length > 1 && (
              <ChoiceGroup label="اکائی">
                {category.quantityUnits.map((u) => <Choice key={u} label={QUANTITY_LABEL[u]} on={unit === u} onPress={() => setUnit(u)} />)}
              </ChoiceGroup>
            )}

            {category.section === 'livestock' && (
              <View style={{ gap: 6 }}>
                <Txt bold size={16}>ہر جانور کا زندہ وزن (کلو) – اختیاری</Txt>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}><Field label="کم از کم" ltr keyboardType="number-pad" placeholder="25" value={minW} onChangeText={(v) => setMinW(digitsOnly(v))} maxLength={4} /></View>
                  <View style={{ flex: 1 }}><Field label="زیادہ سے زیادہ" ltr keyboardType="number-pad" placeholder="30" value={maxW} onChangeText={(v) => setMaxW(digitsOnly(v))} maxLength={4} /></View>
                </View>
              </View>
            )}

            <ChoiceGroup label="کتنی بار چاہیے؟">
              {(Object.keys(FREQUENCY_LABEL) as Frequency[]).map((f) => (
                <Choice key={f} label={FREQUENCY_LABEL[f]} icon={f === 'oneTime' ? 'numeric-1-circle-outline' : 'calendar-sync-outline'} on={frequency === f} onPress={() => setFrequency(f)} />
              ))}
            </ChoiceGroup>

            <ChoiceGroup label="کب تک چاہیے؟">
              {NEEDED_BY.map((n) => <Choice key={n.days} label={n.label} on={neededBy === inDays(n.days)} onPress={() => setNeededBy(neededBy === inDays(n.days) ? null : inDays(n.days))} />)}
              <Choice label="جب بھی مل جائے" on={neededBy === null} onPress={() => setNeededBy(null)} />
            </ChoiceGroup>

            <Field label="آپ کا بجٹ (روپے) – اختیاری" icon="cash" ltr keyboardType="number-pad" placeholder="60000"
              value={price} onChangeText={(v) => setPrice(digitsOnly(v))} maxLength={10} />
            {Number(price) > 0 && (
              <>
                <Txt bold size={15} color={colors.brand700}>{formatPrice(Number(price))}</Txt>
                <ChoiceGroup label="بجٹ کس حساب سے؟">
                  {category.priceUnits.filter((u) => u !== 'perShare').map((u) => (
                    <Choice key={u} label={priceUnitLabel(u, category.section)} on={priceUnit === u} onPress={() => setPriceUnit(u)} />
                  ))}
                </ChoiceGroup>
              </>
            )}

            <ChoiceGroup label="شہر">
              {locations.map((l) => <Choice key={l.id} label={l.nameUr} icon="map-marker-outline" on={city === l.id} onPress={() => setLocationId(l.id)} />)}
            </ChoiceGroup>
            <Toggle label="ڈیلیوری چاہیے" icon="truck-delivery-outline" value={delivery} onChange={setDelivery} />
            <Field label="مزید بات (اختیاری)" icon="text" placeholder="مثلاً: صبح 7 بجے سے پہلے ہوٹل پر چاہییں" value={notes} onChangeText={setNotes} multiline maxLength={1000} />
          </>
        )}

        {error && <Notice tone="error" text={error} />}
        <Button label="ضرورت لگائیں" icon="bullhorn-outline" loading={busy} onPress={submit} disabled={!category} />
        <Txt size={13} color={colors.muted} center>ضرورت 30 دن کھلی رہے گی۔ آپ کا نمبر صرف پیشکش بھیجنے والوں کو نظر آئے گا</Txt>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
