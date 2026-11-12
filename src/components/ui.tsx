import { useEffect, useState, type ReactNode } from 'react'
import {
  ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
  type StyleProp, type TextInputProps, type TextStyle, type ViewStyle,
} from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import * as Speech from 'expo-speech'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors, fonts, lineHeightFor, radius, touch } from '../theme'
import { t } from '../i18n'

export type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name']

// ---- Text ------------------------------------------------------------------

type TxtProps = {
  children?: ReactNode
  size?: number
  bold?: boolean
  color?: string
  center?: boolean
  numberOfLines?: number
  style?: StyleProp<TextStyle>
}

/** All UI text goes through this: Nastaliq font, safe line height, automatic translation of plain strings. */
export function Txt({ children, size = 16, bold, color = colors.ink, center, numberOfLines, style }: TxtProps) {
  const content = typeof children === 'string' ? t(children) : children
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[
        { fontFamily: bold ? fonts.urduBold : fonts.urdu, fontSize: size, lineHeight: lineHeightFor(size), color },
        center && { textAlign: 'center' },
        style,
      ]}>
      {content}
    </Text>
  )
}

/** Numbers and phone numbers read more clearly in the plain system font, left-to-right. */
export function Num({ children, size = 16, bold, color = colors.ink }: { children: ReactNode; size?: number; bold?: boolean; color?: string }) {
  return <Text style={{ fontSize: size, fontWeight: bold ? '700' : '400', color, writingDirection: 'ltr' }}>{children}</Text>
}

// ---- Buttons ---------------------------------------------------------------

type ButtonProps = {
  label: string
  onPress?: () => void
  icon?: IconName
  variant?: 'primary' | 'outline' | 'soft' | 'danger'
  loading?: boolean
  disabled?: boolean
  style?: StyleProp<ViewStyle>
}

export function Button({ label, onPress, icon, variant = 'primary', loading, disabled, style }: ButtonProps) {
  const v = BUTTON_VARIANTS[variant]
  const off = disabled || loading
  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      accessibilityRole="button"
      accessibilityLabel={t(label)}
      accessibilityState={{ disabled: !!off, busy: !!loading }}
      style={({ pressed }) => [styles.button, v.box, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }, off && { opacity: 0.55 }, style]}>
      {loading ? <ActivityIndicator color={v.text} /> : icon ? <MaterialCommunityIcons name={icon} size={24} color={v.text} /> : null}
      <Txt bold size={17} color={v.text}>{label}</Txt>
    </Pressable>
  )
}

const BUTTON_VARIANTS = {
  primary: { box: { backgroundColor: colors.brand700 }, text: colors.white },
  outline: { box: { backgroundColor: colors.white, borderWidth: 2, borderColor: colors.brand700 }, text: colors.brand700 },
  soft: { box: { backgroundColor: colors.brand100 }, text: colors.brand800 },
  danger: { box: { backgroundColor: colors.dangerBg, borderWidth: 1, borderColor: '#fecaca' }, text: colors.danger },
}

/** Yellow "سنیں" button: reads the text aloud in Urdu for users who don't read. */
export function SpeakButton({ text, style }: { text: string; style?: StyleProp<ViewStyle> }) {
  const [speaking, setSpeaking] = useState(false)
  useEffect(() => () => void Speech.stop(), [])
  const toggle = () => {
    if (speaking) {
      Speech.stop()
      setSpeaking(false)
      return
    }
    setSpeaking(true)
    Speech.speak(t(text), {
      language: 'ur-PK',
      rate: 0.9,
      onDone: () => setSpeaking(false),
      onStopped: () => setSpeaking(false),
      onError: () => setSpeaking(false),
    })
  }
  return (
    <Pressable onPress={toggle} accessibilityRole="button" accessibilityLabel={t('سنیں')} style={[styles.speak, style]}>
      <MaterialCommunityIcons name={speaking ? 'stop' : 'volume-high'} size={22} color={colors.ink} />
      <Txt bold size={14}>{speaking ? 'روکیں' : 'سنیں'}</Txt>
    </Pressable>
  )
}

// ---- Inputs ----------------------------------------------------------------

type FieldProps = Omit<TextInputProps, 'style' | 'placeholder'> & {
  label: string
  placeholder?: string
  icon?: IconName
  error?: string | null
  ltr?: boolean
}

export function Field({ label, placeholder, icon, error, ltr, ...input }: FieldProps) {
  const [focused, setFocused] = useState(false)
  return (
    <View style={{ gap: 4 }}>
      <Txt bold size={15}>{label}</Txt>
      <View style={[styles.field, focused && { borderColor: colors.brand600 }, !!error && { borderColor: colors.danger }]}>
        {icon && <MaterialCommunityIcons name={icon} size={24} color={colors.muted} />}
        <TextInput
          {...input}
          placeholder={placeholder ? t(placeholder) : undefined}
          placeholderTextColor="#9ca39a"
          onFocus={(e) => { setFocused(true); input.onFocus?.(e) }}
          onBlur={(e) => { setFocused(false); input.onBlur?.(e) }}
          style={[
            styles.input,
            ltr ? { fontSize: 20, writingDirection: 'ltr', letterSpacing: 1 } : { fontFamily: fonts.urdu, fontSize: 17, writingDirection: 'rtl' },
          ]}
        />
      </View>
      {!!error && <Txt size={14} color={colors.danger}>{error}</Txt>}
    </View>
  )
}

