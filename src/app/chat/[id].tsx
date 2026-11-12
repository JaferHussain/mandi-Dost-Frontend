import { useCallback, useEffect, useRef, useState } from 'react'
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native'
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router'
import { Image } from 'expo-image'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { EmptyState, Loading, Notice, TopBar, Txt } from '@/components/ui'
import { VoicePlayer, VoiceRecorder } from '@/components/voice'
import { api, mediaUrl, type ChatMessage, type ChatSummary } from '@/lib/api'
import { errorMessage } from '@/lib/errors'
import { colors, fonts, radius } from '@/theme'
import { t } from '@/i18n'

const POLL_MS = 4000
const back = () => (router.canGoBack() ? router.back() : router.replace('/messages'))
const time = (iso: string) => {
  const d = new Date(iso)
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
}

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const chatId = Number(id)
  const insets = useSafeAreaInsets()
  const [chat, setChat] = useState<ChatSummary | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [error, setError] = useState<string | null>(null)
  const [sendError, setSendError] = useState<string | null>(null)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [recording, setRecording] = useState(false)
  const list = useRef<FlatList<ChatMessage>>(null)
  const lastId = useRef(0)

  const add = useCallback((incoming: ChatMessage[]) => {
    if (!incoming.length) return
    setMessages((prev) => {
      const seen = new Set(prev.map((m) => m.id))
      const merged = [...prev, ...incoming.filter((m) => !seen.has(m.id))].sort((a, b) => a.id - b.id)
      lastId.current = merged.at(-1)?.id ?? lastId.current
      return merged
    })
  }, [])

  useEffect(() => {
    api.chat(chatId).then((d) => { setChat(d.chat); add(d.messages) }, (e) => setError(errorMessage(e)))
  }, [chatId, add])

  // Poll for new messages while this screen is open (works on any hosting – no websockets needed)
  useFocusEffect(
    useCallback(() => {
      const timer = setInterval(() => {
        api.chat(chatId, { afterId: lastId.current || undefined }).then((d) => add(d.messages)).catch(() => {})
      }, POLL_MS)
      return () => clearInterval(timer)
    }, [chatId, add]),
  )

  useEffect(() => {
    if (messages.length) setTimeout(() => list.current?.scrollToEnd({ animated: true }), 50)
  }, [messages.length])

  const sendText = async () => {
    const body = text.trim()
    if (!body || sending) return
    setSending(true)
    setSendError(null)
    try {
      add([await api.sendMessage(chatId, body)])
      setText('')
    } catch (e) {
      setSendError(t(errorMessage(e)))
    } finally {
      setSending(false)
    }
  }

  if (error) return <View style={{ flex: 1 }}><TopBar title="پیغامات" onBack={back} /><EmptyState icon="message-alert-outline" title={error} /></View>
  if (!chat) return <View style={{ flex: 1 }}><TopBar title="پیغامات" onBack={back} /><Loading /></View>

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <TopBar
        title={chat.other.businessName ?? chat.other.fullName}
        onBack={back}
        right={
          <Pressable onPress={() => router.push({ pathname: '/user/[id]', params: { id: String(chat.other.id) } })} style={styles.iconBtn}
            accessibilityRole="button" accessibilityLabel={t('پروفائل دیکھیں')}>
            <MaterialCommunityIcons name="account-circle-outline" size={28} color={colors.ink} />
          </Pressable>
        }
      />
      {chat.listingId && (
        <Pressable onPress={() => router.push({ pathname: '/listing/[id]', params: { id: String(chat.listingId) } })} style={styles.listing} accessibilityRole="button">
          {chat.listingThumbnailUrl ? <Image source={mediaUrl(chat.listingThumbnailUrl)} style={styles.thumb} contentFit="cover" />
            : <MaterialCommunityIcons name="image-outline" size={28} color={colors.brand700} />}
          <Txt bold size={14} style={{ flex: 1 }} numberOfLines={1}>{chat.listingTitle}</Txt>
          <MaterialCommunityIcons name="chevron-left" size={22} color={colors.muted} />
        </Pressable>
      )}

      <FlatList
        ref={list}
        data={messages}
        keyExtractor={(m) => String(m.id)}
        contentContainerStyle={{ padding: 12, gap: 8, flexGrow: 1 }}
        ListEmptyComponent={
          <View style={{ flex: 1, justifyContent: 'center', gap: 10 }}>
            <EmptyState icon="hand-wave-outline" title="سلام کریں" text="لکھ کر یا مائیک دبا کر بول کر پیغام بھیجیں" />
            <Notice icon="shield-alert-outline" text="جانور دیکھے بغیر کبھی پیشگی رقم نہ بھیجیں" />
          </View>
        }
        renderItem={({ item: m }) => (
          <View style={[styles.bubble, m.isMine ? styles.mine : styles.theirs]}>
            {m.type === 'voice' && m.mediaUrl ? (
              <VoicePlayer url={mediaUrl(m.mediaUrl)!} seconds={m.durationSeconds} mine={m.isMine} />
            ) : (
              <Txt size={16} color={m.isMine ? colors.white : colors.ink}>{m.text}</Txt>
            )}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-end' }}>
              <Txt size={11} color={m.isMine ? 'rgba(255,255,255,0.8)' : colors.muted}>{time(m.createdAtUtc)}</Txt>
              {m.isMine && <MaterialCommunityIcons name={m.readAtUtc ? 'check-all' : 'check'} size={14} color="rgba(255,255,255,0.85)" />}
            </View>
          </View>
        )}
      />

      {sendError && <View style={{ paddingHorizontal: 12 }}><Notice tone="error" text={sendError} /></View>}
      <View style={[styles.composer, { paddingBottom: insets.bottom + 8 }]}>
        {/* Text box first: in right-to-left layout the send / mic button ends up on the left, as in WhatsApp */}
        {!recording && (
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={t('پیغام لکھیں…')}
            placeholderTextColor="#9ca39a"
            multiline
            maxLength={2000}
            style={styles.input}
          />
        )}
        {text.trim() && !recording ? (
          <Pressable onPress={sendText} disabled={sending} style={[styles.send, sending && { opacity: 0.6 }]} accessibilityRole="button" accessibilityLabel={t('بھیجیں')}>
            <MaterialCommunityIcons name="send" size={26} color={colors.white} />
          </Pressable>
        ) : (
          <VoiceRecorder
            onRecordingChange={setRecording}
            onSend={async (file, seconds) => {
              setSendError(null)
              try {
                add([await api.sendVoice(chatId, file, seconds)])
              } catch (e) {
                setSendError(t(errorMessage(e)))
              }
            }}
          />
        )}
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  iconBtn: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  listing: {
    flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 6,
    backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  thumb: { width: 44, height: 44, borderRadius: 10 },
  bubble: { maxWidth: '82%', paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.lg, gap: 2 },
  // In right-to-left layout, "flex-start" is the right side: my messages on the right like WhatsApp in Urdu
  mine: { alignSelf: 'flex-start', backgroundColor: colors.brand700, borderTopStartRadius: 4 },
  theirs: { alignSelf: 'flex-end', backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderTopEndRadius: 4 },
  composer: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 10, paddingTop: 8,
    backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.border,
  },
  input: {
    flex: 1, minHeight: 56, maxHeight: 140, paddingHorizontal: 14, paddingVertical: 10, borderRadius: radius.lg,
    backgroundColor: colors.cream, borderWidth: 1, borderColor: colors.border, fontFamily: fonts.urdu, fontSize: 16, writingDirection: 'rtl',
  },
  send: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.brand700, alignItems: 'center', justifyContent: 'center' },
})
