import { useCallback, useEffect, useState } from 'react'
import { Alert, KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { Image } from 'expo-image'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { Button, Card, EmptyState, Field, Loading, Notice, SpeakButton, TopBar, Txt, type IconName } from '@/components/ui'
import { RequireLogin } from '@/components/require-login'
import { Choice, ChoiceGroup, digitsOnly } from '@/components/sell-parts'
import { api, mediaUrl, type ListingSummary, type Offer, type PriceUnit, type RequestDetail } from '@/lib/api'
import { errorMessage } from '@/lib/errors'
import {
  BUSINESS_TYPE_LABEL, formatPrice, formatQuantity, FREQUENCY_LABEL, OFFER_STATUS_LABEL, priceUnitLabel, PURPOSE_LABEL,
  REQUEST_STATUS_LABEL, timeAgo,
} from '@/lib/format'
import { useSession } from '@/lib/session'
import { colors, radius } from '@/theme'
import { t } from '@/i18n'

const back = () => (router.canGoBack() ? router.back() : router.replace('/'))
const toWhatsApp = (phone: string) => {
  const d = phone.replace(/\D/g, '')
  return d.startsWith('0') ? `92${d.slice(1)}` : d
}

async function openChat(userId: number) {
  try {
    const chat = await api.startChat({ userId })
    router.push({ pathname: '/chat/[id]', params: { id: String(chat.id) } })
  } catch (e) {
    Alert.alert(t('مسئلہ'), t(errorMessage(e)))
  }
}

function confirm(question: string, onYes: () => void) {
  if (Platform.OS === 'web') {
    if (globalThis.confirm?.(t(question))) onYes()
    return
  }
  Alert.alert(t(question), undefined, [{ text: t('نہیں'), style: 'cancel' }, { text: t('ہاں'), onPress: onYes }])
}

export default function RequestScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { user } = useSession()
  const [req, setReq] = useState<RequestDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    api.requestDetail(Number(id)).then(setReq, (e) => setError(errorMessage(e)))
  }, [id])
  useEffect(() => {
    load()
  }, [load, user?.id])

  if (error || !req) {
    return (
      <View style={{ flex: 1 }}>
        <TopBar title="ضرورت" onBack={back} />
        {error ? <EmptyState icon="alert-circle-outline" title={error} /> : <Loading />}
      </View>
    )
  }

  const r = req
  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true)
    try {
      await fn()
      load()
    } catch (e) {
      Alert.alert(t('مسئلہ'), t(errorMessage(e)))
    } finally {
      setBusy(false)
    }
  }

  const rows: { icon: IconName; label: string; value: string }[] = [
    { icon: 'package-variant', label: 'مقدار', value: formatQuantity(r.quantity, r.quantityUnit) },
    { icon: 'calendar-sync-outline', label: 'کتنی بار', value: t(FREQUENCY_LABEL[r.frequency]) },
  ]
  if (r.purpose) rows.push({ icon: 'target', label: 'کس کام کے لیے', value: t(PURPOSE_LABEL[r.purpose]) })
  if (r.minWeightKg || r.maxWeightKg) rows.push({ icon: 'scale', label: 'ہر جانور کا وزن', value: `${r.minWeightKg ?? '?'}–${r.maxWeightKg ?? '?'} ${t('کلو')}` })
  if (r.targetPrice) rows.push({ icon: 'cash', label: 'بجٹ', value: `${formatPrice(r.targetPrice)} ${t(priceUnitLabel(r.targetPriceUnit ?? 'perItem', r.section))}` })
  rows.push({ icon: 'calendar-clock', label: 'کب تک', value: r.neededBy ?? t('جب بھی مل جائے') })
  rows.push({ icon: 'map-marker-outline', label: 'جگہ', value: `${r.location.nameUr}، ${t('ضلع')} ${r.location.districtUr}` })
  if (r.deliveryNeeded) rows.push({ icon: 'truck-delivery-outline', label: 'ڈیلیوری', value: t('چاہیے') })

  const speech = [r.title, ...rows.map((x) => `${t(x.label)}: ${x.value}`), r.notes ?? ''].join('۔ ')

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <TopBar title="ضرورت" onBack={back} right={<SpeakButton text={speech} />} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <Card style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <MaterialCommunityIcons name="account-search-outline" size={22} color="#7f1d1d" />
            <Txt bold size={15} style={{ flexShrink: 1 }}>{r.buyer.businessName ?? r.buyer.fullName}</Txt>
            {r.buyer.businessVerified && <MaterialCommunityIcons name="check-decagram" size={18} color={colors.brand700} />}
            {r.buyer.businessType && <Txt size={13} color={colors.muted}>{`(${t(BUSINESS_TYPE_LABEL[r.buyer.businessType])})`}</Txt>}
          </View>
          <Txt bold size={21}>{r.title}</Txt>
          <Txt size={13} color={colors.muted}>
            {`${t(REQUEST_STATUS_LABEL[r.status])} · ${r.offerCount} ${t('پیشکشیں')} · ${timeAgo(r.createdAtUtc)}`}
          </Txt>
        </Card>

        <Card style={{ padding: 0, overflow: 'hidden' }}>
          {rows.map((x, i) => (
            <View key={x.label} style={[styles.row, i < rows.length - 1 && styles.rowBorder]}>
              <MaterialCommunityIcons name={x.icon} size={22} color="#7f1d1d" />
              <Txt size={15} color={colors.muted} style={{ flex: 1 }}>{x.label}</Txt>
              <Txt bold size={15} style={{ flexShrink: 1 }}>{x.value}</Txt>
            </View>
          ))}
        </Card>
        {r.notes && <Card><Txt bold size={15}>مزید بات</Txt><Txt size={15}>{r.notes}</Txt></Card>}

        {r.isMine ? (
          <BuyerPanel req={r} busy={busy} act={act} />
        ) : !user ? (
          <Card><RequireLogin icon="hand-coin-outline" title="پیشکش بھیجنے کے لیے لاگ اِن کریں" text="آپ کے پاس یہ مال ہے؟ قیمت بتائیں" /></Card>
        ) : r.status !== 'open' && !r.myOffer ? (
          <Notice text="یہ ضرورت بند ہو چکی ہے" />
        ) : (
          <SellerPanel req={r} busy={busy} act={act} />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

/** The buyer: every offer, with call / WhatsApp / accept / decline, and closing the requirement. */
function BuyerPanel({ req, busy, act }: { req: RequestDetail; busy: boolean; act: (fn: () => Promise<unknown>) => void }) {
  const offers = req.offers ?? []
  return (
    <>
      <Txt bold size={18}>{`${t('پیشکشیں')} (${offers.filter((o) => o.status !== 'withdrawn').length})`}</Txt>
      {offers.length === 0 && <Notice text="ابھی کوئی پیشکش نہیں آئی۔ بیچنے والے پیشکش بھیجیں گے تو یہاں نظر آئے گی" />}
      {offers.map((o) => (
        <OfferCard key={o.id} offer={o} section={req.section}>
          {o.status !== 'withdrawn' && <Button label="پیغام بھیجیں" icon="message-text-outline" variant="outline" onPress={() => openChat(o.seller.id)} />}
          {o.sellerPhone && o.status !== 'withdrawn' && (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Button label="کال کریں" icon="phone" style={{ flex: 1 }} onPress={() => Linking.openURL(`tel:${o.sellerPhone!.replace(/[^\d+]/g, '')}`)} />
              <Button label="واٹس ایپ" icon="whatsapp" variant="outline" style={{ flex: 1 }}
                onPress={() => Linking.openURL(`https://wa.me/${toWhatsApp(o.sellerPhone!)}?text=${encodeURIComponent(`${t('منڈی دوست پر آپ کی پیشکش')}: ${req.title}`)}`)} />
            </View>
          )}
          {o.status === 'pending' && (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Button label="منظور" icon="check" variant="soft" style={{ flex: 1 }} loading={busy} onPress={() => act(() => api.acceptOffer(o.id))} />
              <Button label="نامنظور" icon="close" variant="danger" style={{ flex: 1 }} loading={busy} onPress={() => act(() => api.declineOffer(o.id))} />
            </View>
          )}
        </OfferCard>
      ))}

      <Card style={{ gap: 10 }}>
        <Txt bold size={17}>آپ کی ضرورت</Txt>
        {req.status === 'open' ? (
          <>
            <Button label="ضرورت پوری ہو گئی" icon="check-circle-outline" variant="soft" loading={busy}
              onPress={() => confirm('کیا ضرورت پوری ہو گئی؟', () => act(() => api.closeRequest(req.id, true)))} />
            <Button label="ضرورت بند کریں" icon="close-circle-outline" variant="danger" loading={busy}
              onPress={() => confirm('ضرورت بند کر دیں؟', () => act(() => api.closeRequest(req.id, false)))} />
          </>
        ) : (
          <Button label="دوبارہ کھولیں (30 دن)" icon="refresh" loading={busy} onPress={() => act(() => api.reopenRequest(req.id))} />
        )}
      </Card>
    </>
  )
}

/** A seller: make or change an offer, attach a listing, then call the buyer. */
function SellerPanel({ req, busy, act }: { req: RequestDetail; busy: boolean; act: (fn: () => Promise<unknown>) => void }) {
  const mine = req.myOffer
  const [editing, setEditing] = useState(!mine)
  const units = req.category.priceUnits.filter((u) => u !== 'perShare')
  const [price, setPrice] = useState(mine?.price ? String(mine.price) : '')
  const [unit, setUnit] = useState<PriceUnit>(mine?.priceUnit ?? req.targetPriceUnit ?? units[0])
  const [qty, setQty] = useState(mine?.quantity ? String(mine.quantity) : '')
  const [message, setMessage] = useState(mine?.message ?? '')
  const [listingId, setListingId] = useState<number | null>(mine?.listingId ?? null)
  const [myListings, setMyListings] = useState<ListingSummary[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Only the seller's own published listings of the same kind can be attached
    api.myListings().then((p) => setMyListings(p.items.filter((l) => l.status === 'active' && l.section === req.section))).catch(() => {})
  }, [req.section])

  const send = () => {
    if (!price && !message.trim() && !listingId) return setError(t('قیمت، پیغام یا اپنا اشتہار – کچھ تو بتائیں'))
    setError(null)
    act(async () => {
      await api.makeOffer(req.id, {
        price: price ? Number(price) : null,
        priceUnit: price ? unit : null,
        quantity: qty ? Number(qty) : null,
        listingId,
        message: message.trim() || undefined,
      })
      setEditing(false)
    })
  }

  return (
    <>
      {mine && !editing && (
        <>
          <Txt bold size={18}>آپ کی پیشکش</Txt>
          <OfferCard offer={mine} section={req.section}>
            {mine.status !== 'withdrawn' && req.status === 'open' && (
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Button label="پیشکش بدلیں" icon="pencil-outline" variant="outline" style={{ flex: 1 }} onPress={() => setEditing(true)} />
                <Button label="واپس لیں" icon="undo" variant="danger" style={{ flex: 1 }} loading={busy}
                  onPress={() => confirm('پیشکش واپس لے لیں؟', () => act(() => api.withdrawOffer(mine.id)))} />
              </View>
            )}
          </OfferCard>
          <Button label="خریدار کو پیغام" icon="message-text-outline" variant="outline" onPress={() => openChat(req.buyer.id)} />
          {req.buyerPhone ? (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Button label="خریدار کو کال کریں" icon="phone" style={{ flex: 1 }} onPress={() => Linking.openURL(`tel:${req.buyerPhone!.replace(/[^\d+]/g, '')}`)} />
              <Button label="واٹس ایپ" icon="whatsapp" variant="outline" style={{ flex: 1 }}
                onPress={() => Linking.openURL(`https://wa.me/${toWhatsApp(req.buyerPhone!)}?text=${encodeURIComponent(`${t('منڈی دوست پر آپ کی ضرورت دیکھی')}: ${req.title}`)}`)} />
            </View>
          ) : mine.status !== 'withdrawn' && (
            <Notice text="خریدار نے نمبر چھپایا ہوا ہے۔ وہ آپ کو کال کرے گا" />
          )}
        </>
      )}

      {editing && req.status === 'open' && (
        <Card style={{ gap: 12 }}>
          <Txt bold size={18}>{mine ? 'پیشکش بدلیں' : 'آپ کے پاس یہ مال ہے؟ پیشکش بھیجیں'}</Txt>
          <Field label="آپ کی قیمت (روپے)" icon="cash" ltr keyboardType="number-pad" placeholder="57000" value={price} onChangeText={(v) => setPrice(digitsOnly(v))} maxLength={10} />
          {Number(price) > 0 && (
            <>
              <Txt bold size={15} color={colors.brand700}>{formatPrice(Number(price))}</Txt>
              <ChoiceGroup label="قیمت کس حساب سے؟">
                {units.map((u) => <Choice key={u} label={priceUnitLabel(u, req.section)} on={unit === u} onPress={() => setUnit(u)} />)}
              </ChoiceGroup>
            </>
          )}
          <Field label="کتنا دے سکتے ہیں؟ (اختیاری)" icon="package-variant" ltr keyboardType="decimal-pad" value={qty} onChangeText={(v) => setQty(digitsOnly(v, true))} maxLength={9} />
          {myListings.length > 0 && (
            <ChoiceGroup label="اپنا اشتہار ساتھ لگائیں (اختیاری)">
              {myListings.slice(0, 6).map((l) => (
                <Choice key={l.id} label={l.title} icon="image-outline" on={listingId === l.id} onPress={() => setListingId(listingId === l.id ? null : l.id)} />
              ))}
            </ChoiceGroup>
          )}
          <Field label="پیغام (اختیاری)" icon="message-text-outline" placeholder="مثلاً: ہر ہفتے 10 بکرے دے سکتا ہوں" value={message} onChangeText={setMessage} multiline maxLength={500} />
          {error && <Notice tone="error" text={error} />}
          <Button label={mine ? 'پیشکش بدلیں' : 'پیشکش بھیجیں'} icon="send" loading={busy} onPress={send} />
          {mine && <Button label="رہنے دیں" variant="outline" onPress={() => setEditing(false)} />}
          <Txt size={12} color={colors.muted} center>پیشکش بھیجنے کے بعد خریدار کا نمبر آپ کو نظر آئے گا (اگر اس نے چھپایا نہ ہو)</Txt>
        </Card>
      )}
    </>
  )
}

function OfferCard({ offer, section, children }: { offer: Offer; section: RequestDetail['section']; children?: React.ReactNode }) {
  const thumb = mediaUrl(offer.listingThumbnailUrl)
  const statusColor = offer.status === 'accepted' ? colors.brand100 : offer.status === 'declined' || offer.status === 'withdrawn' ? '#fee2e2' : '#fef3c7'
  return (
    <Card style={{ gap: 8, opacity: offer.status === 'withdrawn' ? 0.6 : 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Txt bold size={16} style={{ flex: 1 }} numberOfLines={1}>{offer.seller.fullName}</Txt>
        {offer.seller.phoneVerified && <MaterialCommunityIcons name="check-decagram" size={16} color={colors.brand700} />}
        <View style={[styles.badge, { backgroundColor: statusColor }]}><Txt bold size={12}>{OFFER_STATUS_LABEL[offer.status]}</Txt></View>
      </View>
      {offer.price != null && (
        <Txt bold size={20} color={colors.brand700}>{`${formatPrice(offer.price)} ${t(priceUnitLabel(offer.priceUnit ?? 'perItem', section))}`}</Txt>
      )}
      {offer.quantity != null && <Txt size={14}>{`${t('مقدار')}: ${offer.quantity}`}</Txt>}
      {offer.message && <Txt size={15}>{offer.message}</Txt>}
      {offer.listingId && (
        <Pressable onPress={() => router.push({ pathname: '/listing/[id]', params: { id: String(offer.listingId) } })} style={styles.listing} accessibilityRole="button">
          {thumb ? <Image source={thumb} style={styles.thumb} contentFit="cover" /> : <MaterialCommunityIcons name="image-outline" size={28} color={colors.brand700} />}
          <Txt bold size={14} style={{ flex: 1 }} numberOfLines={1}>{offer.listingTitle}</Txt>
          <MaterialCommunityIcons name="chevron-left" size={22} color={colors.muted} />
        </Pressable>
      )}
      <Txt size={12} color={colors.muted}>{timeAgo(offer.updatedAtUtc)}</Txt>
      {children}
    </Card>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 54, paddingHorizontal: 14, paddingVertical: 6 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  badge: { borderRadius: radius.full, paddingHorizontal: 10 },
  listing: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 6, borderRadius: radius.md, backgroundColor: colors.cream, borderWidth: 1, borderColor: colors.border },
  thumb: { width: 48, height: 48, borderRadius: 10 },
})
