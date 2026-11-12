import { Pressable, StyleSheet, View } from 'react-native'
import { router } from 'expo-router'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import type { RequestSummary } from '@/lib/api'
import {
  BUSINESS_TYPE_ICON, BUSINESS_TYPE_LABEL, formatPrice, FREQUENCY_LABEL, priceUnitLabel, PURPOSE_LABEL, REQUEST_STATUS_LABEL, timeAgo,
} from '@/lib/format'
import { colors, radius } from '@/theme'
import { t } from '@/i18n'
import { Txt, type IconName } from './ui'

/** A buyer's requirement ("ضرورت") in a list: what, how much, how often, who is asking. */
export function RequestCard({ item, showStatus }: { item: RequestSummary; showStatus?: boolean }) {
  const weight = item.minWeightKg && item.maxWeightKg
    ? `${item.minWeightKg}–${item.maxWeightKg} ${t('کلو')}`
    : item.minWeightKg ? `${item.minWeightKg}+ ${t('کلو')}` : item.maxWeightKg ? `${t('تک')} ${item.maxWeightKg} ${t('کلو')}` : null
  const facts = [
    t(FREQUENCY_LABEL[item.frequency]),
    weight,
    item.purpose ? t(PURPOSE_LABEL[item.purpose]) : null,
    item.targetPrice ? `${t('بجٹ')} ${formatPrice(item.targetPrice)} ${t(priceUnitLabel(item.targetPriceUnit ?? 'perItem', item.section))}` : null,
  ].filter((x): x is string => !!x)
  const who = item.buyer.businessName ?? item.buyer.fullName

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/request/[id]', params: { id: String(item.id) } })}
      accessibilityRole="button"
      accessibilityLabel={item.title}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={styles.icon}>
          <MaterialCommunityIcons name={(BUSINESS_TYPE_ICON[item.buyer.businessType ?? ''] ?? 'account-search-outline') as IconName} size={24} color={colors.white} />
        </View>
        <View style={{ flex: 1 }}>
          <Txt size={12} color={colors.muted}>{item.buyer.businessType ? t(BUSINESS_TYPE_LABEL[item.buyer.businessType]) : t('خریدار')}</Txt>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Txt bold size={14} numberOfLines={1} style={{ flexShrink: 1 }}>{who}</Txt>
            {item.buyer.businessVerified && <MaterialCommunityIcons name="check-decagram" size={16} color={colors.brand700} />}
          </View>
        </View>
        <View style={styles.offers}>
          <Txt bold size={12} color={colors.brand800}>{`${item.offerCount} ${t('پیشکشیں')}`}</Txt>
        </View>
      </View>

      <Txt bold size={17}>{item.title}</Txt>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
        {facts.map((f) => (
          <View key={f} style={styles.fact}><Txt size={12}>{f}</Txt></View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <MaterialCommunityIcons name="map-marker-outline" size={14} color={colors.muted} />
        <Txt size={12} color={colors.muted} style={{ flexShrink: 1 }} numberOfLines={1}>
          {[item.locationNameUr, item.distanceKm != null ? `${Math.round(item.distanceKm)} ${t('کلومیٹر')}` : null,
            item.neededBy ? `${t('کب تک')}: ${item.neededBy}` : null, timeAgo(item.createdAtUtc)].filter(Boolean).join(' · ')}
        </Txt>
        {showStatus && (
          <View style={[styles.status, item.status === 'open' ? { backgroundColor: colors.brand100 } : null]}>
            <Txt bold size={11}>{REQUEST_STATUS_LABEL[item.status]}</Txt>
          </View>
        )}
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: { gap: 6, padding: 12, backgroundColor: colors.white, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, borderStartWidth: 5, borderStartColor: '#7f1d1d' },
  icon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#7f1d1d', alignItems: 'center', justifyContent: 'center' },
  offers: { backgroundColor: colors.brand50, borderRadius: radius.full, paddingHorizontal: 10, borderWidth: 1, borderColor: colors.brand200 },
  fact: { backgroundColor: colors.cream, borderRadius: 8, paddingHorizontal: 8, borderWidth: 1, borderColor: colors.border },
  status: { marginStart: 'auto', borderRadius: 8, paddingHorizontal: 8, backgroundColor: colors.sand },
})
