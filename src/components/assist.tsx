import { Pressable, StyleSheet, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useAssistant } from '@/lib/assistant'
import { currentListenText, speak, stopSpeaking, useSpeaking } from '@/lib/listen'
import { colors } from '@/theme'
import { t } from '@/i18n'

/** Round speaker button: reads the important facts on this page aloud. */
export function ListenButton({ fallback }: { fallback?: string }) {
  const speaking = useSpeaking()
  return (
    <Pressable
      onPress={() => {
        if (speaking) return stopSpeaking()
        const text = currentListenText() ?? fallback
        if (text) speak(text)
      }}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={t(speaking ? 'روکیں' : 'سنیں')}
      style={({ pressed }) => [styles.btn, { backgroundColor: colors.gold }, pressed && { opacity: 0.8 }]}>
      <MaterialCommunityIcons name={speaking ? 'stop' : 'volume-high'} size={26} color={colors.ink} />
    </Pressable>
  )
}

/** Round microphone button: opens "speak to the app". */
export function MicButton({ light }: { light?: boolean }) {
  const { open } = useAssistant()
  return (
    <Pressable
      onPress={() => open()}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={t('بول کر بتائیں')}
      style={({ pressed }) => [styles.btn, { backgroundColor: light ? colors.white : colors.brand700 }, pressed && { opacity: 0.8 }]}>
      <MaterialCommunityIcons name="microphone" size={26} color={light ? colors.brand700 : colors.white} />
    </Pressable>
  )
}

/** The pair shown in every screen header, so listening and talking are always one tap away. */
export function HeaderAssist({ fallback, light }: { fallback?: string; light?: boolean }) {
  return (
    <View style={styles.row}>
      <ListenButton fallback={fallback} />
      <MicButton light={light} />
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  btn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
})
