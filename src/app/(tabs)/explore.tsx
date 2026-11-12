import { useCallback, useEffect, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Button, Field, Loading, Notice, Txt } from '@/components/ui'
import { api, type Category } from '@/lib/api'
import { errorMessage } from '@/lib/errors'
import { ANIMAL_ICONS, SECTIONS } from '@/data/sections'
import { colors, radius } from '@/theme'

export default function Explore() {
  const insets = useSafeAreaInsets()
  const { voice } = useLocalSearchParams<{ voice?: string }>()
  const [q, setQ] = useState('')
  const [categories, setCategories] = useState<Category[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      setCategories(await api.categories())
    } catch (e) {
      setError(errorMessage(e))
    }
  }, [])
  useEffect(() => {
    api.categories().then(setCategories, (e) => setError(errorMessage(e)))
  }, [])

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingTop: insets.top + 12, gap: 14 }} keyboardShouldPersistTaps="handled">
      <Txt bold size={24}>تلاش</Txt>
      <Field label="کیا ڈھونڈ رہے ہیں؟" placeholder="مثلاً: بیتل بکرا، ساہیوال گائے، گندم" icon="magnify" value={q} onChangeText={setQ} returnKeyType="search" />
      {voice === '1' && (
        <Notice text="بول کر تلاش ایپ کے اگلے ورژن میں آئے گی۔ ابھی لکھ کر تلاش کریں" icon="microphone-off" />
      )}
      {q.trim().length > 0 && <Notice text="اشتہارات میں تلاش اگلے مرحلے میں سرور سے جوڑی جائے گی" />}

      <Txt bold size={18}>جانوروں کی قسمیں</Txt>
      {error ? (
        <View style={{ gap: 10 }}>
          <Notice tone="error" text={error} />
          <Button label="دوبارہ کوشش کریں" icon="refresh" variant="outline" onPress={load} />
        </View>
      ) : !categories ? (
        <Loading />
      ) : (
        <View style={styles.grid}>
          {categories.map((c) => (
            <Pressable
              key={c.id}
              onPress={() => router.push({ pathname: '/feed/[section]', params: { section: 'livestock', category: c.slug } })}
              style={({ pressed }) => [styles.tile, pressed && { opacity: 0.8 }]}
              accessibilityRole="button">
              <MaterialCommunityIcons name={ANIMAL_ICONS[c.slug] ?? 'paw'} size={36} color={colors.brand700} />
              <Txt bold size={15} center>{c.nameUr}</Txt>
            </Pressable>
          ))}
        </View>
      )}

      <Txt bold size={18}>منڈی کے حصے</Txt>
      <View style={{ gap: 8 }}>
        {SECTIONS.map((s) => (
          <Pressable
            key={s.id}
            onPress={() => router.push({ pathname: '/feed/[section]', params: { section: s.id } })}
            style={({ pressed }) => [styles.row, pressed && { opacity: 0.8 }]}
            accessibilityRole="button">
            <View style={[styles.rowIcon, { backgroundColor: s.bg }]}>
              <MaterialCommunityIcons name={s.icon} size={26} color={s.color} />
            </View>
            <Txt bold size={16} style={{ flex: 1 }}>{s.title}</Txt>
            <MaterialCommunityIcons name="chevron-left" size={26} color={colors.muted} />
          </Pressable>
        ))}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: {
    width: '31%', flexGrow: 1, minHeight: 104, alignItems: 'center', justifyContent: 'center', gap: 2,
    backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: 8,
  },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, paddingHorizontal: 12,
    backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
  },
  rowIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
})
