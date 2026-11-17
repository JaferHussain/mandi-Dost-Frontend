import { useState, type ReactNode } from 'react'
import { Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Button, Card, Num, Txt, type IconName } from '@/components/ui'
import { HeaderAssist } from '@/components/assist'
import { useListen } from '@/lib/listen'
import { useNotifications } from '@/lib/notifications'
import { RequireLogin } from '@/components/require-login'
import { LanguageSheet } from '@/components/language'
import { LocationSheet } from '@/components/location'
import { useSession } from '@/lib/session'
import { LANGUAGES, t } from '@/i18n'
import { colors } from '@/theme'

/** +923001234567 → 0300-1234567 (how people write numbers in Pakistan) */
const localPhone = (p: string) => (p.startsWith('+92') ? `0${p.slice(3, 6)}-${p.slice(6)}` : p)

export default function Profile() {
  const insets = useSafeAreaInsets()
  const { user, lang, setLang, location, logout } = useSession()
  const [langOpen, setLangOpen] = useState(false)
  const [cityOpen, setCityOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const { unread } = useNotifications()
  useListen(user ? `${user.fullName}۔ ${t('آپ کے اشتہار، پسندیدہ، ضرورتیں، پیشکشیں اور اطلاعات یہاں ہیں')}` : t('اکاؤنٹ بنانے یا لاگ اِن کرنے کے لیے نیچے بٹن دبائیں'))

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingTop: insets.top + 12, gap: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Txt bold size={24} style={{ flex: 1 }}>پروفائل</Txt>
        <HeaderAssist fallback="پروفائل" />
      </View>

      {user ? (
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View style={styles.avatar}>
            <Txt bold size={26} color={colors.white}>{user.fullName.trim().charAt(0)}</Txt>
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Txt bold size={19} numberOfLines={1}>{user.fullName}</Txt>
            <Num size={16} color={colors.muted}>{localPhone(user.phoneNumber)}</Num>
            <View style={styles.badge}>
              <MaterialCommunityIcons name={user.phoneVerified ? 'check-decagram' : 'alert-decagram-outline'} size={16} color={user.phoneVerified ? colors.brand700 : '#92400e'} />
              <Txt size={12} color={user.phoneVerified ? colors.brand800 : '#92400e'}>
                {user.phoneVerified ? 'نمبر تصدیق شدہ' : 'نمبر کی تصدیق ابھی نہیں ہوئی'}
              </Txt>
            </View>
          </View>
        </Card>
      ) : (
        <Card>
          <RequireLogin icon="account-circle-outline" title="خوش آمدید" text="اکاؤنٹ بنا کر اشتہار لگائیں، پیغام بھیجیں اور پسندیدہ جانور محفوظ کریں" />
        </Card>
      )}

      {user && (
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <Row icon="bell-outline" label="اطلاعات" value={unread > 0 ? `${unread} ${t('نئی')}` : ''} onPress={() => router.push('/notifications')} />
          <Row icon="clipboard-list-outline" label="میرے اشتہار" value="" onPress={() => router.push('/my-listings')} />
          <Row icon="heart-outline" label="پسندیدہ" value="" onPress={() => router.push('/favorites')} />
          <Row icon="bullhorn-outline" label="میری ضرورتیں" value="" onPress={() => router.push('/my-requests')} />
          <Row icon="hand-coin-outline" label="میری پیشکشیں" value="" onPress={() => router.push('/my-offers')} />
          <Row icon="account-group-outline" label="میرے قربانی کے حصے" value="" onPress={() => router.push('/my-bookings')} />
          <Row icon="store-outline" label="میرا کاروبار" value="ہوٹل، قصائی، بیوپاری" onPress={() => router.push('/business')} last />
        </Card>
      )}

      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <Row icon="tape-measure" label="فیتے سے وزن" value="" onPress={() => router.push('/tools/weight')} />
        <Row icon="translate" label="زبان" value={LANGUAGES.find((l) => l.id === lang)?.name ?? 'اردو'} onPress={() => setLangOpen(true)} />
        <Row icon="map-marker-outline" label="میرا شہر" value={location?.nameUr ?? 'شہر چنیں'} onPress={() => setCityOpen(true)} last />
      </Card>

      {user && (user.role === 'Admin' || user.role === 'Moderator') && (
        <Button label="انتظامیہ (رپورٹس اور تصدیق)" icon="shield-account-outline" variant="outline" onPress={() => router.push('/admin')} />
      )}

      {user && (
        <Button
          label="لاگ آؤٹ"
          icon="logout"
          variant="danger"
          loading={busy}
          onPress={async () => {
            setBusy(true)
            await logout()
            setBusy(false)
          }}
        />
      )}

      <Txt size={12} color={colors.muted} center>منڈی دوست · ورژن 0.1</Txt>

      <LanguageSheet open={langOpen} onClose={() => setLangOpen(false)} value={lang} onPick={setLang} />
      <LocationSheet open={cityOpen} onClose={() => setCityOpen(false)} />
    </ScrollView>
  )
}

function Row({ icon, label, value, onPress, last }: { icon: IconName; label: string; value: ReactNode; onPress: () => void; last?: boolean }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [styles.row, !last && styles.rowBorder, pressed && { backgroundColor: colors.brand50 }]}>
      <MaterialCommunityIcons name={icon} size={26} color={colors.brand700} />
      <Txt bold size={16} style={{ flex: 1 }}>{label}</Txt>
      <Txt size={15} color={colors.muted}>{value}</Txt>
      <MaterialCommunityIcons name="chevron-left" size={24} color={colors.muted} />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.brand700, alignItems: 'center', justifyContent: 'center' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, paddingHorizontal: 16 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
})
