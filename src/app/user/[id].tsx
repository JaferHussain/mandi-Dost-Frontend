import { useCallback, useEffect, useState } from 'react'
import { Linking, StyleSheet, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { Button, Card, EmptyState, Field, Loading, Notice, TopBar, Txt } from '@/components/ui'
import { Stars } from '@/components/stars'
import { ListingFeed } from '@/components/listing-feed'
import { api, type PublicProfile, type Review } from '@/lib/api'
import { errorMessage } from '@/lib/errors'
import { BUSINESS_TYPE_LABEL, timeAgo, toWhatsApp } from '@/lib/format'
import { useSession } from '@/lib/session'
import { colors, radius } from '@/theme'
import { t } from '@/i18n'

const back = () => (router.canGoBack() ? router.back() : router.replace('/'))

/** A seller's public page: who they are, their listings, and what buyers say. */
export default function UserScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const userId = Number(id)
  const { user } = useSession()
  const [profile, setProfile] = useState<PublicProfile | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [error, setError] = useState<string | null>(null)
  const [rating, setRating] = useState(0)
  const [text, setText] = useState('')
  const [reviewMsg, setReviewMsg] = useState<{ tone: 'error' | 'success'; text: string } | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    api.profile(userId).then(setProfile, (e) => setError(errorMessage(e)))
    api.reviews(userId).then(setReviews).catch(() => {})
  }, [userId])
  useEffect(() => {
    load()
  }, [load, user?.id])

  if (error) return <View style={{ flex: 1 }}><TopBar title="بیچنے والا" onBack={back} /><EmptyState icon="account-alert-outline" title={error} /></View>
  if (!profile) return <View style={{ flex: 1 }}><TopBar title="بیچنے والا" onBack={back} /><Loading /></View>

  const p = profile
  const isMe = user?.id === p.id
  const submitReview = async () => {
    if (!rating) return setReviewMsg({ tone: 'error', text: t('ستارے چنیں') })
    setBusy(true)
    try {
      await api.review(p.id, rating, text.trim() || undefined)
      setReviewMsg({ tone: 'success', text: t('آپ کی رائے محفوظ ہو گئی۔ شکریہ') })
      setRating(0); setText('')
      load()
    } catch (e) {
      setReviewMsg({ tone: 'error', text: t(errorMessage(e)) })
    } finally {
      setBusy(false)
    }
  }

  const header = (
    <View style={{ gap: 12 }}>
      <Card style={{ gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={styles.avatar}><Txt bold size={26} color={colors.white}>{(p.business?.businessName ?? p.fullName).trim().charAt(0)}</Txt></View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Txt bold size={19} style={{ flexShrink: 1 }}>{p.business?.businessName ?? p.fullName}</Txt>
              {p.business?.verification === 'verified' && <MaterialCommunityIcons name="check-decagram" size={20} color={colors.brand700} />}
            </View>
            {p.business && <Txt size={13} color={colors.muted}>{`${t(BUSINESS_TYPE_LABEL[p.business.type])} · ${p.fullName}`}</Txt>}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Stars value={p.ratingAverage} />
              <Txt size={13} color={colors.muted}>{p.ratingCount ? `${p.ratingAverage} (${p.ratingCount})` : t('ابھی کوئی رائے نہیں')}</Txt>
            </View>
          </View>
        </View>
        <View style={styles.stats}>
          <Stat value={p.activeListings} label="لگے اشتہار" />
          <Stat value={p.soldCount} label="بک چکے" />
          <Stat value={new Date(p.memberSinceUtc).getFullYear()} label="سے ممبر" />
        </View>
        {p.location && <Txt size={14} color={colors.muted}>{`📍 ${p.location.nameUr}${p.business?.address ? `، ${p.business.address}` : ''}`}</Txt>}
        {p.bio && <Txt size={14}>{p.bio}</Txt>}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <MaterialCommunityIcons name={p.phoneVerified ? 'check-decagram' : 'information-outline'} size={16} color={p.phoneVerified ? colors.brand700 : colors.muted} />
          <Txt size={13} color={colors.muted}>{p.phoneVerified ? 'نمبر تصدیق شدہ' : 'نمبر کی تصدیق ابھی نہیں ہوئی'}</Txt>
        </View>
      </Card>

      {!isMe && (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button label="پیغام" icon="message-text-outline" style={{ flex: 1 }}
            onPress={async () => {
              if (!user) return router.push('/login')
              const chat = await api.startChat({ userId: p.id })
              router.push({ pathname: '/chat/[id]', params: { id: String(chat.id) } })
            }} />
          {(p.business?.contactPhone ?? p.phoneNumber) && (
            <Button label="کال" icon="phone" variant="outline" style={{ flex: 1 }}
              onPress={() => Linking.openURL(`tel:${(p.business?.contactPhone ?? p.phoneNumber)!.replace(/[^\d+]/g, '')}`)} />
          )}
          {p.phoneNumber && (
            <Button label="واٹس ایپ" icon="whatsapp" variant="outline" style={{ flex: 1 }}
              onPress={() => Linking.openURL(`https://wa.me/${toWhatsApp(p.phoneNumber!)}`)} />
          )}
        </View>
      )}

      <Txt bold size={18}>{`${t('رائے')} (${reviews.length})`}</Txt>
      {reviews.length === 0 && <Notice text="ابھی کسی نے رائے نہیں دی" />}
      {reviews.map((r) => (
        <Card key={r.id} style={{ gap: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Txt bold size={15} style={{ flex: 1 }}>{r.reviewerName}</Txt>
            <Stars value={r.rating} size={16} />
          </View>
          {r.text && <Txt size={15}>{r.text}</Txt>}
          <Txt size={12} color={colors.muted}>{timeAgo(r.createdAtUtc)}</Txt>
        </Card>
      ))}

      {!isMe && user && p.canReview && (
        <Card style={{ gap: 10 }}>
          <Txt bold size={17}>اپنی رائے دیں</Txt>
          <Stars value={rating} size={40} onChange={setRating} />
          <Field label="کچھ لکھیں (اختیاری)" icon="comment-text-outline" placeholder="مثلاً: ایماندار آدمی، جانور ویسا ہی تھا جیسا بتایا" value={text} onChangeText={setText} multiline maxLength={1000} />
          {reviewMsg && <Notice tone={reviewMsg.tone} text={reviewMsg.text} />}
          <Button label="رائے بھیجیں" icon="send" loading={busy} onPress={submitReview} />
        </Card>
      )}
      {!isMe && user && !p.canReview && (
        <Notice text="اس بیچنے والے سے بات یا سودا کرنے کے بعد آپ رائے دے سکیں گے" />
      )}

      <Txt bold size={18}>اشتہارات</Txt>
    </View>
  )

  return (
    <View style={{ flex: 1 }}>
      <TopBar title="بیچنے والا" onBack={back} />
      <ListingFeed query={{ sellerId: p.id }} header={header} emptyTitle="ابھی کوئی اشتہار نہیں لگا" />
    </View>
  )
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Txt bold size={20} color={colors.brand700}>{String(value)}</Txt>
      <Txt size={12} color={colors.muted}>{label}</Txt>
    </View>
  )
}

const styles = StyleSheet.create({
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.brand700, alignItems: 'center', justifyContent: 'center' },
  stats: { flexDirection: 'row', paddingVertical: 8, borderRadius: radius.md, backgroundColor: colors.cream },
})
