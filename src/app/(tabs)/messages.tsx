import { useCallback, useState } from 'react'
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { Image } from 'expo-image'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { EmptyState, Loading, Notice, Txt } from '@/components/ui'
import { RequireLogin } from '@/components/require-login'
import { api, mediaUrl, type ChatSummary } from '@/lib/api'
import { errorMessage } from '@/lib/errors'
import { timeAgo } from '@/lib/format'
import { useSession } from '@/lib/session'
import { colors, radius } from '@/theme'
import { t } from '@/i18n'

/** Conversation list. Refreshes when shown and every 15 seconds while open. */
export default function Messages() {
  const insets = useSafeAreaInsets()
  const { user } = useSession()
  const [chats, setChats] = useState<ChatSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    try {
      setChats(await api.chats())
      setError(null)
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setRefreshing(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      if (!user) return
      load()
      const timer = setInterval(load, 15000)
      return () => clearInterval(timer)
    }, [user, load]),
  )

  return (
    <View style={{ flex: 1, paddingTop: insets.top + 12 }}>
      <Txt bold size={24} style={{ paddingHorizontal: 16 }}>پیغامات</Txt>
      {!user ? (
        <View style={{ padding: 16 }}>
          <RequireLogin icon="message-text-outline" title="پیغامات دیکھنے کے لیے لاگ اِن کریں" text="خریدار اور بیچنے والے یہاں بات کریں گے" />
        </View>
      ) : !chats ? (
        error ? <View style={{ padding: 16 }}><Notice tone="error" text={error} /></View> : <Loading />
      ) : (
        <FlatList
          data={chats}
          keyExtractor={(c) => String(c.id)}
          contentContainerStyle={{ padding: 16, gap: 8, flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} colors={[colors.brand700]} />}
          ListEmptyComponent={
            <EmptyState icon="message-text-outline" title="ابھی کوئی پیغام نہیں"
              text="کسی اشتہار پر 'پیغام بھیجیں' دبائیں، بات چیت یہاں نظر آئے گی" />
          }
          renderItem={({ item: c }) => (
            <Pressable onPress={() => router.push({ pathname: '/chat/[id]', params: { id: String(c.id) } })}
              style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]} accessibilityRole="button">
              <View style={styles.avatar}>
                {c.listingThumbnailUrl ? <Image source={mediaUrl(c.listingThumbnailUrl)} style={StyleSheet.absoluteFill} contentFit="cover" />
                  : <Txt bold size={20} color={colors.white}>{(c.other.businessName ?? c.other.fullName).trim().charAt(0)}</Txt>}
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Txt bold size={16} style={{ flex: 1 }} numberOfLines={1}>{c.other.businessName ?? c.other.fullName}</Txt>
                  <Txt size={12} color={colors.muted}>{timeAgo(c.lastMessageAtUtc)}</Txt>
                </View>
                {c.listingTitle && <Txt size={12} color={colors.brand700} numberOfLines={1}>{c.listingTitle}</Txt>}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  {c.lastMessageType === 'voice' && <MaterialCommunityIcons name="microphone" size={16} color={colors.muted} />}
                  <Txt size={14} color={c.unreadCount ? colors.ink : colors.muted} numberOfLines={1} style={{ flex: 1 }}>
                    {`${c.lastMessageIsMine ? `${t('آپ')}: ` : ''}${c.lastMessageType === 'voice' ? t('آواز کا پیغام') : c.lastMessagePreview ?? ''}`}
                  </Txt>
                  {c.unreadCount > 0 && <View style={styles.badge}><Txt bold size={12} color={colors.white}>{String(c.unreadCount)}</Txt></View>}
                </View>
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, backgroundColor: colors.white, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
  avatar: { width: 56, height: 56, borderRadius: 16, overflow: 'hidden', backgroundColor: colors.brand700, alignItems: 'center', justifyContent: 'center' },
  badge: { minWidth: 24, height: 24, borderRadius: 12, paddingHorizontal: 6, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center' },
})
