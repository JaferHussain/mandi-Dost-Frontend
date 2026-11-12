import { useCallback, useEffect, useState } from 'react'
import { Alert, Linking, StyleSheet, View } from 'react-native'
import { router } from 'expo-router'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { api, type Booking, type Shares } from '@/lib/api'
import { errorMessage } from '@/lib/errors'
import { BOOKING_STATUS_LABEL, formatPrice } from '@/lib/format'
import { useSession } from '@/lib/session'
import { colors, radius } from '@/theme'
import { t } from '@/i18n'
import { Choice, ChoiceGroup } from './sell-parts'
import { Button, Card, Field, Loading, Notice, Txt } from './ui'

/**
 * The 7 Qurbani shares of one animal as 7 boxes: green = confirmed, yellow = requested, empty = free.
 * Buyers book shares; the seller confirms or declines each request.
 */
export function SharesPanel({ listingId, isSeller, isOpen }: { listingId: number; isSeller: boolean; isOpen: boolean }) {
  const { user } = useSession()
  const [shares, setShares] = useState<Shares | null>(null)
  const [count, setCount] = useState(1)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ tone: 'error' | 'success'; text: string } | null>(null)

  const load = useCallback(() => {
    api.shares(listingId).then(setShares).catch(() => {})
  }, [listingId])
  useEffect(() => {
    load()
  }, [load, user?.id])

  if (!shares) return <Loading />

  const act = async (fn: () => Promise<unknown>, success?: string) => {
    setBusy(true)
    setMsg(null)
    try {
      await fn()
      if (success) setMsg({ tone: 'success', text: t(success) })
      load()
    } catch (e) {
      setMsg({ tone: 'error', text: t(errorMessage(e)) })
    } finally {
      setBusy(false)
    }
  }

  const boxes = Array.from({ length: 7 }, (_, i) =>
    i < shares.confirmedShares ? 'confirmed' : i < shares.confirmedShares + shares.requestedShares ? 'requested' : 'free')

  return (
    <Card style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <MaterialCommunityIcons name="account-group-outline" size={26} color="#9a3412" />
        <Txt bold size={18} style={{ flex: 1 }}>قربانی کے سات حصے</Txt>
        {shares.pricePerShare && <Txt bold size={15} color={colors.brand700}>{`${formatPrice(shares.pricePerShare)} ${t('فی حصہ')}`}</Txt>}
      </View>
      <View style={styles.boxes}>
        {boxes.map((b, i) => (
          <View key={i} style={[styles.box, b === 'confirmed' && styles.boxConfirmed, b === 'requested' && styles.boxRequested]}>
            <Txt bold size={14} color={b === 'confirmed' ? colors.white : colors.ink}>{String(i + 1)}</Txt>
          </View>
        ))}
      </View>
      <Txt size={13} color={colors.muted}>
        {`${shares.confirmedShares} ${t('پکے')} · ${shares.requestedShares} ${t('انتظار میں')} · ${shares.availableShares} ${t('باقی')}`}
      </Txt>

      {/* Buyer: my bookings, and booking more */}
      {shares.myBookings.map((b) => (
        <BookingRow key={b.id} b={b}>
          {(b.status === 'requested' || b.status === 'confirmed') && (
            <Button label="بکنگ منسوخ کریں" icon="close" variant="danger" loading={busy}
              onPress={() => confirmThen('بکنگ منسوخ کر دیں؟', () => act(() => api.cancelBooking(b.id)))} />
          )}
        </BookingRow>
      ))}

      {!isSeller && isOpen && shares.availableShares > 0 && (
        user ? (
          <View style={{ gap: 8 }}>
            <ChoiceGroup label="کتنے حصے چاہییں؟">
              {Array.from({ length: shares.availableShares }, (_, i) => i + 1).map((n) => (
                <Choice key={n} label={String(n)} on={count === n} onPress={() => setCount(n)} />
              ))}
            </ChoiceGroup>
            {shares.pricePerShare && <Txt bold size={15}>{`${t('کل')}: ${formatPrice(shares.pricePerShare * count)}`}</Txt>}
            <Field label="بیچنے والے کے لیے پیغام (اختیاری)" icon="text" placeholder="مثلاً: تین بھائیوں کے حصے" value={note} onChangeText={setNote} maxLength={300} />
            <Button label="حصے بک کریں" icon="check-circle-outline" loading={busy}
              onPress={() => act(() => api.bookShares(listingId, Math.min(count, shares.availableShares), note.trim() || undefined),
                'بکنگ کی درخواست چلی گئی۔ بیچنے والا پکی کرے گا')} />
            <Txt size={12} color={colors.muted}>رقم ایپ میں نہیں دی جاتی۔ جانور دیکھ کر بیچنے والے سے خود طے کریں</Txt>
          </View>
        ) : (
          <Button label="حصہ بک کرنے کے لیے لاگ اِن کریں" icon="login" onPress={() => router.push('/login')} />
        )
      )}
      {!isSeller && shares.availableShares === 0 && <Notice text="تمام حصے بک چکے ہیں" />}

      {/* Seller: every request with call / confirm / decline */}
      {isSeller && (shares.allBookings ?? []).length === 0 && <Notice text="ابھی کسی نے حصہ بک نہیں کیا" />}
      {isSeller && (shares.allBookings ?? []).map((b) => (
        <BookingRow key={b.id} b={b} showBuyer>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {b.buyerPhone && b.status !== 'cancelled' && (
              <Button label="کال" icon="phone" variant="outline" style={{ flex: 1 }} onPress={() => Linking.openURL(`tel:${b.buyerPhone!.replace(/[^\d+]/g, '')}`)} />
            )}
            {b.status === 'requested' && (
              <>
                <Button label="پکی کریں" icon="check" variant="soft" style={{ flex: 1 }} loading={busy} onPress={() => act(() => api.confirmBooking(b.id))} />
                <Button label="نامنظور" icon="close" variant="danger" style={{ flex: 1 }} loading={busy} onPress={() => act(() => api.declineBooking(b.id))} />
              </>
            )}
            {b.status === 'confirmed' && (
              <Button label="منسوخ" icon="close" variant="danger" style={{ flex: 1 }} loading={busy}
                onPress={() => confirmThen('یہ بکنگ منسوخ کر دیں؟', () => act(() => api.cancelBooking(b.id)))} />
            )}
          </View>
        </BookingRow>
      ))}
      {msg && <Notice tone={msg.tone} text={msg.text} />}
    </Card>
  )
}

