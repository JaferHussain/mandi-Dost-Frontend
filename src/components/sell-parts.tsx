import { Alert, Platform, Pressable, StyleSheet, View } from 'react-native'
import { Image } from 'expo-image'
import * as ImagePicker from 'expo-image-picker'
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { colors, radius, touch } from '@/theme'
import { t } from '@/i18n'
import { Txt, type IconName } from './ui'

// Small pieces used by the Sell form. Big targets, pictures and choices instead of typing.

export function Choice({ label, icon, on, onPress, wide }: { label: string; icon?: IconName; on: boolean; onPress: () => void; wide?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      style={({ pressed }) => [styles.choice, wide && { flexBasis: '100%' }, on && styles.choiceOn, pressed && { opacity: 0.85 }]}>
      {icon && <MaterialCommunityIcons name={icon} size={24} color={on ? colors.white : colors.brand700} />}
      <Txt bold size={15} color={on ? colors.white : colors.ink}>{label}</Txt>
      {on && <MaterialCommunityIcons name="check" size={18} color={colors.white} />}
    </Pressable>
  )
}

export function ChoiceGroup({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <View style={{ gap: 6 }}>
      <Txt bold size={16}>{label}</Txt>
      {hint && <Txt size={13} color={colors.muted}>{hint}</Txt>}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{children}</View>
    </View>
  )
}

/** Big picture tile for choosing a category or section. */
export function Tile({ label, sub, icon, on, onPress, color = colors.brand700, bg = colors.white }: {
  label: string; sub?: string; icon: IconName; on?: boolean; onPress: () => void; color?: string; bg?: string
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!on }}
      style={({ pressed }) => [styles.tile, { backgroundColor: bg }, on && { borderColor: color, borderWidth: 3 }, pressed && { transform: [{ scale: 0.97 }] }]}>
      <MaterialCommunityIcons name={icon} size={40} color={color} />
      <Txt bold size={15} center>{label}</Txt>
      {sub && <Txt size={12} center color={colors.muted}>{sub}</Txt>}
    </Pressable>
  )
}

/** Turns Urdu/Arabic-Indic digits and commas into a plain number string. */
export function digitsOnly(input: string, allowDecimal = false): string {
  const western = input
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
  return allowDecimal ? western.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1') : western.replace(/\D/g, '')
}

export type Photo = { uri: string; width: number; height: number }

/**
 * Pick or take photos, then shrink them to 1280 px JPEG (~150–300 KB) before upload,
 * so selling works on slow mobile data.
 */
export async function pickPhotos(source: 'camera' | 'library', remaining: number): Promise<Photo[]> {
  if (remaining <= 0) return []
  if (source === 'camera') {
    const perm = await ImagePicker.requestCameraPermissionsAsync()
    if (!perm.granted) {
      Alert.alert(t('کیمرہ کی اجازت نہیں ملی'), t('فون کی سیٹنگ میں منڈی دوست کو کیمرہ کی اجازت دیں'))
      return []
    }
  }
  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    quality: 0.8,
    allowsMultipleSelection: source === 'library',
    selectionLimit: remaining,
  }
  const result = source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options)
  if (result.canceled) return []

  const out: Photo[] = []
  for (const asset of result.assets.slice(0, remaining)) {
    try {
      const ctx = ImageManipulator.manipulate(asset.uri)
      if (asset.width > 1280) ctx.resize({ width: 1280 })
      const ref = await ctx.renderAsync()
      const saved = await ref.saveAsync({ compress: 0.7, format: SaveFormat.JPEG })
      out.push({ uri: saved.uri, width: saved.width, height: saved.height })
    } catch {
      out.push({ uri: asset.uri, width: asset.width, height: asset.height }) // fall back to the original
    }
  }
  return out
}

/** What api.uploadPhoto needs. On the web preview the picked file must be read into a Blob. */
export async function toUpload(photo: Photo, index: number) {
  const name = `photo-${index + 1}.jpg`
  if (Platform.OS === 'web') {
    const blob = await (await fetch(photo.uri)).blob()
    return { uri: photo.uri, name, type: blob.type || 'image/jpeg', blob }
  }
  return { uri: photo.uri, name, type: 'image/jpeg' }
}

export function PhotoGrid({ photos, onRemove }: { photos: Photo[]; onRemove: (i: number) => void }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {photos.map((p, i) => (
        <View key={p.uri} style={styles.photo}>
          <Image source={p.uri} style={StyleSheet.absoluteFill} contentFit="cover" />
          {i === 0 && <View style={styles.cover}><Txt bold size={11} color={colors.white}>پہلی تصویر</Txt></View>}
          <Pressable onPress={() => onRemove(i)} style={styles.remove} accessibilityRole="button" accessibilityLabel={t('تصویر ہٹائیں')} hitSlop={6}>
            <MaterialCommunityIcons name="close" size={18} color={colors.white} />
          </Pressable>
        </View>
      ))}
    </View>
  )
}

export function Toggle({ label, value, onChange, icon }: { label: string; value: boolean; onChange: (v: boolean) => void; icon?: IconName }) {
  return (
    <Pressable onPress={() => onChange(!value)} accessibilityRole="switch" accessibilityState={{ checked: value }} style={styles.toggle}>
      {icon && <MaterialCommunityIcons name={icon} size={24} color={colors.brand700} />}
      <Txt bold size={15} style={{ flex: 1 }}>{label}</Txt>
      <View style={[styles.switch, value && styles.switchOn]}>
        <View style={[styles.knob, value && styles.knobOn]} />
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  choice: {
    flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: touch - 4, paddingHorizontal: 14,
    backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 2, borderColor: colors.border,
  },
  choiceOn: { backgroundColor: colors.brand700, borderColor: colors.brand700 },
  tile: {
    width: '31%', flexGrow: 1, minHeight: 116, alignItems: 'center', justifyContent: 'center', gap: 2, padding: 8,
    borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border,
  },
  photo: { width: 104, height: 104, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.sand },
  cover: { position: 'absolute', bottom: 0, start: 0, end: 0, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center' },
  remove: {
    position: 'absolute', top: 4, end: 4, width: 30, height: 30, borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center',
  },
  toggle: {
    flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: touch, paddingHorizontal: 14,
    backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
  },
  switch: { width: 52, height: 30, borderRadius: 15, backgroundColor: '#d6d3c8', padding: 3, justifyContent: 'center' },
  switchOn: { backgroundColor: colors.brand600 },
  knob: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.white, alignSelf: 'flex-start' },
  knobOn: { alignSelf: 'flex-end' },
})
