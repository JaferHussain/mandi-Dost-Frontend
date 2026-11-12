import { useCallback, useState } from 'react'
import { FlatList, Pressable, StyleSheet, View } from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { EmptyState, Loading, Notice, TopBar, Txt } from '@/components/ui'
import { api, type Booking } from '@/lib/api'
import { errorMessage } from '@/lib/errors'
import { BOOKING_STATUS_LABEL, timeAgo } from '@/lib/format'
import { colors, radius } from '@/theme'
import { t } from '@/i18n'

const close = () => (router.canGoBack() ? router.back() : router.replace('/profile'))

/** Qurbani shares the user asked for, and whether the seller confirmed. */
export default function MyBookings() {
  const [items, setItems] = useState<Booking[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  useFocusEffect(useCallback(() => {
    api.myBookings().then(setItems, (e) => setError(errorMessage(e)))
  }, []))

  return (
    <View style={{ flex: 1 }}>
      <TopBar title="میرے قربانی کے حصے" onBack={close} />
      {error ? <View style={{ padding: 16 }}><Notice tone="error" text={error} /></View> : !items ? <Loading /> : (
        <FlatList
          data={items}
          keyExtractor={(b) => String(b.id)}
          contentContainerStyle={{ padding: 16, gap: 10, flexGrow: 1 }}
          ListEmptyComponent={<EmptyState icon="account-group-outline" title="ابھی کوئی حصہ بک نہیں کیا" text="قربانی کے حصے میں سات حصوں والے جانور دیکھیں" />}
          renderItem={({ item: b }) => (
            <Pressable onPress={() => router.push({ pathname: '/listing/[id]', params: { id: String(b.listingId), view: 'qurbani' } })} style={styles.card} accessibilityRole="button">
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Txt bold size={16} style={{ flex: 1 }} numberOfLines={1}>{b.listingTitle}</Txt>
                <View style={[styles.badge, b.status === 'confirmed' && { backgroundColor: colors.brand100 }]}>
                  <Txt bold size={12}>{BOOKING_STATUS_LABEL[b.status]}</Txt>
                </View>
              </View>
              <Txt size={15}>{`${b.shares} ${t('حصے')}`}</Txt>
              <Txt size={12} color={colors.muted}>{timeAgo(b.updatedAtUtc)}</Txt>
            </Pressable>
          )}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  card: { gap: 4, padding: 12, backgroundColor: colors.white, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
  badge: { borderRadius: radius.full, paddingHorizontal: 10, backgroundColor: '#fef3c7' },
})
