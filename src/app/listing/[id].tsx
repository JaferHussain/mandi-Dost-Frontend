import { useCallback, useEffect, useState } from 'react'
import { Alert, Linking, Platform, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { Image } from 'expo-image'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Button, Card, EmptyState, Loading, Notice, SpeakButton, TopBar, Txt, type IconName } from '@/components/ui'
import { ListenText } from '@/components/listen-text'
import { ReportSheet } from '@/components/report-sheet'
import { SharesPanel } from '@/components/shares-panel'
import { PosterSheet } from '@/components/poster'
import { api, mediaUrl, type ListingDetail, type Purpose } from '@/lib/api'
import { errorMessage } from '@/lib/errors'
import {
  formatAge, formatPrice, formatQuantity, FREQUENCY_LABEL, GENDER_LABEL, KG_PER_MAUND, meatEstimate, priceUnitLabel,
  pricePerMaund, PURPOSE_LABEL, STATUS_LABEL, TEETH_LABEL, timeAgo, toWhatsApp,
} from '@/lib/format'
import { ANIMAL_ICONS, type SectionId } from '@/data/sections'
import { useSession } from '@/lib/session'
import { colors, radius } from '@/theme'
import { t } from '@/i18n'

type Row = { icon: IconName; label: string; value: string; note?: string }

