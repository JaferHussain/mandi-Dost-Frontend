import { useCallback, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Button, EmptyState, Loading, SpeakButton, Txt } from '@/components/ui'
import { ListenButton } from '@/components/assist'
import { Bell } from '@/components/bell'
import { useAssistant } from '@/lib/assistant'
import { useListen } from '@/lib/listen'
import { ListingCard } from '@/components/listing-card'
import { api, type ListingSummary } from '@/lib/api'
import { LocationSheet } from '@/components/location'
import { LanguageSheet } from '@/components/language'
import { SECTIONS, type Section } from '@/data/sections'
import { useSession } from '@/lib/session'
import { LANGUAGES } from '@/i18n'
import { colors, radius } from '@/theme'

const HOME_GUIDE =
  'منڈی دوست میں خوش آمدید۔ نیچے پانچ بڑے خانے ہیں: قربانی کے جانور، ہوٹل اور ریسٹورنٹ، عام جانور، فصلیں، اور زرعی سامان۔ جو خریدنا ہو اس پر انگلی رکھیں۔ کچھ بیچنا ہو تو نیچے درمیان والا سبز بٹن دبائیں۔'

export default function Home() {
  const insets = useSafeAreaInsets()
  const { location, lang, setLang } = useSession()
  const [cityOpen, setCityOpen] = useState(false)
  const [langOpen, setLangOpen] = useState(false)
  const { open: openAssistant } = useAssistant()
  useListen(HOME_GUIDE)
  const langName = LANGUAGES.find((l) => l.id === lang)?.name ?? 'اردو'

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }}>
      {/* Green header: name, city, language, search */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerRow}>
          <Txt bold size={24} color={colors.white} style={{ flex: 1 }}>منڈی دوست</Txt>
          <Bell light />
          <ListenButton fallback={HOME_GUIDE} />
          <Pressable onPress={() => setLangOpen(true)} style={styles.chip} accessibilityRole="button" accessibilityLabel={langName}>
            <MaterialCommunityIcons name="translate" size={20} color={colors.white} />
            <Txt bold size={14} color={colors.white}>{langName}</Txt>
          </Pressable>
        </View>

        <Pressable onPress={() => setCityOpen(true)} style={styles.city} accessibilityRole="button">
          <MaterialCommunityIcons name="map-marker" size={22} color={colors.gold} />
          <Txt bold size={16} color={colors.white}>{location?.nameUr ?? 'شہر چنیں'}</Txt>
          <MaterialCommunityIcons name="chevron-down" size={22} color={colors.white} />
        </Pressable>

        <View style={styles.searchRow}>
          <Pressable onPress={() => router.navigate('/explore')} style={styles.search} accessibilityRole="search">
            <MaterialCommunityIcons name="magnify" size={26} color={colors.muted} />
            <Txt size={16} color={colors.muted}>آپ کیا خریدنا چاہتے ہیں؟</Txt>
          </Pressable>
          <Pressable onPress={() => openAssistant()} style={styles.mic} accessibilityRole="button" accessibilityLabel="بول کر بتائیں">
            <MaterialCommunityIcons name="microphone" size={28} color={colors.ink} />
          </Pressable>
        </View>
      </View>

      <View style={styles.titleRow}>
        <Txt bold size={19} style={{ flex: 1 }}>کیا خریدنا ہے؟</Txt>
        <SpeakButton text={HOME_GUIDE} />
      </View>

      {/* Five big picture cards */}
      <View style={styles.grid}>
        {SECTIONS.map((s, i) => (
          <SectionCard key={s.id} section={s} wide={i === SECTIONS.length - 1} />
        ))}
      </View>

      {/* Restaurants, butchers and traders post what they need; sellers answer with offers */}
      <Pressable
        onPress={() => router.push({ pathname: '/feed/[section]', params: { section: 'meat', tab: 'requests' } })}
        accessibilityRole="button"
        style={({ pressed }) => [styles.requestsCard, pressed && { opacity: 0.9 }]}>
        <MaterialCommunityIcons name="bullhorn-outline" size={30} color={colors.white} />
        <View style={{ flex: 1 }}>
          <Txt bold size={16} color={colors.white}>خریداروں کی ضرورتیں</Txt>
          <Txt size={13} color="rgba(255,255,255,0.9)">ہوٹل اور بیوپاری بتاتے ہیں کیا چاہیے۔ آپ پیشکش بھیجیں</Txt>
        </View>
        <MaterialCommunityIcons name="chevron-left" size={26} color={colors.white} />
      </Pressable>

      <Pressable onPress={() => router.push('/tools/weight')} accessibilityRole="button"
        style={({ pressed }) => [styles.toolCard, pressed && { opacity: 0.9 }]}>
        <MaterialCommunityIcons name="tape-measure" size={28} color={colors.brand700} />
        <View style={{ flex: 1 }}>
          <Txt bold size={16}>فیتے سے وزن معلوم کریں</Txt>
          <Txt size={13} color={colors.muted}>چھاتی کا گھیر اور لمبائی لکھیں، کلو اور من میں اندازہ</Txt>
        </View>
        <MaterialCommunityIcons name="chevron-left" size={26} color={colors.muted} />
      </Pressable>

      <View style={[styles.titleRow, { marginTop: 8 }]}>
        <Txt bold size={19} style={{ flex: 1 }}>{location ? 'آپ کے قریب نئے اشتہار' : 'نئے اشتہارات'}</Txt>
        <Pressable onPress={() => router.navigate('/explore')} accessibilityRole="button" hitSlop={8}>
          <Txt bold size={14} color={colors.brand700}>سب دیکھیں</Txt>
        </Pressable>
      </View>
      <RecentListings locationId={location?.id} />

      <LocationSheet open={cityOpen} onClose={() => setCityOpen(false)} />
      <LanguageSheet open={langOpen} onClose={() => setLangOpen(false)} value={lang} onPick={setLang} />
    </ScrollView>
  )
}

