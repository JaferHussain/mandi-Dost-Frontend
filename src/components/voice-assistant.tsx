import { useEffect, useRef, useState } from 'react'
import { Alert, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native'
import { router } from 'expo-router'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder } from 'expo-audio'
import { api, type Category, type UploadFile, type VoiceParse } from '@/lib/api'
import { useAssistant } from '@/lib/assistant'
import { errorMessage } from '@/lib/errors'
import { speak, stopSpeaking } from '@/lib/listen'
import { useSession } from '@/lib/session'
import { setVoiceDraft } from '@/lib/voice-draft'
import { describeParse, searchTarget } from '@/lib/voice-apply'
import { colors, fonts, radius } from '@/theme'
import { t } from '@/i18n'
import { Button, Notice, Sheet, SpeakButton, Txt } from './ui'

// "Speak to the app". Talk (or type), see what was understood, hear it read back, then carry on in the normal form.
// Nothing is ever published from here: the sell and requirement forms still need their own confirmation.

const EXAMPLES = [
  'میرے پاس دو ساہیوال گائے ہیں، دو دانت، 80 ہزار روپے فی جانور، لودھراں',
  'ہوٹل کے لیے پانچ بکرے چاہییں، ہر ہفتے، ملتان',
  'میرے قریب بھینس دکھاؤ',
]
const MAX_SECONDS = 60

