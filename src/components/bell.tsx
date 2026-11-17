import { Pressable, StyleSheet, View } from 'react-native'
import { router } from 'expo-router'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useNotifications } from '@/lib/notifications'
import { useSession } from '@/lib/session'
import { colors } from '@/theme'
import { t } from '@/i18n'
import { Txt } from './ui'

/** Bell with the number of unread alerts. Opens the notification list (or asks to log in). */
export function Bell({ light }: { light?: boolean }) {
  const { user } = useSession()
  const { unread } = useNotifications()
  return (
    <Pressable
      onPress={() => router.push(user ? '/notifications' : '/login')}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={t('اطلاعات')}
      style={styles.btn}>
      <MaterialCommunityIcons name={unread > 0 ? 'bell-ring' : 'bell-outline'} size={28} color={light ? colors.white : colors.ink} />
      {unread > 0 && (
        <View style={styles.badge}>
          <Txt bold size={11} color={colors.white}>{unread > 99 ? '99+' : String(unread)}</Txt>
        </View>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  btn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute', top: 2, end: 0, minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 4,
    backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center',
  },
})
