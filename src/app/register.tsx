import { useRef, useState } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native'
import { router } from 'expo-router'
import { Button, Field, Notice, Popup, TopBar, Txt } from '@/components/ui'
import { useSession } from '@/lib/session'
import { ApiError } from '@/lib/api'
import { errorMessage } from '@/lib/errors'
import { cleanPhone, isValidPkMobile } from '@/lib/phone'
import { cnicDigits, formatCnic, isValidCnicOrEmpty } from '@/lib/cnic'
import { colors } from '@/theme'
import { t } from '@/i18n'

const close = () => (router.canGoBack() ? router.back() : router.replace('/'))

type FieldKey = 'name' | 'phone' | 'cnic' | 'password'

// Server field names (from validation errors) → fields on this screen
const SERVER_FIELDS: Record<string, FieldKey> = { fullname: 'name', phonenumber: 'phone', cnic: 'cnic', password: 'password' }

const FIELD_MESSAGES: Record<FieldKey, string> = {
  name: 'اپنا نام یا دکان / فارم کا نام لکھیں',
  phone: 'موبائل نمبر 03 سے شروع ہو اور 11 ہندسے ہوں',
  cnic: 'شناختی کارڈ نمبر 13 ہندسوں کا ہو، جیسے 35202-1234567-1',
  password: 'پاس ورڈ کم از کم 6 ہندسے یا حروف',
}

export default function Register() {
  const { register } = useSession()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [cnic, setCnic] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [touched, setTouched] = useState(false)
  // Errors returned by the server for one field (e.g. "number already registered"); cleared when that field changes
  const [serverErrors, setServerErrors] = useState<Partial<Record<FieldKey, string>>>({})
  const [popup, setPopup] = useState<{ title: string; text: string; code?: string } | null>(null)
  // Stops a second sign-up being sent (pressing Enter and tapping the button together)
  const sending = useRef(false)

  const nameOk = name.trim().length >= 2
  const local: Record<FieldKey, boolean> = {
    name: nameOk,
    phone: isValidPkMobile(phone),
    cnic: isValidCnicOrEmpty(cnic),
    password: password.length >= 6,
  }
  const errorFor = (k: FieldKey) =>
    serverErrors[k] ?? (touched && !local[k] ? t(FIELD_MESSAGES[k]) : null)

  const edit = (k: FieldKey, set: (v: string) => void) => (v: string) => {
    set(v)
    if (serverErrors[k]) setServerErrors(({ [k]: _, ...rest }) => rest)
  }

  const submit = async () => {
    if (sending.current) return
    setTouched(true)
    setServerErrors({})
    if (!Object.values(local).every(Boolean)) return
    sending.current = true
    setBusy(true)
    try {
      const digits = cnicDigits(cnic)
      await register({ fullName: name.trim(), phoneNumber: cleanPhone(phone), password, cnic: digits || undefined })
      close()
    } catch (e) {
      showError(e)
    } finally {
      sending.current = false
      setBusy(false)
    }
  }

  const showError = (e: unknown) => {
    const message = errorMessage(e)
    if (e instanceof ApiError) {
      if (e.code === 'phone_taken') {
        setServerErrors({ phone: t('یہ موبائل نمبر پہلے سے رجسٹر ہے') })
        setPopup({ title: 'موبائل نمبر پہلے سے موجود ہے', text: message, code: e.code })
        return
      }
      if (e.code === 'cnic_taken') {
        setServerErrors({ cnic: t('یہ شناختی کارڈ نمبر پہلے سے درج ہے') })
        setPopup({ title: 'شناختی کارڈ پہلے سے موجود ہے', text: message, code: e.code })
        return
      }
      if (e.code === 'weak_password') {
        setServerErrors({ password: message })
        setPopup({ title: 'پاس ورڈ بدلیں', text: message })
        return
      }
      if (e.code === 'validation_failed' && e.fieldErrors) {
        const fields: Partial<Record<FieldKey, string>> = {}
        for (const key of Object.keys(e.fieldErrors)) {
          const f = SERVER_FIELDS[key.toLowerCase()]
          if (f) fields[f] = t(FIELD_MESSAGES[f])
        }
        setServerErrors(fields)
      }
    }
    setPopup({ title: 'اکاؤنٹ نہیں بن سکا', text: message })
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.cream }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <TopBar title="نیا اکاؤنٹ" onBack={() => close()} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }} keyboardShouldPersistTaps="handled">
        <Txt size={15} color={colors.muted}>ایک ہی اکاؤنٹ سے خرید بھی سکتے ہیں اور بیچ بھی سکتے ہیں</Txt>
        <Field label="نام" icon="account-outline" placeholder="مثلاً: غلام فرید ڈیری فارم" value={name} onChangeText={edit('name', setName)} maxLength={80} error={errorFor('name')} />
        <Field label="موبائل نمبر" icon="phone" ltr placeholder="03001234567" keyboardType="phone-pad" autoComplete="tel" maxLength={14} value={phone} onChangeText={edit('phone', setPhone)} error={errorFor('phone')} />
        <Field
          label="شناختی کارڈ نمبر (اختیاری)"
          icon="card-account-details-outline"
          ltr
          placeholder="35202-1234567-1"
          keyboardType="number-pad"
          maxLength={15}
          value={cnic}
          onChangeText={edit('cnic', (v) => setCnic(formatCnic(v)))}
          error={errorFor('cnic')}
        />
        <Field
          label="پاس ورڈ یا 6 ہندسوں کا پِن"
          icon="lock-outline"
          ltr
          secureTextEntry={!show}
          autoComplete="new-password"
          textContentType="newPassword"
          value={password}
          onChangeText={edit('password', setPassword)}
          onSubmitEditing={submit}
          error={errorFor('password')}
        />
        <Button label={show ? 'پاس ورڈ چھپائیں' : 'پاس ورڈ دکھائیں'} icon={show ? 'eye-off-outline' : 'eye-outline'} variant="soft" onPress={() => setShow(!show)} />
        <Notice text="یہ پاس ورڈ یاد رکھیں۔ اسے کسی کو نہ بتائیں" icon="shield-key-outline" />
        <Button label="اکاؤنٹ بنائیں" icon="check" loading={busy} disabled={busy} onPress={submit} />
        <Button label="پہلے سے اکاؤنٹ ہے؟ لاگ اِن کریں" variant="outline" onPress={() => router.replace('/login')} />
      </ScrollView>

      <Popup
        open={!!popup}
        onClose={() => setPopup(null)}
        title={popup?.title ?? ''}
        text={popup?.text ?? ''}
        actions={popup?.code === 'phone_taken'
          ? <Button label="اس نمبر سے لاگ اِن کریں" icon="login" onPress={() => { setPopup(null); router.replace('/login') }} />
          : undefined}
      />
    </KeyboardAvoidingView>
  )
}
