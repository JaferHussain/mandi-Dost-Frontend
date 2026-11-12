import { useState } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native'
import { router } from 'expo-router'
import { Button, Field, Notice, TopBar, Txt } from '@/components/ui'
import { useSession } from '@/lib/session'
import { errorMessage } from '@/lib/errors'
import { cleanPhone, isValidPkMobile } from '@/lib/phone'
import { colors } from '@/theme'
import { t } from '@/i18n'

const close = () => (router.canGoBack() ? router.back() : router.replace('/'))

export default function Register() {
  const { register } = useSession()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [touched, setTouched] = useState(false)

  const nameOk = name.trim().length >= 2
  const errs = {
    name: touched && !nameOk ? t('اپنا نام یا دکان / فارم کا نام لکھیں') : null,
    phone: touched && !isValidPkMobile(phone) ? t('موبائل نمبر 03 سے شروع ہو اور 11 ہندسے ہوں') : null,
    password: touched && password.length < 6 ? t('پاس ورڈ کم از کم 6 ہندسے یا حروف') : null,
  }

  const submit = async () => {
    setTouched(true)
    setError(null)
    if (!nameOk || !isValidPkMobile(phone) || password.length < 6) return
    setBusy(true)
    try {
      await register({ fullName: name.trim(), phoneNumber: cleanPhone(phone), password })
      close()
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.cream }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <TopBar title="نیا اکاؤنٹ" onBack={() => close()} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }} keyboardShouldPersistTaps="handled">
        <Txt size={15} color={colors.muted}>ایک ہی اکاؤنٹ سے خرید بھی سکتے ہیں اور بیچ بھی سکتے ہیں</Txt>
        <Field label="نام" icon="account-outline" placeholder="مثلاً: غلام فرید ڈیری فارم" value={name} onChangeText={setName} maxLength={80} error={errs.name} />
        <Field label="موبائل نمبر" icon="phone" ltr placeholder="03001234567" keyboardType="phone-pad" autoComplete="tel" maxLength={14} value={phone} onChangeText={setPhone} error={errs.phone} />
        <Field
          label="پاس ورڈ یا 6 ہندسوں کا پِن"
          icon="lock-outline"
          ltr
          secureTextEntry={!show}
          autoComplete="new-password"
          textContentType="newPassword"
          value={password}
          onChangeText={setPassword}
          onSubmitEditing={submit}
          error={errs.password}
        />
        <Button label={show ? 'پاس ورڈ چھپائیں' : 'پاس ورڈ دکھائیں'} icon={show ? 'eye-off-outline' : 'eye-outline'} variant="soft" onPress={() => setShow(!show)} />
        <Notice text="یہ پاس ورڈ یاد رکھیں۔ اسے کسی کو نہ بتائیں" icon="shield-key-outline" />
        {error && <Notice tone="error" text={error} />}
        <Button label="اکاؤنٹ بنائیں" icon="check" loading={busy} onPress={submit} />
        <Button label="پہلے سے اکاؤنٹ ہے؟ لاگ اِن کریں" variant="outline" onPress={() => router.replace('/login')} />
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
