import { useEffect } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { describeNotification, openNotification } from '@/lib/notification-text'
import { speak, stopSpeaking } from '@/lib/listen'
import { useNotifications } from '@/lib/notifications'
import { colors, radius } from '@/theme'
import { t } from '@/i18n'
import { Txt } from './ui'

const SHOW_MS = 12_000

/** Slides in at the top when something new happens near you or on your posts. Tap to open, speaker to hear it, cross to close. */
export function NotificationPopup() {
  const { popup, dismissPopup, markRead } = useNotifications()
  const insets = useSafeAreaInsets()

  useEffect(() => {
    if (!popup) return
    const timer = setTimeout(dismissPopup, SHOW_MS)
    return () => clearTimeout(timer)
  }, [popup, dismissPopup])

  if (!popup) return null
  const d = describeNotification(popup.n)

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { top: insets.top + 8 }]}>
      <Pressable
        onPress={() => { stopSpeaking(); markRead(popup.n.id); dismissPopup(); openNotification(popup.n) }}
        accessibilityRole="button"
        accessibilityLabel={d.title}
        style={styles.card}>
        <View style={styles.icon}>
          <MaterialCommunityIcons name={d.icon} size={28} color={colors.white} />
        </View>
        <View style={{ flex: 1 }}>
          <Txt bold size={15}>{d.title}</Txt>
          <Txt size={13} color={colors.muted} numberOfLines={2}>{d.body}</Txt>
          {popup.more > 0 && <Txt size={12} color={colors.brand700}>{`${t('اور')} ${popup.more} ${t('نئی اطلاعات')}`}</Txt>}
        </View>
        <Pressable onPress={() => speak(d.speech)} hitSlop={6} style={[styles.round, { backgroundColor: colors.gold }]} accessibilityRole="button" accessibilityLabel={t('سنیں')}>
          <MaterialCommunityIcons name="volume-high" size={24} color={colors.ink} />
        </Pressable>
        <Pressable onPress={() => { stopSpeaking(); dismissPopup() }} hitSlop={6} style={styles.round} accessibilityRole="button" accessibilityLabel={t('بند کریں')}>
          <MaterialCommunityIcons name="close" size={22} color={colors.ink} />
        </Pressable>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', start: 12, end: 12, zIndex: 100 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, backgroundColor: colors.white,
    borderRadius: radius.lg, borderWidth: 1, borderColor: colors.brand200,
    elevation: 10, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
  },
  icon: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.brand700, alignItems: 'center', justifyContent: 'center' },
  round: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.sand, alignItems: 'center', justifyContent: 'center' },
})