export default function ListingScreen() {
  const { id, view } = useLocalSearchParams<{ id: string; view?: string }>()
  const { user } = useSession()
  const insets = useSafeAreaInsets()
  const [listing, setListing] = useState<ListingDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [posterOpen, setPosterOpen] = useState(false)

  const load = useCallback(() => {
    api.listing(Number(id)).then(setListing, (e) => setError(errorMessage(e)))
  }, [id])
  useEffect(() => {
    load()
  }, [load, user?.id])

  const back = () => (router.canGoBack() ? router.back() : router.replace('/'))

  if (error || !listing) {
    return (
      <View style={{ flex: 1 }}>
        <TopBar title="اشتہار" onBack={back} />
        {error ? <EmptyState icon="alert-circle-outline" title={error} /> : <Loading />}
      </View>
    )
  }

  const l = listing
  const rows = buildRows(l, (view || undefined) as SectionId | undefined)
  const priceLine = `${formatPrice(l.price)}${l.price != null ? ` ${t(priceUnitLabel(l.priceUnit, l.section))}` : ''}`
  const speech = [l.title, priceLine, ...rows.map((r) => `${t(r.label)}: ${r.value}`), l.description ?? ''].join('۔ ')

  const toggleFavorite = async () => {
    if (!user) return router.push('/login')
    const next = !l.isFavorite
    setListing({ ...l, isFavorite: next })
    try {
      await (next ? api.addFavorite(l.id) : api.removeFavorite(l.id))
    } catch (e) {
      setListing({ ...l, isFavorite: !next })
      Alert.alert(t('مسئلہ'), t(errorMessage(e)))
    }
  }

  const openChat = async () => {
    if (!user) return router.push('/login')
    try {
      const chat = await api.startChat({ listingId: l.id })
      router.push({ pathname: '/chat/[id]', params: { id: String(chat.id) } })
    } catch (e) {
      Alert.alert(t('مسئلہ'), t(errorMessage(e)))
    }
  }

  const ownerAction = async (fn: () => Promise<unknown>, after?: () => void) => {
    setBusy(true)
    try {
      await fn()
      if (after) after()
      else load()
    } catch (e) {
      Alert.alert(t('مسئلہ'), t(errorMessage(e)))
    } finally {
      setBusy(false)
    }
  }

  return (
    <View style={{ flex: 1 }}>
      <ListenText text={speech} />
      <TopBar
        title={l.category.nameUr}
        onBack={back}
        right={
          <View style={{ flexDirection: 'row' }}>
            <Pressable onPress={() => setPosterOpen(true)} style={styles.iconBtn} accessibilityRole="button" accessibilityLabel={t('واٹس ایپ پوسٹر')}>
              <MaterialCommunityIcons name="share-variant" size={26} color={colors.ink} />
            </Pressable>
            {!l.isMine && (
              <>
                <Pressable onPress={() => (user ? setReportOpen(true) : router.push('/login'))} style={styles.iconBtn} accessibilityRole="button" accessibilityLabel={t('اشتہار رپورٹ کریں')}>
                  <MaterialCommunityIcons name="flag-outline" size={26} color={colors.ink} />
                </Pressable>
                <Pressable onPress={toggleFavorite} style={styles.iconBtn} accessibilityRole="button" accessibilityLabel={t(l.isFavorite ? 'پسندیدہ سے ہٹائیں' : 'پسندیدہ میں رکھیں')}>
                  <MaterialCommunityIcons name={l.isFavorite ? 'heart' : 'heart-outline'} size={28} color={l.isFavorite ? colors.danger : colors.ink} />
                </Pressable>
              </>
            )}
          </View>
        }
      />
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <Gallery listing={l} />

        <View style={{ padding: 16, gap: 12 }}>
          {l.status !== 'active' && (
            <Notice tone={l.status === 'sold' ? 'success' : 'info'} text={`${t('حالت')}: ${t(STATUS_LABEL[l.status])}`} />
          )}

          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Txt bold size={21}>{l.title}</Txt>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                <Txt bold size={24} color={colors.brand700}>{formatPrice(l.price)}</Txt>
                {l.price != null && <Txt size={14} color={colors.muted}>{priceUnitLabel(l.priceUnit, l.section)}</Txt>}
                {l.isNegotiable && l.price != null && <Txt size={13} color={colors.earth}>(بات ہو سکتی ہے)</Txt>}
              </View>
            </View>
            <SpeakButton text={speech} />
          </View>

          {l.purposes.length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {l.purposes.map((p) => (
                <View key={p} style={styles.purpose}><Txt bold size={13} color={colors.brand800}>{PURPOSE_LABEL[p]}</Txt></View>
              ))}
            </View>
          )}

          <Card style={{ padding: 0, overflow: 'hidden' }}>
            {rows.map((r, i) => (
              <View key={r.label} style={[styles.row, i < rows.length - 1 && styles.rowBorder]}>
                <MaterialCommunityIcons name={r.icon} size={24} color={colors.brand700} />
                <Txt size={15} color={colors.muted} style={{ flex: 1 }}>{r.label}</Txt>
                <View style={{ alignItems: 'flex-end', flexShrink: 1 }}>
                  <Txt bold size={15}>{r.value}</Txt>
                  {r.note && <Txt size={11} color={colors.earth}>{r.note}</Txt>}
                </View>
              </View>
            ))}
          </Card>

          {l.qurbani?.totalShares === 7 && <SharesPanel listingId={l.id} isSeller={l.isMine} isOpen={l.status === 'active'} />}

          {l.description && (
            <Card>
              <Txt bold size={16}>تفصیل</Txt>
              <Txt size={15}>{l.description}</Txt>
            </Card>
          )}

          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <MaterialCommunityIcons name="map-marker" size={28} color={colors.brand700} />
            <View style={{ flex: 1 }}>
              <Txt bold size={16}>{[l.areaText, l.location.nameUr].filter(Boolean).join('، ')}</Txt>
              <Txt size={13} color={colors.muted}>{`${t('ضلع')} ${l.location.districtUr} · ${timeAgo(l.publishedAtUtc ?? l.createdAtUtc)} · ${l.viewCount} ${t('بار دیکھا گیا')}`}</Txt>
            </View>
          </Card>

          <Pressable onPress={() => router.push({ pathname: '/user/[id]', params: { id: String(l.seller.id) } })} accessibilityRole="button">
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={styles.avatar}><Txt bold size={22} color={colors.white}>{l.seller.fullName.trim().charAt(0)}</Txt></View>
            <View style={{ flex: 1 }}>
              <Txt bold size={17}>{l.seller.fullName}</Txt>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <MaterialCommunityIcons
                  name={l.seller.phoneVerified ? 'check-decagram' : 'information-outline'} size={16}
                  color={l.seller.phoneVerified ? colors.brand700 : colors.muted} />
                <Txt size={13} color={colors.muted}>{l.seller.phoneVerified ? 'نمبر تصدیق شدہ' : 'نمبر کی تصدیق ابھی نہیں ہوئی'}</Txt>
              </View>
              {l.seller.ratingCount > 0 && <Txt size={13} color={colors.earth}>{`★ ${l.seller.ratingAverage} (${l.seller.ratingCount})`}</Txt>}
            </View>
            <MaterialCommunityIcons name="chevron-left" size={24} color={colors.muted} />
          </Card>
          </Pressable>

          {!l.isMine && <Notice tone="info" icon="shield-alert-outline" text="جانور دیکھے بغیر کبھی پیشگی رقم نہ بھیجیں۔ سودا دن میں اور کسی جاننے والے کے ساتھ کریں" />}

          {l.isMine && (
            <Card style={{ gap: 10 }}>
              <Txt bold size={17}>آپ کا اشتہار</Txt>
              {l.status !== 'sold' && l.status !== 'hidden' && (
                <Button label="اشتہار بدلیں" icon="pencil-outline" variant="outline"
                  onPress={() => router.push({ pathname: '/sell', params: { edit: String(l.id) } })} />
              )}
              <Button label="واٹس ایپ پوسٹر بنائیں" icon="whatsapp" variant="soft" onPress={() => setPosterOpen(true)} />
              {(l.status === 'draft' || l.status === 'expired') && (
                <Button label={l.status === 'draft' ? 'اشتہار لگائیں' : 'دوبارہ لگائیں'} icon="rocket-launch-outline" loading={busy}
                  onPress={() => ownerAction(() => api.publishListing(l.id))} />
              )}
              {l.status === 'active' && (
                <Button label="بک گیا" icon="check-circle-outline" variant="soft" loading={busy}
                  onPress={() => confirm('کیا یہ بک گیا ہے؟', () => ownerAction(() => api.markSold(l.id)))} />
              )}
              {l.status !== 'sold' && (
                <Button label="اشتہار ہٹائیں" icon="trash-can-outline" variant="danger" loading={busy}
                  onPress={() => confirm('اشتہار ہٹا دیں؟', () => ownerAction(() => api.removeListing(l.id), back))} />
              )}
            </Card>
          )}
        </View>
      </ScrollView>

      {!l.isMine && l.status === 'active' && (
        <View style={[styles.actions, { paddingBottom: insets.bottom + 10 }]}>
          {l.sellerPhone && (
            <Button label="کال" icon="phone" style={{ flex: 1 }} onPress={() => Linking.openURL(`tel:${l.sellerPhone!.replace(/[^\d+]/g, '')}`)} />
          )}
          <Button label="پیغام" icon="message-text-outline" variant={l.sellerPhone ? 'outline' : 'primary'} style={{ flex: 1 }} onPress={openChat} />
          {l.sellerPhone && (
            <Button label="واٹس ایپ" icon="whatsapp" variant="outline" style={{ flex: 1 }}
              onPress={() => Linking.openURL(`https://wa.me/${toWhatsApp(l.sellerPhone!)}?text=${encodeURIComponent(`${t('منڈی دوست پر آپ کا اشتہار دیکھا')}: ${l.title}`)}`)} />
          )}
        </View>
      )}
      <ReportSheet listingId={l.id} open={reportOpen} onClose={() => setReportOpen(false)} />
      <PosterSheet listing={l} open={posterOpen} onClose={() => setPosterOpen(false)} />
    </View>
  )
}

