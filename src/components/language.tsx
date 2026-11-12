import { Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import * as Speech from 'expo-speech'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { LANGUAGES, type LangId } from '@/i18n'
import { colors, radius } from '@/theme'
import { Sheet, Txt } from './ui'

function sayGreeting(id: LangId) {
  const lang = LANGUAGES.find((l) => l.id === id)!
  Speech.stop()
  // Phones have no Punjabi (Shahmukhi) or Saraiki voice; the Urdu voice reads these understandably.
  Speech.speak(lang.greeting, { language: 'ur-PK', rate: 0.9 })
}

function LanguageOption({ id, selected, onPick }: { id: LangId; selected?: boolean; onPick: (id: LangId) => void }) {
  const lang = LANGUAGES.find((l) => l.id === id)!
  return (
    <View style={[styles.option, selected && styles.optionSelected]}>
      <Pressable
        onPress={() => onPick(id)}
        accessibilityRole="button"
        accessibilityLabel={lang.name}
        style={({ pressed }) => [styles.optionMain, pressed && { opacity: 0.8 }]}>
        <View style={[styles.radio, selected && styles.radioOn]}>
          {selected && <MaterialCommunityIcons name="check" size={22} color={colors.white} />}
        </View>
        <View style={{ flex: 1 }}>
          {/* Language names are shown in their own script and never translated */}
          <Txt bold size={24}>{lang.name}</Txt>
          <Txt size={14} color={colors.muted}>{lang.hint}</Txt>
        </View>
      </Pressable>
      <Pressable onPress={() => sayGreeting(id)} style={styles.listen} accessibilityRole="button" accessibilityLabel="سنیں">
        <MaterialCommunityIcons name="volume-high" size={26} color={colors.ink} />
      </Pressable>
    </View>
  )
}

/** Full screen shown once, before anything else. */
export function FirstLaunchLanguage({ onPick }: { onPick: (id: LangId) => void }) {
  const insets = useSafeAreaInsets()
  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.cream }} contentContainerStyle={{ padding: 20, paddingTop: insets.top + 32, gap: 14 }}>
      <View style={styles.logo}>
        <MaterialCommunityIcons name="cow" size={56} color={colors.white} />
      </View>
      <Txt bold size={30} center>منڈی دوست</Txt>
      <Txt bold size={20} center>اپنی زبان چنیں</Txt>
      <Txt size={15} center color={colors.muted}>بعد میں پروفائل سے بدل سکتے ہیں</Txt>
      <View style={{ gap: 12, marginTop: 8 }}>
        {LANGUAGES.map((l) => (
          <LanguageOption key={l.id} id={l.id} onPick={onPick} />
        ))}
      </View>
    </ScrollView>
  )
}

export function LanguageSheet({ open, onClose, value, onPick }: { open: boolean; onClose: () => void; value: LangId | null; onPick: (id: LangId) => void }) {
  return (
    <Sheet open={open} onClose={onClose} title="زبان چنیں">
      <View style={{ gap: 12 }}>
        {LANGUAGES.map((l) => (
          <LanguageOption key={l.id} id={l.id} selected={l.id === value} onPick={(id) => { onClose(); if (id !== value) onPick(id) }} />
        ))}
      </View>
    </Sheet>
  )
}

const styles = StyleSheet.create({
  logo: {
    alignSelf: 'center', width: 96, height: 96, borderRadius: 30, backgroundColor: colors.brand700,
    alignItems: 'center', justifyContent: 'center',
  },
  option: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderRadius: radius.lg,
    borderWidth: 2, borderColor: colors.border, paddingStart: 14, paddingEnd: 8,
  },
  optionSelected: { borderColor: colors.brand600, backgroundColor: colors.brand50 },
  optionMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 84 },
  radio: {
    width: 34, height: 34, borderRadius: 17, borderWidth: 2, borderColor: '#cbd5c8',
    alignItems: 'center', justifyContent: 'center',
  },
  radioOn: { backgroundColor: colors.brand600, borderColor: colors.brand600 },
  listen: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: colors.gold,
    alignItems: 'center', justifyContent: 'center',
  },
})