// ---- Layout pieces ---------------------------------------------------------

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>
}

/** Coloured message box for errors, notes and "coming next" notices. */
export function Notice({ text, tone = 'info', icon }: { text: string; tone?: 'info' | 'error' | 'success'; icon?: IconName }) {
  const c = NOTICE[tone]
  return (
    <View style={[styles.notice, { backgroundColor: c.bg, borderColor: c.border }]}>
      <MaterialCommunityIcons name={icon ?? c.icon} size={22} color={c.fg} />
      <Txt size={14} color={c.fg} style={{ flex: 1 }}>{text}</Txt>
    </View>
  )
}

const NOTICE = {
  info: { bg: '#fffbeb', border: '#fde68a', fg: '#78350f', icon: 'information-outline' as IconName },
  error: { bg: colors.dangerBg, border: '#fecaca', fg: colors.danger, icon: 'alert-circle-outline' as IconName },
  success: { bg: colors.brand50, border: colors.brand200, fg: colors.brand800, icon: 'check-circle-outline' as IconName },
}

/** Plain top bar for inner screens. */
export function TopBar({ title, onBack, right }: { title: string; onBack?: () => void; right?: ReactNode }) {
  const insets = useSafeAreaInsets()
  return (
    <View style={[styles.topBar, { paddingTop: insets.top + 6 }]}>
      {onBack && (
        <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel={t('واپس')} style={styles.iconBtn} hitSlop={8}>
          {/* In right-to-left layout "back" points to the right */}
          <MaterialCommunityIcons name="arrow-right" size={26} color={colors.ink} />
        </Pressable>
      )}
      <Txt bold size={20} style={{ flex: 1 }} numberOfLines={1}>{title}</Txt>
      {right}
    </View>
  )
}

/** Bottom sheet built on Modal – used for choosing city and language. */
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const insets = useSafeAreaInsets()
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={t('بند کریں')} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.grabber} />
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <Txt bold size={19} style={{ flex: 1 }}>{title}</Txt>
          <Pressable onPress={onClose} style={styles.iconBtn} accessibilityRole="button" accessibilityLabel={t('بند کریں')}>
            <MaterialCommunityIcons name="close" size={26} color={colors.ink} />
          </Pressable>
        </View>
        <ScrollView keyboardShouldPersistTaps="handled">{children}</ScrollView>
      </View>
    </Modal>
  )
}

export function Loading({ label = 'لوڈ ہو رہا ہے…' }: { label?: string }) {
  return (
    <View style={{ padding: 32, alignItems: 'center', gap: 8 }}>
      <ActivityIndicator size="large" color={colors.brand700} />
      <Txt color={colors.muted}>{label}</Txt>
    </View>
  )
}

export function EmptyState({ icon, title, text, action }: { icon: IconName; title: string; text?: string; action?: ReactNode }) {
  return (
    <View style={{ alignItems: 'center', padding: 24, gap: 6 }}>
      <View style={styles.emptyIcon}>
        <MaterialCommunityIcons name={icon} size={44} color={colors.brand700} />
      </View>
      <Txt bold size={18} center>{title}</Txt>
      {text && <Txt color={colors.muted} center>{text}</Txt>}
      {action && <View style={{ marginTop: 10, alignSelf: 'stretch' }}>{action}</View>}
    </View>
  )
}

const styles = StyleSheet.create({
  button: {
    minHeight: touch, borderRadius: radius.md, paddingHorizontal: 18,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  speak: {
    flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.gold,
    borderRadius: radius.full, paddingHorizontal: 14, minHeight: 44,
  },
  field: {
    flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: touch,
    backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 2, borderColor: colors.border, paddingHorizontal: 12,
  },
  input: { flex: 1, color: colors.ink, paddingVertical: 10, minHeight: touch },
  card: {
    backgroundColor: colors.white, borderRadius: radius.lg, padding: 16,
    borderWidth: 1, borderColor: colors.border,
  },
  notice: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: radius.md, borderWidth: 1 },
  topBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingBottom: 8,
    backgroundColor: colors.cream, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  iconBtn: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: colors.cream, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 16, paddingTop: 8, maxHeight: '85%',
  },
  grabber: { alignSelf: 'center', width: 48, height: 5, borderRadius: 3, backgroundColor: '#d6d3c8', marginBottom: 8 },
  emptyIcon: { width: 84, height: 84, borderRadius: 42, backgroundColor: colors.brand100, alignItems: 'center', justifyContent: 'center' },
})
