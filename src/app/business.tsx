import { useEffect, useState } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native'
import { router } from 'expo-router'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { Button, Card, Field, Loading, Notice, TopBar, Txt, type IconName } from '@/components/ui'
import { RequireLogin } from '@/components/require-login'
import { Choice, ChoiceGroup } from '@/components/sell-parts'
import { api, type Business, type BusinessType } from '@/lib/api'
import { errorMessage } from '@/lib/errors'
import { cleanPhone, isValidPkMobile } from '@/lib/phone'
import { BUSINESS_TYPE_ICON, BUSINESS_TYPE_LABEL, VERIFICATION_LABEL } from '@/lib/format'
import { useSession } from '@/lib/session'
import { colors } from '@/theme'
import { t } from '@/i18n'

const close = () => (router.canGoBack() ? router.back() : router.replace('/profile'))
const TYPES: BusinessType[] = ['restaurant', 'hotel', 'butcher', 'meatSupplier', 'trader', 'farm', 'agriSupplier', 'other']

/** Restaurant, hotel, butcher, trader… details. Optional – any account can buy and sell without it. */
export default function BusinessScreen() {
  const { user, location, locations } = useSession()
  const [loaded, setLoaded] = useState(false)
  const [business, setBusiness] = useState<Business | null>(null)
  const [name, setName] = useState('')
  const [type, setType] = useState<BusinessType | null>(null)
  const [locationId, setLocationId] = useState<number | null>(null)
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!user) return
    api.myBusiness().then((b) => {
      setBusiness(b)
      if (b) {
        setName(b.businessName); setType(b.type); setLocationId(b.location.id)
        setAddress(b.address ?? ''); setPhone(b.contactPhone ?? ''); setDescription(b.description ?? '')
      }
      setLoaded(true)
    }, (e) => { setError(errorMessage(e)); setLoaded(true) })
  }, [user])

  if (!user) return <View style={{ flex: 1 }}><TopBar title="میرا کاروبار" onBack={close} /><RequireLogin icon="store-outline" title="کاروبار لکھنے کے لیے لاگ اِن کریں" text="ہوٹل، قصائی، بیوپاری یا فارم" /></View>
  if (!loaded) return <View style={{ flex: 1 }}><TopBar title="میرا کاروبار" onBack={close} /><Loading /></View>

  const city = locationId ?? location?.id ?? null
  const save = async () => {
    if (name.trim().length < 2) return setError(t('کاروبار کا نام لکھیں'))
    if (!type) return setError(t('کاروبار کی قسم چنیں'))
    if (!city) return setError(t('شہر چنیں'))
    if (phone && !isValidPkMobile(phone)) return setError(t('موبائل نمبر 03 سے شروع ہو اور 11 ہندسے ہوں'))
    setBusy(true); setError(null); setSaved(false)
    try {
      setBusiness(await api.saveBusiness({
        businessName: name.trim(), type, locationId: city, address: address.trim() || undefined,
        description: description.trim() || undefined, contactPhone: phone ? cleanPhone(phone) : null,
      }))
      setSaved(true)
    } catch (e) {
      setError(t(errorMessage(e)))
    } finally {
      setBusy(false)
    }
  }

  const verify = async () => {
    setBusy(true)
    try {
      setBusiness(await api.requestVerification())
    } catch (e) {
      setError(t(errorMessage(e)))
    } finally {
      setBusy(false)
    }
  }

  const v = business?.verification
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <TopBar title="میرا کاروبار" onBack={close} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        {business && (
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <MaterialCommunityIcons name={v === 'verified' ? 'check-decagram' : v === 'pending' ? 'clock-outline' : 'shield-outline'} size={32}
              color={v === 'verified' ? colors.brand700 : v === 'rejected' ? colors.danger : colors.muted} />
            <View style={{ flex: 1 }}>
              <Txt bold size={16}>{VERIFICATION_LABEL[v!]}</Txt>
              <Txt size={13} color={colors.muted}>
                {v === 'verified' ? 'خریدار اور بیچنے والے آپ کے نام کے ساتھ سبز نشان دیکھیں گے'
                  : v === 'pending' ? 'منڈی دوست کی ٹیم آپ سے رابطہ کرے گی'
                  : 'تصدیق سے لوگ زیادہ بھروسہ کرتے ہیں'}
              </Txt>
            </View>
          </Card>
        )}
        {business && (v === 'unverified' || v === 'rejected') && (
          <Button label="تصدیق کی درخواست دیں" icon="shield-check-outline" variant="soft" loading={busy} onPress={verify} />
        )}

        <Txt size={15} color={colors.muted}>ہوٹل، قصائی، بیوپاری یا فارم ہے؟ نام لکھیں تاکہ لوگ آپ کو پہچانیں۔ یہ ضروری نہیں</Txt>
        <Field label="کاروبار کا نام" icon="store-outline" placeholder="مثلاً: لودھراں کڑاہی ہاؤس" value={name} onChangeText={setName} maxLength={80} />
        <ChoiceGroup label="کاروبار کی قسم">
          {TYPES.map((k) => <Choice key={k} label={BUSINESS_TYPE_LABEL[k]} icon={BUSINESS_TYPE_ICON[k] as IconName} on={type === k} onPress={() => setType(k)} />)}
        </ChoiceGroup>
        <ChoiceGroup label="شہر">
          {locations.map((l) => <Choice key={l.id} label={l.nameUr} icon="map-marker-outline" on={city === l.id} onPress={() => setLocationId(l.id)} />)}
        </ChoiceGroup>
        <Field label="پتہ (اختیاری)" icon="home-map-marker" placeholder="مثلاً: ملتان روڈ، نزد بس اڈا" value={address} onChangeText={setAddress} maxLength={200} />
        <Field label="کاروبار کا نمبر (اختیاری)" icon="phone" ltr keyboardType="phone-pad" placeholder="03001234567" value={phone} onChangeText={setPhone} maxLength={14} />
        <Txt size={12} color={colors.muted}>یہ نمبر آپ کی ضرورت پر پیشکش بھیجنے والوں کو نظر آئے گا</Txt>
        <Field label="کاروبار کے بارے میں (اختیاری)" icon="text" value={description} onChangeText={setDescription} multiline maxLength={500} />
        {error && <Notice tone="error" text={error} />}
        {saved && <Notice tone="success" text="محفوظ ہو گیا" />}
        <Button label="محفوظ کریں" icon="content-save-outline" loading={busy} onPress={save} />
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
