import { useState } from 'react'
import { View } from 'react-native'
import { api, type ReportReason } from '@/lib/api'
import { errorMessage } from '@/lib/errors'
import { REPORT_REASON_LABEL } from '@/lib/format'
import { t } from '@/i18n'
import { Choice } from './sell-parts'
import { Button, Field, Notice, Sheet, Txt } from './ui'

const REASONS = Object.keys(REPORT_REASON_LABEL) as ReportReason[]

/** "Report this listing": pick a reason, optional note. Three separate reports hide a listing until checked. */
export function ReportSheet({ listingId, open, onClose }: { listingId: number; open: boolean; onClose: () => void }) {
  const [reason, setReason] = useState<ReportReason | null>(null)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<{ tone: 'error' | 'success'; text: string } | null>(null)

  const send = async () => {
    if (!reason) return setResult({ tone: 'error', text: t('وجہ چنیں') })
    setBusy(true)
    try {
      await api.report(listingId, reason, note.trim() || undefined)
      setResult({ tone: 'success', text: t('شکریہ۔ منڈی دوست کی ٹیم یہ اشتہار دیکھے گی') })
    } catch (e) {
      setResult({ tone: 'error', text: t(errorMessage(e)) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet open={open} onClose={() => { onClose(); setResult(null) }} title="اشتہار رپورٹ کریں">
      <View style={{ gap: 10, paddingBottom: 8 }}>
        <Txt size={14}>کیا مسئلہ ہے؟</Txt>
        {REASONS.map((r) => <Choice key={r} wide label={REPORT_REASON_LABEL[r]} on={reason === r} onPress={() => setReason(r)} />)}
        <Field label="مزید بتائیں (اختیاری)" icon="text" value={note} onChangeText={setNote} multiline maxLength={500} />
        {result && <Notice tone={result.tone} text={result.text} />}
        {result?.tone !== 'success' && <Button label="رپورٹ بھیجیں" icon="flag-outline" variant="danger" loading={busy} onPress={send} />}
      </View>
    </Sheet>
  )
}