function confirm(question: string, onYes: () => void) {
  if (Platform.OS === 'web') {
    if (globalThis.confirm?.(t(question))) onYes()
    return
  }
  Alert.alert(t(question), undefined, [
    { text: t('نہیں'), style: 'cancel' },
    { text: t('ہاں'), onPress: onYes },
  ])
}


function Gallery({ listing }: { listing: ListingDetail }) {
  const { width } = useWindowDimensions()
  const [index, setIndex] = useState(0)
  const w = Math.min(width, 800)
  if (listing.media.length === 0) {
    const icon = listing.section === 'livestock' ? ANIMAL_ICONS[listing.category.slug] ?? 'paw' : (listing.category.iconKey as IconName) ?? 'tag-outline'
    return (
      <View style={[styles.noPhoto, { height: w * 0.5 }]}>
        <MaterialCommunityIcons name={icon} size={72} color={colors.brand700} />
        <Txt size={13} color={colors.muted}>تصویر نہیں لگی</Txt>
      </View>
    )
  }
  return (
    <View>
      <ScrollView
        horizontal pagingEnabled showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setIndex(Math.round(Math.abs(e.nativeEvent.contentOffset.x) / w))}>
        {listing.media.map((m) => (
          <Image key={m.id} source={mediaUrl(m.url)} style={{ width: w, height: w * 0.75, backgroundColor: colors.sand }} contentFit="cover" transition={150} cachePolicy="disk" />
        ))}
      </ScrollView>
      {listing.media.length > 1 && (
        <View style={styles.dots}>
          {listing.media.map((m, i) => <View key={m.id} style={[styles.dot, i === index && styles.dotOn]} />)}
        </View>
      )}
    </View>
  )
}

/**
 * The facts to show, shaped by why the buyer is looking (view). Purpose-specific rows
 * are included when the buyer came from that feed, or when no feed is known.
 */
