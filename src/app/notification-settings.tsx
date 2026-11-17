import { useEffect, useState } from 'react'
import { ScrollView, View } from 'react-native'
import { router } from 'expo-router'
import { Button, Loading, Notice, TopBar, Txt } from '@/components/ui'
import { RequireLogin } from '@/components/require-login'
import { Choice, ChoiceGroup, Toggle } from '@/components/sell-parts'
import { api, type Category, type NotificationSettings } from '@/lib/api'
import { errorMessage } from '@/lib/errors'
import { useListen } from '@/lib/listen'
import { useSession } from '@/lib/session'
import { colors } from '@/theme'
import { t } from '@/i18n'

const close = () => (router.canGoBack() ? router.back() : router.replace('/'))
const RADII = [10, 30, 60, 100, 200]
const SPEECH =
  'یہاں چنیں کہ آپ کو کس چیز کی اطلاع چاہیے۔ قریب کے اشتہار، یا قریب کی ضرورتیں۔ کتنے کلومیٹر تک، اور کن جانوروں یا فصلوں کی۔ کچھ نہ چنیں تو سب کی اطلاع ملے گی۔ آپ کے شہر سے ناپا جاتا ہے، گھر کا پتا کسی کو نہیں بتایا جاتا۔'

export default function NotificationSettingsScreen() {
  const { user, location } = useSession()
  const [settings, setSettings] = useState<NotificationSettings | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)
  useListen(SPEECH)

  useEffect(() => {
    if (!user) return
    api.notificationSettings().then(setSettings, (e) => setError(errorMessage(e)))
    api.categories().then(setCategories).catch(() => {})
  }, [user])

  if (!user) {
    return (
      <View style={{ flex: 1 }}>
        <TopBar title="اطلاعات کی ترتیب" onBack={close} />
        <RequireLogin icon="bell-cog-outline" title="لاگ اِن کریں" text="اطلاعات کی ترتیب اکاؤنٹ کے ساتھ محفوظ ہوتی ہے" />
      </View>
    )
  }
  if (!settings) return <View style={{ flex: 1 }}><TopBar title="اطلاعات کی ترتیب" onBack={close} />{error ? <Notice tone="error" text={error} /> : <Loading />}</View>

  const set = (patch: Partial<NotificationSettings>) => { setSaved(false); setSettings({ ...settings, ...patch }) }
  const toggleCategory = (id: number) =>
    set({ categoryIds: settings.categoryIds.includes(id) ? settings.categoryIds.filter((x) => x !== id) : [...settings.categoryIds, id] })

  const save = async () => {
    setBusy(true)
    setError(null)
    try {
      setSettings(await api.saveNotificationSettings(settings))
      setSaved(true)
    } catch (e) {
      setError(t(errorMessage(e)))
    } finally {
      setBusy(false)
    }
  }

  return (
    <View style={{ flex: 1 }}>
      <TopBar title="اطلاعات کی ترتیب" onBack={close} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}>
        {!location && !user.profile.location && <Notice tone="error" text="پہلے اپنا شہر چنیں (پروفائل میں)، ورنہ قریب کی اطلاع نہیں ملے گی" />}
        <Toggle label="اطلاعات چالو" icon="bell-ring-outline" value={settings.enabled} onChange={(v) => set({ enabled: v })} />
        {settings.enabled && (
          <>
            <Toggle label="قریب کے نئے اشتہار" icon="storefront-outline" value={settings.wantListings} onChange={(v) => set({ wantListings: v })} />
            <Toggle label="قریب کی نئی ضرورتیں (خریدار)" icon="bullhorn-outline" value={settings.wantRequests} onChange={(v) => set({ wantRequests: v })} />
            <ChoiceGroup label="کتنی دور تک؟" hint="آپ کے شہر سے کلومیٹر">
              {RADII.map((r) => <Choice key={r} label={`${r} ${t('کلومیٹر')}`} on={settings.radiusKm === r} onPress={() => set({ radiusKm: r })} />)}
            </ChoiceGroup>
            <ChoiceGroup label="کن کی اطلاع چاہیے؟" hint="کچھ نہ چنیں تو سب کی اطلاع ملے گی">
              {categories.map((c) => <Choice key={c.id} label={c.nameUr} on={settings.categoryIds.includes(c.id)} onPress={() => toggleCategory(c.id)} />)}
            </ChoiceGroup>
            <Txt size={13} color={colors.muted}>ایک دن میں زیادہ سے زیادہ 20 قریب کی اطلاعات آتی ہیں۔ آپ کی اپنی پیشکشوں اور حصوں کی اطلاع ہمیشہ ملتی ہے۔</Txt>
          </>
        )}
        {error && <Notice tone="error" text={error} />}
        {saved && <Notice tone="success" text="ترتیب محفوظ ہو گئی" />}
        <Button label="محفوظ کریں" icon="content-save-outline" onPress={save} loading={busy} />
      </ScrollView>
    </View>
  )
}
