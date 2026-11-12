import { useCallback, useState } from 'react'
import { Alert, Pressable, ScrollView, View } from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { Button, Card, EmptyState, Loading, Notice, TopBar, Txt } from '@/components/ui'
import { api, type AdminReport, type Business } from '@/lib/api'
import { errorMessage } from '@/lib/errors'
import { BUSINESS_TYPE_LABEL, REPORT_REASON_LABEL, timeAgo } from '@/lib/format'
import { useSession } from '@/lib/session'
import { colors } from '@/theme'
import { t } from '@/i18n'

const close = () => (router.canGoBack() ? router.back() : router.replace('/profile'))

/** Moderators: reported listings and businesses waiting for verification. */
export default function Admin() {
  const { user } = useSession()
  const [reports, setReports] = useState<AdminReport[] | null>(null)
  const [pending, setPending] = useState<Business[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    api.adminReports().then(setReports, (e) => setError(errorMessage(e)))
    api.pendingBusinesses().then(setPending, (e) => setError(errorMessage(e)))
  }, [])
  useFocusEffect(load)

  if (!user || (user.role !== 'Admin' && user.role !== 'Moderator')) {
    return <View style={{ flex: 1 }}><TopBar title="انتظامیہ" onBack={close} /><EmptyState icon="shield-lock-outline" title="یہ صفحہ صرف منڈی دوست کی ٹیم کے لیے ہے" /></View>
  }

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

  return (
    <View style={{ flex: 1 }}>
      <TopBar title="انتظامیہ" onBack={close} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}>
        {error && <Notice tone="error" text={error} />}

        <Txt bold size={19}>{`${t('رپورٹ ہوئے اشتہار')} (${reports?.length ?? 0})`}</Txt>
        {!reports ? <Loading /> : reports.length === 0 ? <Notice tone="success" text="کوئی کھلی رپورٹ نہیں" /> : reports.map((r) => (
          <Card key={r.id} style={{ gap: 6 }}>
            <Pressable onPress={() => router.push({ pathname: '/listing/[id]', params: { id: String(r.listingId) } })} accessibilityRole="link">
              <Txt bold size={16} color={colors.brand700}>{r.listingTitle}</Txt>
            </Pressable>
            <Txt size={14} color={colors.danger}>{REPORT_REASON_LABEL[r.reason]}</Txt>
            {r.note && <Txt size={14}>{r.note}</Txt>}
            <Txt size={12} color={colors.muted}>
              {`${r.reporterName} · ${timeAgo(r.createdAtUtc)} · ${r.openReportsOnListing} ${t('رپورٹس')} · ${r.listingStatus === 'hidden' ? t('ابھی چھپا ہوا') : t('نظر آ رہا ہے')}`}
            </Txt>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Button label="اشتہار چھپائیں" icon="eye-off-outline" variant="danger" style={{ flex: 1 }} loading={busy} onPress={() => act(() => api.resolveReport(r.id, true))} />
              <Button label="رپورٹ غلط ہے" icon="check" variant="soft" style={{ flex: 1 }} loading={busy} onPress={() => act(() => api.resolveReport(r.id, false))} />
            </View>
          </Card>
        ))}

        <Txt bold size={19}>{`${t('تصدیق کے منتظر کاروبار')} (${pending?.length ?? 0})`}</Txt>
        {!pending ? <Loading /> : pending.length === 0 ? <Notice tone="success" text="کوئی کاروبار انتظار میں نہیں" /> : pending.map((b) => (
          <Card key={b.id} style={{ gap: 6 }}>
            <Txt bold size={16}>{b.businessName}</Txt>
            <Txt size={14}>{`${t(BUSINESS_TYPE_LABEL[b.type])} · ${b.location.nameUr}${b.address ? `، ${b.address}` : ''}`}</Txt>
            {b.contactPhone && <Txt size={14} style={{ writingDirection: 'ltr' }}>{b.contactPhone}</Txt>}
            <Txt size={12} color={colors.muted}>پہلے فون یا دورہ کر کے تصدیق کریں</Txt>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Button label="تصدیق کریں" icon="check-decagram" variant="soft" style={{ flex: 1 }} loading={busy} onPress={() => act(() => api.decideBusiness(b.id, true))} />
              <Button label="مسترد" icon="close" variant="danger" style={{ flex: 1 }} loading={busy} onPress={() => act(() => api.decideBusiness(b.id, false))} />
            </View>
          </Card>
        ))}
      </ScrollView>
    </View>
  )
}
