import { useEffect, useRef, useState } from 'react'
import { Alert, Platform, Pressable, StyleSheet, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import {
  RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus, useAudioRecorder,
} from 'expo-audio'
import type { UploadFile } from '@/lib/api'
import { colors, radius } from '@/theme'
import { t } from '@/i18n'
import { Txt } from './ui'

const MAX_SECONDS = 180
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

/** Play button + length for a voice message. */
export function VoicePlayer({ url, seconds, mine }: { url: string; seconds: number | null; mine: boolean }) {
  const player = useAudioPlayer(url)
  const status = useAudioPlayerStatus(player)
  const fg = mine ? colors.white : colors.brand800

  useEffect(() => {
    if (status.didJustFinish) player.seekTo(0)
  }, [status.didJustFinish, player])

  const toggle = async () => {
    if (status.playing) return player.pause()
    await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false }).catch(() => {})
    player.play()
  }
  const total = seconds ?? Math.round(status.duration || 0)
  const progress = total ? Math.min(1, (status.currentTime || 0) / total) : 0

  return (
    <Pressable onPress={toggle} style={styles.player} accessibilityRole="button" accessibilityLabel={t(status.playing ? 'روکیں' : 'سنیں')}>
      <MaterialCommunityIcons name={status.playing ? 'pause-circle' : 'play-circle'} size={40} color={fg} />
      <View style={[styles.track, { backgroundColor: mine ? 'rgba(255,255,255,0.35)' : colors.brand100 }]}>
        <View style={[styles.fill, { width: `${progress * 100}%`, backgroundColor: fg }]} />
      </View>
      <Txt size={13} color={fg}>{mmss(status.playing ? status.currentTime : total)}</Txt>
    </Pressable>
  )
}

/**
 * Big mic button: tap to start, tap the green button to send, or the bin to throw away.
 * Easier than press-and-hold for people who aren't used to phones.
 */
export function VoiceRecorder({ onSend, disabled, onRecordingChange }: {
  onSend: (file: UploadFile, seconds: number) => Promise<void>
  disabled?: boolean
  onRecordingChange?: (recording: boolean) => void
}) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY)
  const [recording, setRecording] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [busy, setBusy] = useState(false)
  const startedAt = useRef(0)

  useEffect(() => {
    if (!recording) return
    const timer = setInterval(() => {
      const s = (Date.now() - startedAt.current) / 1000
      setElapsed(s)
      if (s >= MAX_SECONDS) finish(true)
    }, 250)
    return () => clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recording])

  const start = async () => {
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
    setRecording(true)
    onRecordingChange?.(true)
  }

  async function finish(send: boolean) {
    if (!recording) return
    setRecording(false)
    onRecordingChange?.(false)
    const seconds = Math.max(1, Math.round((Date.now() - startedAt.current) / 1000))
    await recorder.stop()
    await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => {})
    const uri = recorder.uri
    if (!send || !uri || seconds < 1) return
    setBusy(true)
    try {
      let file: UploadFile
      if (Platform.OS === 'web') {
        const blob = await (await fetch(uri)).blob()
        file = { uri, name: 'voice.webm', type: blob.type || 'audio/webm', blob }
      } else {
        const ext = uri.split('.').pop()?.toLowerCase() ?? 'm4a'
        file = { uri, name: `voice.${ext}`, type: ext === '3gp' ? 'audio/3gpp' : 'audio/mp4' }
      }
      await onSend(file, Math.min(seconds, MAX_SECONDS))
    } finally {
      setBusy(false)
    }
  }

  if (recording) {
    return (
      <View style={styles.recBar}>
        <Pressable onPress={() => finish(false)} style={styles.recBtn} accessibilityRole="button" accessibilityLabel={t('ختم کریں')}>
          <MaterialCommunityIcons name="delete-outline" size={28} color={colors.danger} />
        </Pressable>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={styles.dot} />
          <Txt bold size={16}>{`${t('بول رہے ہیں…')} ${mmss(elapsed)}`}</Txt>
        </View>
        <Pressable onPress={() => finish(true)} style={[styles.recBtn, { backgroundColor: colors.brand700 }]} accessibilityRole="button" accessibilityLabel={t('بھیجیں')}>
          <MaterialCommunityIcons name="send" size={26} color={colors.white} />
        </Pressable>
      </View>
    )
  }

  return (
    <Pressable onPress={start} disabled={disabled || busy} style={[styles.mic, (disabled || busy) && { opacity: 0.5 }]}
      accessibilityRole="button" accessibilityLabel={t('آواز کا پیغام')}>
      <MaterialCommunityIcons name={busy ? 'progress-upload' : 'microphone'} size={28} color={colors.ink} />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  player: { flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 200, minHeight: 48 },
  track: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: 6 },
  mic: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
  recBar: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 56, paddingHorizontal: 6,
    backgroundColor: '#fef2f2', borderRadius: radius.full, borderWidth: 1, borderColor: '#fecaca',
  },
  recBtn: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.danger },
})