function BookingRow({ b, showBuyer, children }: { b: Booking; showBuyer?: boolean; children?: React.ReactNode }) {
  return (
    <View style={styles.booking}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Txt bold size={15} style={{ flex: 1 }}>{showBuyer ? `${b.buyerName} – ${b.shares} ${t('حصے')}` : `${t('آپ کے')} ${b.shares} ${t('حصے')}`}</Txt>
        <View style={[styles.status, b.status === 'confirmed' && { backgroundColor: colors.brand100 }]}>
          <Txt bold size={12}>{BOOKING_STATUS_LABEL[b.status]}</Txt>
        </View>
      </View>
      {b.note && <Txt size={14} color={colors.muted}>{b.note}</Txt>}
      {children}
    </View>
  )
}

function confirmThen(question: string, onYes: () => void) {
  if (typeof globalThis.confirm === 'function' && typeof document !== 'undefined') {
    if (globalThis.confirm(t(question))) onYes()
    return
  }
  Alert.alert(t(question), undefined, [{ text: t('نہیں'), style: 'cancel' }, { text: t('ہاں'), onPress: onYes }])
}

const styles = StyleSheet.create({
  boxes: { flexDirection: 'row', gap: 6 },
  box: {
    flex: 1, aspectRatio: 1, borderRadius: 10, borderWidth: 2, borderColor: '#fed7aa', backgroundColor: colors.white,
    alignItems: 'center', justifyContent: 'center',
  },
  boxConfirmed: { backgroundColor: colors.brand600, borderColor: colors.brand600 },
  boxRequested: { backgroundColor: '#fde68a', borderColor: '#f59e0b' },
  booking: { gap: 6, padding: 10, borderRadius: radius.md, backgroundColor: colors.cream, borderWidth: 1, borderColor: colors.border },
  status: { borderRadius: radius.full, paddingHorizontal: 10, backgroundColor: '#fef3c7' },
})