// The browser's own speech recogniser (Chrome). Only used on the web preview; phones use the server.
type WebRecognition = {
  lang: string; interimResults: boolean; continuous: boolean
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
  onerror: ((e: { error?: string }) => void) | null
  onend: (() => void) | null
  start: () => void; stop: () => void
}
const webRecognizer = (): (new () => WebRecognition) | null => {
  if (Platform.OS !== 'web') return null
  const w = globalThis as unknown as { SpeechRecognition?: new () => WebRecognition; webkitSpeechRecognition?: new () => WebRecognition }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

let statusCache: boolean | null = null

export function VoiceAssistant() {
  const { visible, close } = useAssistant()
  return (
    <Sheet open={visible} onClose={() => { stopSpeaking(); close() }} title="بول کر بتائیں">
      <Panel />
    </Sheet>
  )
}

function Panel() {
  const { initialText, close } = useAssistant()
  const { user, locations } = useSession()
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY)
  const [text, setText] = useState(initialText)
  const [phase, setPhase] = useState<'idle' | 'recording' | 'working'>('idle')
  const [elapsed, setElapsed] = useState(0)
  const [result, setResult] = useState<VoiceParse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [serverCanListen, setServerCanListen] = useState<boolean | null>(statusCache)
  const startedAt = useRef(0)
  const web = useRef<WebRecognition | null>(null)
  const WebRec = webRecognizer()
  const canTalk = !!WebRec || serverCanListen === true

  useEffect(() => {
    api.categories().then(setCategories).catch(() => {})
    if (statusCache == null && !WebRec) {
      api.voiceStatus().then((s) => { statusCache = s.speechRecognition; setServerCanListen(s.speechRecognition) }, () => setServerCanListen(false))
    }
    if (initialText.trim()) understand(initialText)
    return () => { web.current?.stop(); stopSpeaking() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (phase !== 'recording') return
    const timer = setInterval(() => {
      const s = (Date.now() - startedAt.current) / 1000
      setElapsed(s)
      if (s >= MAX_SECONDS) stopTalking()
    }, 250)
    return () => clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  async function understand(sentence: string) {
    const s = sentence.trim()
    if (!s) return
    setPhase('working')
    setError(null)
    try {
      const r = await api.voiceParse(s)
      setResult(r)
      // Read it back so people who don't read can check it
      speak(describeParse(r, categories, locations).speech)
    } catch (e) {
      setResult(null)
      setError(t(errorMessage(e)))
    } finally {
      setPhase('idle')
    }
  }

  async function startTalking() {
    setError(null)
    setResult(null)
    stopSpeaking()
    if (WebRec) {
      const rec = new WebRec()
      rec.lang = 'ur-PK'
      rec.interimResults = true
      rec.continuous = false
      let last = ''
      rec.onresult = (e) => {
        last = Array.from(e.results).map((r) => r[0].transcript).join(' ')
        setText(last)
      }
      rec.onerror = () => setError(t('آواز سنی نہیں جا سکی۔ دوبارہ بولیں یا لکھ دیں'))
      rec.onend = () => { setPhase('idle'); if (last.trim()) understand(last) }
      web.current = rec
      startedAt.current = Date.now()
      setElapsed(0)
      setPhase('recording')
      rec.start()
      return
    }
    const perm = await requestRecordingPermissionsAsync()
    if (!perm.granted) {
      Alert.alert(t('مائیک کی اجازت نہیں ملی'), t('فون کی سیٹنگ میں منڈی دوست کو مائیک کی اجازت دیں'))
      return
    }
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true })
    await recorder.prepareToRecordAsync()
    recorder.record()
    startedAt.current = Date.now()
    setElapsed(0)
    setPhase('recording')
  }

  async function stopTalking() {
    if (phase !== 'recording') return
    if (web.current) { web.current.stop(); return } // its onend continues
    setPhase('working')
    try {
      await recorder.stop()
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => {})
      const uri = recorder.uri
      if (!uri || Date.now() - startedAt.current < 800) { setPhase('idle'); return }
      const ext = uri.split('.').pop()?.toLowerCase() ?? 'm4a'
      const file: UploadFile = { uri, name: `voice.${ext}`, type: ext === '3gp' ? 'audio/3gpp' : 'audio/mp4' }
      const heard = (await api.transcribe(file, 'ur')).text
      if (!heard.trim()) { setError(t('کچھ سنائی نہیں دیا۔ دوبارہ بولیں')); setPhase('idle'); return }
      setText(heard)
      await understand(heard)
    } catch (e) {
      setError(t(errorMessage(e)))
      setPhase('idle')
    }
  }

  const go = (kind: 'sell' | 'wanted' | 'search') => {
    if (!result) return
    stopSpeaking()
    if ((kind === 'sell' || kind === 'wanted') && !user) {
      close()
      router.push('/login')
      return
    }
    if (kind === 'search') {
      const target = searchTarget(result)
      close()
      if (target) router.push({ pathname: '/feed/[section]', params: { section: target.section, category: target.category } })
      else router.navigate('/explore')
      return
    }
    setVoiceDraft(result)
    close()
    const stamp = String(Date.now())
    if (kind === 'sell') router.navigate({ pathname: '/sell', params: { voice: stamp } })
    else router.push({ pathname: '/request/new', params: { voice: stamp } })
  }

  const described = result ? describeParse(result, categories, locations) : null
  const recording = phase === 'recording'
  const working = phase === 'working'

  return (
    <View style={{ gap: 14, paddingBottom: 12 }}>
      {canTalk ? (
        <View style={{ alignItems: 'center', gap: 6 }}>
          <Pressable
            onPress={recording ? stopTalking : startTalking}
            disabled={working}
            accessibilityRole="button"
            accessibilityLabel={t(recording ? 'ختم کریں' : 'دبائیں اور بولیں')}
            style={({ pressed }) => [styles.mic, recording && styles.micOn, pressed && { opacity: 0.85 }, working && { opacity: 0.5 }]}>
            <MaterialCommunityIcons name={recording ? 'stop' : 'microphone'} size={44} color={colors.white} />
          </Pressable>
          <Txt bold size={16} center>
            {recording ? `${t('بول رہے ہیں…')} ${Math.floor(elapsed)}s ${t('(ختم کرنے کے لیے دبائیں)')}` : working ? t('سمجھ رہے ہیں…') : t('دبائیں اور بولیں')}
          </Txt>
        </View>
      ) : serverCanListen === null ? null : (
        <Notice
          icon="microphone-message"
          text="بولنے والی سروس ابھی چالو نہیں ہوئی۔ نیچے خانے میں کی بورڈ کا مائیک دبا کر بولیں، یا لکھ دیں۔ فون آپ کی آواز کو لکھ دے گا"
        />
      )}

      <View style={styles.inputBox}>
        <TextInput
          value={text}
          onChangeText={(v) => { setText(v); setResult(null) }}
          placeholder={t('یہاں لکھیں یا بولیں…')}
          placeholderTextColor="#9ca39a"
          multiline
          maxLength={800}
          style={styles.input}
          accessibilityLabel={t('یہاں لکھیں یا بولیں…')}
        />
      </View>
      <Button label="سمجھیں" icon="text-recognition" onPress={() => understand(text)} disabled={!text.trim() || recording} loading={working} variant={result ? 'outline' : 'primary'} />

      {!result && !text.trim() && (
        <View style={{ gap: 6 }}>
          <Txt bold size={14} color={colors.muted}>مثال کے طور پر کہیں:</Txt>
          {EXAMPLES.map((e) => (
            <Pressable key={e} onPress={() => setText(e)} style={styles.example} accessibilityRole="button">
              <Txt size={14} color={colors.brand800}>{e}</Txt>
            </Pressable>
          ))}
        </View>
      )}

      {error && <Notice tone="error" text={error} />}

      {result && described && (
        <View style={styles.result}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Txt bold size={17} style={{ flex: 1 }}>{result.intent === 'unknown' ? 'میں نے یہ سمجھا' : intentLabel[result.intent]}</Txt>
            <SpeakButton text={described.speech} />
          </View>

          {described.chips.length > 0 ? (
            <View style={styles.chips}>
              {described.chips.map((c, i) => (
                <View key={i} style={styles.chip}>
                  <MaterialCommunityIcons name={c.icon} size={18} color={colors.brand700} />
                  <Txt size={14}>{c.text}</Txt>
                </View>
              ))}
            </View>
          ) : (
            <Notice text="کچھ واضح نہیں ہوا۔ مثلاً کہیں: دو ساہیوال گائے بیچنی ہیں، 80 ہزار روپے" />
          )}

          {described.missing.length > 0 && (
            <Notice icon="comment-question-outline" text={`${t('بتانا باقی ہے')}: ${described.missing.join('، ')}`} />
          )}

          {/* One clear next step, or three to choose from when the sentence didn't say */}
          {(result.intent === 'sell' || result.intent === 'unknown') && (
            <Button label="اشتہار بنائیں" icon="storefront-outline" variant={result.intent === 'sell' ? 'primary' : 'outline'} onPress={() => go('sell')} />
          )}
          {(result.intent === 'wanted' || result.intent === 'unknown') && (
            <Button label="ضرورت لگائیں" icon="bullhorn-outline" variant={result.intent === 'wanted' ? 'primary' : 'outline'} onPress={() => go('wanted')} />
          )}
          {(result.intent === 'search' || result.intent === 'unknown' || (result.intent === 'wanted' && !!result.categorySlug)) && (
            <Button label={result.intent === 'search' ? 'تلاش دکھائیں' : 'پہلے تلاش دیکھیں'} icon="magnify" variant={result.intent === 'search' ? 'primary' : 'outline'} onPress={() => go('search')} />
          )}
          <Txt size={12} color={colors.muted} center>آگے ہر چیز دیکھ کر ٹھیک کر سکتے ہیں۔ اشتہار آپ کی تصدیق کے بغیر نہیں لگتا</Txt>
        </View>
      )}
    </View>
  )
}

