import { useCallback, useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { TopBar, Txt } from '@/components/ui'
import { PagedList } from '@/components/paged-list'
import { api, type Offer } from '@/lib/api'
import { formatPrice, OFFER_STATUS_LABEL, timeAgo } from '@/lib/format'
import { colors, radius } from '@/theme'

const close = () => (router.canGoBack() ? router.back() : router.replace('/profile'))

/** Offers the user sent as a seller, and whether the buyer accepted. */
export default function MyOffers() {
  const [version, setVersion] = useState(0)
  useFocusEffect(useCallback(() => setVersion((v) => v + 1), []))
  return (
    <View style={{ flex: 1 }}>
      <TopBar title="میری پیشکشیں" onBack={close} />
      <PagedList<Offer>
        source={(page) => api.myOffers(page)}
        sourceKey={`myoffers:${version}`}
        renderItem={(o) => (
          <Pressable onPress={() => router.push({ pathname: '/request/[id]', params: { id: String(o.purchaseRequestId) } })} style={styles.card} accessibilityRole="button">
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Txt bold size={16} style={{ flex: 1 }} numberOfLines={1}>{o.requestTitle}</Txt>
              <View style={[styles.badge, o.status === 'accepted' && { backgroundColor: colors.brand100 }]}>
                <Txt bold size={12}>{OFFER_STATUS_LABEL[o.status]}</Txt>
              </View>
            </View>
            {o.price != null && <Txt bold size={16} color={colors.brand700}>{formatPrice(o.price)}</Txt>}
            <Txt size={12} color={colors.muted}>{timeAgo(o.updatedAtUtc)}</Txt>
          </Pressable>
        )}
        emptyTitle="آپ نے ابھی کوئی پیشکش نہیں بھیجی"
        emptyText="خریداروں کی ضرورتیں دیکھیں اور جو مال آپ کے پاس ہو اس کی پیشکش بھیجیں"
      />
    </View>
  )
}

const styles = StyleSheet.create({
  card: { gap: 4, padding: 12, backgroundColor: colors.white, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
  badge: { borderRadius: radius.full, paddingHorizontal: 10, backgroundColor: '#fef3c7' },
})