function buildRows(l: ListingDetail, view?: SectionId): Row[] {
  const rows: Row[] = []
  const show = (p: Purpose, v: SectionId) => l.purposes.includes(p) && (!view || view === v)
  const a = l.livestock

  if (a) {
    if (a.breed) rows.push({ icon: 'dna', label: 'نسل', value: a.breed })
    if (a.gender !== 'unknown') rows.push({ icon: 'gender-male-female', label: 'نر / مادہ', value: t(GENDER_LABEL[a.gender]) })
    if (a.teeth) rows.push({ icon: 'tooth-outline', label: 'دانت', value: t(TEETH_LABEL[a.teeth]) })
    const age = formatAge(a.ageMonths)
    if (age) rows.push({ icon: 'calendar-outline', label: 'عمر', value: age })
    if (a.liveWeightKg) rows.push({ icon: 'scale', label: 'زندہ وزن', value: `${a.liveWeightKg} ${t('کلو')} (${(a.liveWeightKg / KG_PER_MAUND).toFixed(1)} ${t('من')})`, note: t('بیچنے والے کے مطابق') })
    if (a.milkLitresPerDay && (!view || view === 'livestock')) rows.push({ icon: 'cup-water', label: 'دودھ روزانہ', value: `${a.milkLitresPerDay} ${t('لیٹر')}`, note: t('بیچنے والے کے مطابق') })
    if (a.isPregnant) rows.push({ icon: 'baby-carriage', label: 'گابھن / حاملہ', value: t('ہاں') })
    if (a.isVaccinated != null) rows.push({ icon: 'needle', label: 'ویکسین', value: t(a.isVaccinated ? 'لگی ہوئی ہے' : 'نہیں لگی') })
    if (a.healthNotes) rows.push({ icon: 'heart-pulse', label: 'صحت', value: a.healthNotes })
  }

  if (l.qurbani && show('qurbani', 'qurbani')) {
    rows.push(l.qurbani.totalShares === 7
      ? { icon: 'account-group-outline', label: 'قربانی', value: `${t('سات حصے')}${l.qurbani.pricePerShare ? ` · ${formatPrice(l.qurbani.pricePerShare)} ${t('فی حصہ')}` : ''}` }
      : { icon: 'star-crescent', label: 'قربانی', value: t('پورا جانور') })
  }

  if (show('meatSupply', 'meat') && a) {
    const est = meatEstimate(a.liveWeightKg, l.category.slug)
    if (est) rows.push({ icon: 'food-steak', label: 'گوشت کا اندازہ', value: `${est.min}–${est.max} ${t('کلو')}`, note: `${t('اندازہ، پکی بات نہیں')} (${est.ratio})` })
    const perMaund = pricePerMaund(l.price, a.liveWeightKg, l.priceUnit)
    if (perMaund) rows.push({ icon: 'cash', label: 'فی من (زندہ وزن)', value: formatPrice(perMaund), note: t('قیمت ÷ وزن سے نکالا گیا') })
    if (l.meatSupply?.pricePerKgLive) rows.push({ icon: 'cash', label: 'زندہ وزن ریٹ', value: `${formatPrice(l.meatSupply.pricePerKgLive)} ${t('فی کلو')}` })
    if (l.meatSupply) rows.push({ icon: 'truck-outline', label: 'سپلائی', value: t(FREQUENCY_LABEL[l.meatSupply.frequency]) })
  }

  if (l.crop) {
    if (l.crop.variety) rows.push({ icon: 'sprout', label: 'قسم / ورائٹی', value: l.crop.variety })
    if (l.crop.grade) rows.push({ icon: 'star-outline', label: 'معیار', value: l.crop.grade })
    if (l.crop.harvestDate) rows.push({ icon: 'calendar-outline', label: 'کٹائی', value: l.crop.harvestDate })
  }
  if (l.supply) {
    if (l.supply.brand) rows.push({ icon: 'tag-outline', label: 'برانڈ', value: l.supply.brand })
    rows.push({ icon: 'new-box', label: 'حالت', value: t(l.supply.condition === 'new' ? 'نیا' : 'پرانا') })
  }

  if (l.quantity !== 1 || l.section !== 'livestock') rows.push({ icon: 'package-variant', label: 'مقدار', value: formatQuantity(l.quantity, l.quantityUnit) })
  if (l.minOrderQuantity) rows.push({ icon: 'package-down', label: 'کم از کم خریداری', value: formatQuantity(l.minOrderQuantity, l.quantityUnit) })
  if (l.isBulkAvailable) rows.push({ icon: 'warehouse', label: 'تھوک', value: t('دستیاب') })
  if (l.crop) rows.push({ icon: 'hand-extended-outline', label: 'خود اٹھائیں', value: t(l.crop.pickupAvailable ? 'ہاں' : 'نہیں') })
  if (l.deliveryAvailable) rows.push({ icon: 'truck-delivery-outline', label: 'ڈیلیوری', value: t('ہو سکتی ہے') })
  return rows
}

const styles = StyleSheet.create({
  iconBtn: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  noPhoto: { backgroundColor: colors.brand50, alignItems: 'center', justifyContent: 'center', gap: 4 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, paddingVertical: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#d6d3c8' },
  dotOn: { backgroundColor: colors.brand700, width: 20 },
  purpose: { backgroundColor: colors.brand100, borderRadius: radius.full, paddingHorizontal: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingHorizontal: 14, paddingVertical: 6 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.brand700, alignItems: 'center', justifyContent: 'center' },
  actions: {
    position: 'absolute', start: 0, end: 0, bottom: 0, flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 10,
    backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.border,
  },
})
