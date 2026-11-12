import { useEffect, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { EmptyState, Notice, TopBar, Txt, type IconName } from '@/components/ui'
import { ListingFeed } from '@/components/listing-feed'
import { PagedList } from '@/components/paged-list'
import { RequestCard } from '@/components/request-card'
import { Button } from '@/components/ui'
import { ANIMAL_ICONS, getSection, SECTION_QUERY, type SectionId } from '@/data/sections'
import { api, type Category, type ListingQuery, type Purpose, type RequestQuery, type RequestSummary } from '@/lib/api'
import { useSession } from '@/lib/session'
import { colors, radius } from '@/theme'

type Sort = NonNullable<ListingQuery['sort']>

export default function FeedScreen() {
  const { section: sectionId, category, tab: tabParam } = useLocalSearchParams<{ section: string; category?: string; tab?: string }>()
  const section = getSection(sectionId)
  const { location } = useSession()
  const [categories, setCategories] = useState<Category[]>([])
  // Nearest first when we know the user's city; otherwise newest first.
  // (The city can load a moment after this screen opens, so the default is worked out on each render.)
  const [chosenSort, setSort] = useState<Sort | null>(null)
  const sort: Sort = chosenSort ?? (location ? 'nearest' : 'newest')

  useEffect(() => {
    api.categories().then(setCategories).catch(() => {})
  }, [])

  if (!section) {
    return (
      <View style={{ flex: 1 }}>
        <TopBar title="منڈی دوست" onBack={() => router.back()} />
        <EmptyState icon="map-marker-question-outline" title="یہ صفحہ نہیں ملا" />
      </View>
    )
  }

  const id = section.id as SectionId
  const base = SECTION_QUERY[id]
  // Restaurants come here mainly to post or browse requirements, everyone else to browse animals/goods.
  const tab: 'listings' | 'requests' = tabParam === 'requests' || tabParam === 'listings' ? tabParam : id === 'meat' ? 'requests' : 'listings'
  const requestPurpose: Purpose | undefined = id === 'qurbani' ? 'qurbani' : id === 'meat' ? 'meatSupply' : undefined
  const requestQuery: RequestQuery = {
    section: base.section,
    purpose: requestPurpose,
    category: category || undefined,
    sort: sort === 'nearest' && location ? 'nearest' : 'newest',
    locationId: sort === 'nearest' ? location?.id : undefined,
    radiusKm: sort === 'nearest' && location ? 300 : undefined,
  }
  // Only categories that make sense in this feed (e.g. no donkeys in the Qurbani feed)
  const chips = categories.filter((c) =>
    c.section === base.section && (!base.purpose || base.purpose.split(',').some((p) => c.purposes.includes(p as never))))

  const query: ListingQuery = {
    ...base,
    category: category || undefined,
    sort: sort === 'nearest' && !location ? 'newest' : sort,
    locationId: sort === 'nearest' ? location?.id : undefined,
    radiusKm: sort === 'nearest' && location ? 300 : undefined,
  }

  const header = (
    <View style={{ gap: 12 }}>
      <View style={[styles.hero, { backgroundColor: section.bg }]}>
        <MaterialCommunityIcons name={section.icon} size={40} color={section.color} />
        <Txt size={15} style={{ flex: 1 }}>{section.subtitle}</Txt>
      </View>

      <View style={styles.tabs}>
        <TabButton label={id === 'meat' ? 'ہوٹلوں کی ضرورتیں' : 'خریداروں کی ضرورتیں'} icon="clipboard-text-search-outline" on={tab === 'requests'}
          color={section.color} onPress={() => router.setParams({ tab: 'requests' })} />
        <TabButton label={section.items === 'fromApi' ? 'بکنے والے جانور' : 'بکنے والا مال'} icon="storefront-outline" on={tab === 'listings'}
          color={section.color} onPress={() => router.setParams({ tab: 'listings' })} />
      </View>

      {tab === 'requests' && (
        <Button
          label={id === 'meat' ? 'اپنی ضرورت بتائیں (کتنے جانور، کب)' : 'اپنی ضرورت بتائیں'}
          icon="bullhorn-outline"
          onPress={() => router.push({ pathname: '/request/new', params: { section: base.section, purpose: requestPurpose ?? '' } })}
        />
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        <Chip label="سب" icon="view-grid-outline" on={!category} color={section.color} onPress={() => router.setParams({ category: '' })} />
        {chips.map((c) => (
          <Chip
            key={c.slug}
            label={c.nameUr}
            icon={(c.section === 'livestock' ? ANIMAL_ICONS[c.slug] : c.iconKey) as IconName ?? 'tag-outline'}
            on={c.slug === category}
            color={section.color}
            onPress={() => router.setParams({ category: c.slug === category ? '' : c.slug })}
          />
        ))}
      </ScrollView>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        {location && <Chip label="قریب ترین" icon="map-marker-radius-outline" on={sort === 'nearest'} color={colors.ink} onPress={() => setSort('nearest')} />}
        <Chip label="نئے" icon="clock-outline" on={sort === 'newest'} color={colors.ink} onPress={() => setSort('newest')} />
        {tab === 'listings' && <Chip label="سستے پہلے" icon="sort-numeric-ascending" on={sort === 'priceAsc'} color={colors.ink} onPress={() => setSort('priceAsc')} />}
      </View>

      {id === 'meat' && tab === 'listings' && <Notice text="گوشت کا وزن ہمیشہ اندازہ ہوتا ہے، پکی بات نہیں۔ فی من قیمت بیچنے والے کی قیمت اور وزن سے نکالی گئی ہے" />}
      {id === 'qurbani' && tab === 'listings' && <Notice text="قربانی کی شرائط (عمر، دانت، صحت) خریدار خود جانور دیکھ کر تصدیق کرے" />}
    </View>
  )

  return (
    <View style={{ flex: 1 }}>
      <TopBar title={section.title} onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
      {tab === 'requests' ? (
        <PagedList<RequestSummary>
          source={(page) => api.requests({ ...requestQuery, page, pageSize: 20 })}
          sourceKey={`req:${JSON.stringify(requestQuery)}`}
          renderItem={(item) => <RequestCard item={item} />}
          header={header}
          emptyTitle="ابھی کوئی ضرورت نہیں لگی"
          emptyText="ہوٹل، قصائی اور بیوپاری یہاں بتاتے ہیں کہ انہیں کیا چاہیے۔ بیچنے والے پیشکش بھیجتے ہیں"
        />
      ) : (
        <ListingFeed
          query={query}
          view={id}
          header={header}
          emptyText="جب کوئی اس حصے میں اشتہار لگائے گا تو یہاں نظر آئے گا"
        />
      )}
    </View>
  )
}

function TabButton({ label, icon, on, color, onPress }: { label: string; icon: IconName; on: boolean; color: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="tab" accessibilityState={{ selected: on }}
      style={[styles.tab, on && { backgroundColor: color }]}>
      <MaterialCommunityIcons name={icon} size={20} color={on ? colors.white : color} />
      <Txt bold size={14} color={on ? colors.white : colors.ink} center>{label}</Txt>
    </Pressable>
  )
}

function Chip({ label, icon, on, color, onPress }: { label: string; icon: IconName; on: boolean; color: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, on && { backgroundColor: color, borderColor: color }]}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}>
      <MaterialCommunityIcons name={icon} size={20} color={on ? colors.white : color} />
      <Txt bold size={14} color={on ? colors.white : colors.ink}>{label}</Txt>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', gap: 6, padding: 4, backgroundColor: colors.white, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 50, borderRadius: radius.md, paddingHorizontal: 6 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: radius.lg },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 46, paddingHorizontal: 14,
    backgroundColor: colors.white, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border,
  },
})
