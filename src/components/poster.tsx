import { useRef, useState } from 'react'
import { Platform, Share, StyleSheet, View } from 'react-native'
import { Image } from 'expo-image'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import * as Sharing from 'expo-sharing'
import { captureRef } from 'react-native-view-shot'
import { mediaUrl, type ListingDetail } from '@/lib/api'
import { errorMessage } from '@/lib/errors'
import { formatAge, formatPrice, priceUnitLabel, PURPOSE_LABEL, TEETH_LABEL } from '@/lib/format'
import { ANIMAL_ICONS } from '@/data/sections'
import { colors, radius } from '@/theme'
import { t } from '@/i18n'
import { Button, Notice, Sheet, Txt, type IconName } from './ui'

/**
 * One-tap "poster" image of a listing for WhatsApp groups – where most mandi trading happens.
 * The phone's share menu opens; the user picks WhatsApp (or any app).
 */
export function PosterSheet({ listing, open, onClose }: { listing: ListingDetail; open: boolean; onClose: () => void }) {
  const card = useRef<React.ComponentRef<typeof View>>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const l = listing
  const photo = mediaUrl(l.media[0]?.url)

  const facts = [
    l.livestock?.breed,
    l.livestock?.teeth ? t(TEETH_LABEL[l.livestock.teeth]).split(' (')[0] : null,
    formatAge(l.livestock?.ageMonths),
    l.livestock?.liveWeightKg ? `${l.livestock.liveWeightKg} ${t('کلو')}` : null,
    l.crop?.variety,
    l.qurbani?.totalShares === 7 ? t('سات حصے') : null,
  ].filter((x): x is string => !!x)

  const priceText = `${formatPrice(l.price)}${l.price != null ? ` ${t(priceUnitLabel(l.priceUnit, l.section))}` : ''}`
  const text = [l.title, priceText, facts.join(' · '), `📍 ${l.location.nameUr}`, l.sellerPhone ? `📞 ${l.sellerPhone}` : null, t('منڈی دوست ایپ پر دیکھیں')]
    .filter(Boolean).join('\n')

  const share = async () => {
    setBusy(true)
    setError(null)
    try {
      // The browser preview can't turn a screen into a picture; share the text there.
      if (Platform.OS === 'web' || !(await Sharing.isAvailableAsync())) {
        await Share.share({ message: text })
        return
      }
      const uri = await captureRef(card, { format: 'jpg', quality: 0.9, result: 'tmpfile' })
      await Sharing.shareAsync(uri, { mimeType: 'image/jpeg', dialogTitle: t('واٹس ایپ پر بھیجیں') })
    } catch (e) {
      setError(t(errorMessage(e)))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="واٹس ایپ پوسٹر">
      <View style={{ gap: 12, paddingBottom: 8 }}>
        {/* The card that becomes the image */}
        <View ref={card} collapsable={false} style={styles.card}>
          <View style={styles.brand}>
            <MaterialCommunityIcons name="cow" size={22} color={colors.white} />
            <Txt bold size={16} color={colors.white}>منڈی دوست</Txt>
          </View>
          {photo ? (
            <Image source={photo} style={styles.photo} contentFit="cover" />
          ) : (
            <View style={[styles.photo, { alignItems: 'center', justifyContent: 'center' }]}>
              <MaterialCommunityIcons name={(l.section === 'livestock' ? ANIMAL_ICONS[l.category.slug] : l.category.iconKey) as IconName ?? 'tag-outline'} size={80} color={colors.brand700} />
            </View>
          )}
          <View style={{ padding: 12, gap: 4 }}>
            <Txt bold size={19}>{l.title}</Txt>
            <Txt bold size={24} color={colors.brand700}>{priceText}</Txt>
            {facts.length > 0 && <Txt size={15}>{facts.join(' · ')}</Txt>}
            {l.purposes.length > 0 && <Txt size={14} color={colors.earth}>{l.purposes.map((p) => t(PURPOSE_LABEL[p])).join('، ')}</Txt>}
            <View style={styles.footer}>
              <Txt bold size={15}>{`📍 ${l.location.nameUr}`}</Txt>
              {l.sellerPhone && <Txt bold size={16} style={{ writingDirection: 'ltr' }}>{`📞 ${l.sellerPhone}`}</Txt>}
            </View>
          </View>
        </View>
        {error && <Notice tone="error" text={error} />}
        <Button label="واٹس ایپ پر بھیجیں" icon="whatsapp" loading={busy} onPress={share} />
        <Txt size={12} color={colors.muted} center>تصویر بنے گی، پھر واٹس ایپ گروپ چنیں</Txt>
      </View>
    </Sheet>
  )
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.white, borderRadius: radius.lg, overflow: 'hidden', borderWidth: 2, borderColor: colors.brand700 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 4, backgroundColor: colors.brand700 },
  photo: { width: '100%', aspectRatio: 4 / 3, backgroundColor: colors.brand50 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: colors.border },
})