/** The 5 newest listings (nearest first when the city is known). Refreshes when Home is shown again. */
function RecentListings({ locationId }: { locationId?: number }) {
  const [items, setItems] = useState<ListingSummary[] | null>(null)
  const [failed, setFailed] = useState(false)
  useFocusEffect(
    useCallback(() => {
      let alive = true
      api
        .listings(locationId ? { sort: 'nearest', locationId, radiusKm: 300, pageSize: 5 } : { pageSize: 5 })
        .then(
          (r) => {
            if (!alive) return
            setItems(r.items)
            setFailed(false)
          },
          () => {
            if (alive) setFailed(true)
          },
        )
      return () => { alive = false }
    }, [locationId]),
  )
  if (failed && !items) {
    return <View style={styles.emptyBox}><EmptyState icon="wifi-off" title="اشتہار لوڈ نہیں ہو سکے" text="انٹرنیٹ چیک کریں" /></View>
  }
  if (!items) return <Loading />
  if (items.length === 0) {
    return (
      <View style={styles.emptyBox}>
        <EmptyState icon="clipboard-text-clock-outline" title="ابھی کوئی اشتہار نہیں" text="سب سے پہلے اپنا جانور یا فصل بیچیں"
          action={<Button label="بیچیں" icon="plus" onPress={() => router.navigate('/sell')} />} />
      </View>
    )
  }
  return <View style={{ paddingHorizontal: 16, gap: 10 }}>{items.map((i) => <ListingCard key={i.id} item={i} />)}</View>
}

function SectionCard({ section, wide }: { section: Section; wide?: boolean }) {
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/feed/[section]', params: { section: section.id } })}
      accessibilityRole="button"
      style={({ pressed }) => [styles.card, { backgroundColor: section.bg }, wide && styles.cardWide, pressed && { transform: [{ scale: 0.97 }] }]}>
      <View style={[styles.cardIcon, { backgroundColor: section.color }]}>
        <MaterialCommunityIcons name={section.icon} size={wide ? 34 : 40} color={colors.white} />
      </View>
      <View style={wide ? { flex: 1 } : undefined}>
        <Txt bold size={17} color={section.color}>{section.title}</Txt>
        <Txt size={13} color={colors.ink} numberOfLines={1}>{section.subtitle}</Txt>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.brand700, paddingHorizontal: 16, paddingBottom: 18,
    borderBottomLeftRadius: 28, borderBottomRightRadius: 28, gap: 6,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, paddingHorizontal: 12,
    borderRadius: radius.full, backgroundColor: 'rgba(255,255,255,0.15)',
  },
  city: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', minHeight: 44 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  search: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 58, paddingHorizontal: 14,
    backgroundColor: colors.white, borderRadius: radius.md,
  },
  mic: { width: 58, height: 58, borderRadius: radius.md, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginTop: 16, marginBottom: 8, gap: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 10 },
  card: { width: '47.5%', flexGrow: 1, borderRadius: radius.lg, padding: 14, gap: 8, minHeight: 150, borderWidth: 1, borderColor: colors.border },
  cardWide: { width: '100%', minHeight: 0, flexDirection: 'row', alignItems: 'center', gap: 14 },
  cardIcon: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  toolCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 12, marginTop: 10, padding: 14,
    borderRadius: radius.lg, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border,
  },
  requestsCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 12, marginTop: 10, padding: 14,
    borderRadius: radius.lg, backgroundColor: '#7f1d1d',
  },
  emptyBox: { marginHorizontal: 16, backgroundColor: colors.white, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
})