const intentLabel: Record<VoiceParse['intent'], string> = {
  sell: 'آپ بیچنا چاہتے ہیں',
  wanted: 'آپ کو چاہیے',
  search: 'آپ تلاش کر رہے ہیں',
  unknown: 'میں نے یہ سمجھا',
}

const styles = StyleSheet.create({
  mic: {
    width: 96, height: 96, borderRadius: 48, backgroundColor: colors.brand700, alignItems: 'center', justifyContent: 'center',
    elevation: 6, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 6, shadowOffset: { width: 0, height: 3 },
  },
  micOn: { backgroundColor: colors.danger },
  inputBox: { backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 2, borderColor: colors.border, padding: 10, minHeight: 96 },
  input: { fontFamily: fonts.urdu, fontSize: 17, lineHeight: 34, color: colors.ink, writingDirection: 'rtl', textAlign: 'right', minHeight: 80, textAlignVertical: 'top' },
  example: { backgroundColor: colors.brand50, borderRadius: radius.md, padding: 10, borderWidth: 1, borderColor: colors.brand200 },
  result: { gap: 10, backgroundColor: colors.white, borderRadius: radius.lg, padding: 14, borderWidth: 1, borderColor: colors.border },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.brand50, borderRadius: radius.full, paddingHorizontal: 12, paddingVertical: 4, borderWidth: 1, borderColor: colors.brand200 },
})
