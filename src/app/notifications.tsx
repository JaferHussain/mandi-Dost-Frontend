import { FlatList, Pressable, StyleSheet, View } from 'react-native'
import { router } from 'expo-router'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { Button, EmptyState, Loading, TopBar, Txt } from '@/components/ui'
import { RequireLogin } from '@/components/require-login'
import { timeAgo } from '@/lib/format'
import { speak, useListen } from '@/lib/listen'
import { describeNotification, openNotification } from '@/lib/notification-text'
import { useNotifications } from '@/lib/notifications'
import { useSession } from '@/lib/session'
import { colors, radius } from '@/theme'
import { t } from '@/i18n'

const close = () => (router.canGoBack() ? router.back() : router.replace('/'))

export default function NotificationsScreen() {
  const { user } = useSession()
  const { items, unread, loaded, loadMore, markRead, markAllRead, refresh } = useNotifications()

  const intro = unread > 0 ? `${t('آپ کی')} ${unread} ${t('نئی اطلاعات ہیں')}` : t('کوئی نئی اطلاع نہیں')
  useListen(`${intro}۔ ${items.slice(0, 3).map((n) => describeNotification(n).speech).join('۔ ')}`)

  if (!user) {
    return (
      <View style={{ flex: 1 }}>
        <TopBar title="اطلاعات" onBack={close} />
        <RequireLogin icon="bell-outline" title="اطلاعات دیکھنے کے لیے لاگ اِن کریں" text="قریب کے اشتہار، ضرورتیں اور پیشکشیں یہاں ملیں گی" />
      </View>
    )
  }

  return (
    <View style={{ flex: 1 }}>
      <TopBar
        title="اطلاعات"
        onBack={close}
        right={
          <Pressable onPress={() => router.push('/notification-settings')} hitSlop={6} accessibilityRole="button" accessibilityLabel={t('اطلاعات کی ترتیب')} style={styles.gear}>
            <MaterialCommunityIcons name="cog-outline" size={26} color={colors.ink} />
          </Pressable>
        }
      />
      {!loaded ? (
        <Loading />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(n) => String(n.id)}
          contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 40 }}
          onRefresh={refresh}
          refreshing={false}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListHeaderComponent={
            unread > 0 ? <Button label={`${t('سب پڑھی ہوئی کریں')} (${unread})`} icon="check-all" variant="soft" onPress={markAllRead} /> : undefined
          }
          ListEmptyComponent={
            <EmptyState icon="bell-sleep-outline" title="ابھی کوئی اطلاع نہیں"
              text="جب آپ کے قریب کوئی بیچے یا خریدنا چاہے، یا آپ کی پیشکش پر جواب آئے، تو یہاں نظر آئے گا"
              action={<Button label="اطلاعات کی ترتیب" icon="cog-outline" variant="outline" onPress={() => router.push('/notification-settings')} />} />
          }
          renderItem={({ item: n }) => {
            const d = describeNotification(n)
            return (
              <Pressable
                onPress={() => { markRead(n.id); openNotification(n) }}
                accessibilityRole="button"
                style={({ pressed }) => [styles.row, !n.isRead && styles.unread, pressed && { opacity: 0.85 }]}>
                <View style={[styles.icon, n.isRead && { backgroundColor: colors.sand }]}>
                  <MaterialCommunityIcons name={d.icon} size={26} color={n.isRead ? colors.brand700 : colors.white} />
                </View>
                <View style={{ flex: 1 }}>
                  <Txt bold size={15}>{d.title}</Txt>
                  <Txt size={13} color={colors.muted} numberOfLines={2}>{d.body}</Txt>
                  <Txt size={12} color={colors.muted}>{timeAgo(n.createdAtUtc)}</Txt>
                </View>
                <Pressable onPress={() => speak(d.speech)} hitSlop={6} style={styles.speak} accessibilityRole="button" accessibilityLabel={t('سنیں')}>
                  <MaterialCommunityIcons name="volume-high" size={22} color={colors.ink} />
                </Pressable>
              </Pressable>
            )
          }}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  gear: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, backgroundColor: colors.white, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
  unread: { backgroundColor: colors.brand50, borderColor: colors.brand200 },
  icon: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.brand700, alignItems: 'center', justifyContent: 'center' },
  speak: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
})
