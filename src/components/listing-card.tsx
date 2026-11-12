import { Pressable, StyleSheet, View } from 'react-native'
import { Image } from 'expo-image'
import { router } from 'expo-router'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { mediaUrl, type ListingSummary } from '@/lib/api'
import {
  formatAge, formatPrice, formatQuantity, GENDER_LABEL, priceUnitLabel, pricePerMaund, PURPOSE_LABEL, STATUS_LABEL, TEETH_LABEL, timeAgo,
} from '@/lib/format'
import type { SectionId } from '@/data/sections'
import { ANIMAL_ICONS } from '@/data/sections'
import { colors, radius } from '@/theme'
import { t } from '@/i18n'
import { Txt, type IconName } from './ui'

/**
 * A listing in a feed. `view` is the buyer's purpose: the same bull shows teeth and
 * age in the Qurbani feed, weight and price per maund in the restaurant feed.
 */
export function ListingCard({ item, view, showStatus }: { item: ListingSummary; view?: SectionId; showStatus?: boolean }) {
  const facts = factsFor(item, view)
  const thumb = mediaUrl(item.thumbnailUrl)
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/listing/[id]', params: { id: String(item.id), view: view ?? '' } })}
      accessibilityRole="button"
      accessibilityLabel={item.title}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] }]}>
      <View style={styles.thumb}>
        {thumb ? (
          <Image source={thumb} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} cachePolicy="disk" />
        ) : (
          <MaterialCommunityIcons name={iconFor(item)} size={44} color={colors.brand700} />
        )}
        {item.qurbaniShares === 7 && view === 'qurbani' && (
          <View style={styles.badge}><Txt bold size={11} color={colors.white}>7 حصے</Txt></View>
        )}
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Txt bold size={16} numberOfLines={1}>{item.title}</Txt>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
          <Txt bold size={17} color={colors.brand700}>{formatPrice(item.price)}</Txt>
          {item.price != null && <Txt size={12} color={colors.muted}>{priceUnitLabel(item.priceUnit, item.section)}</Txt>}
        </View>
        {facts.length > 0 && (
          <View style={styles.facts}>
            {facts.map((f) => (
              <View key={f} style={styles.fact}><Txt size={12}>{f}</Txt></View>
            ))}
          </View>
        )}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <MaterialCommunityIcons name="map-marker-outline" size={14} color={colors.muted} />
          <Txt size={12} color={colors.muted} numberOfLines={1} style={{ flexShrink: 1 }}>
            {[item.locationNameUr, item.distanceKm != null ? `${Math.round(item.distanceKm)} ${t('کلومیٹر')}` : null, timeAgo(item.publishedAtUtc)]
              .filter(Boolean).join(' · ')}
          </Txt>
          {showStatus && (
            <View style={[styles.status, { backgroundColor: STATUS_COLOR[item.status] ?? colors.sand }]}>
              <Txt bold size={11}>{STATUS_LABEL[item.status]}</Txt>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  )
}

const STATUS_COLOR: Record<string, string> = { active: colors.brand100, draft: '#fef3c7', sold: '#e0e7ff', expired: '#fee2e2' }

function iconFor(item: ListingSummary): IconName {
  if (item.section === 'livestock') return ANIMAL_ICONS[item.categorySlug] ?? 'paw'
  return item.section === 'crops' ? 'sprout' : 'tractor-variant'
}

/** Up to 3 short facts, chosen by what this buyer cares about. All translated. */
function factsFor(i: ListingSummary, view?: SectionId): string[] {
  const age = formatAge(i.ageMonths)
  const teeth = i.teeth ? t(TEETH_LABEL[i.teeth]) : null
  const weight = i.liveWeightKg ? `${i.liveWeightKg} ${t('کلو')}` : null
  const breed = i.breed
  const out: (string | null)[] = []
  switch (view) {
    case 'qurbani':
      out.push(teeth, age, breed)
      break
    case 'meat': {
      const perMaund = pricePerMaund(i.price, i.liveWeightKg, i.priceUnit)
      out.push(weight, perMaund ? `${formatPrice(perMaund)} ${t('فی من')}` : null,
        i.quantity > 1 ? formatQuantity(i.quantity, i.quantityUnit) : null, i.isBulkAvailable ? t('تھوک') : null)
      break
    }
    case 'livestock':
      out.push(breed, i.milkLitresPerDay ? `${i.milkLitresPerDay} ${t('لیٹر دودھ')}` : null, age, i.gender && i.gender !== 'unknown' ? t(GENDER_LABEL[i.gender]) : null)
      break
    case 'crops':
    case 'supplies':
      out.push(i.variety, formatQuantity(i.quantity, i.quantityUnit), i.isBulkAvailable ? t('تھوک') : null)
      break
    default:
      if (i.section === 'livestock') out.push(breed, teeth, weight)
      else out.push(i.variety, formatQuantity(i.quantity, i.quantityUnit))
      out.push(...i.purposes.slice(0, 1).map((p) => t(PURPOSE_LABEL[p])))
  }
  return out.filter((x): x is string => !!x).slice(0, 3)
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row', gap: 12, padding: 10, backgroundColor: colors.white,
    borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border,
  },
  thumb: {
    width: 108, height: 108, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.brand50,
    alignItems: 'center', justifyContent: 'center',
  },
  badge: { position: 'absolute', top: 6, start: 6, backgroundColor: '#9a3412', borderRadius: 8, paddingHorizontal: 6 },
  facts: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  fact: { backgroundColor: colors.cream, borderRadius: 8, paddingHorizontal: 8, borderWidth: 1, borderColor: colors.border },
  status: { marginStart: 'auto', borderRadius: 8, paddingHorizontal: 8 },
})
