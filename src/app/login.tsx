import { useState } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native'
import { router } from 'expo-router'
import { Button, Field, Notice, TopBar, Txt } from '@/components/ui'
import { useSession } from '@/lib/session'
import { errorMessage } from '@/lib/errors'
import { cleanPhone, isValidPkMobile } from '@/lib/phone'
import { colors } from '@/theme'
import { t } from '@/i18n'

// Opened as a modal. If there is nothing behind it (e.g. a deep link), go home instead.
const close = () => (router.canGoBack() ? router.back() : router.replace('/'))

export default function Login() {
  const { login } = useSession()
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [touched, setTouched] = useState(false)

  const phoneError = touched && !isValidPkMobile(phone) ? t('موبائل نمبر 03 سے شروع ہو اور 11 ہندسے ہوں') : null
  const passwordError = touched && password.length < 6 ? t('پاس ورڈ کم از کم 6 ہندسے یا حروف') : null

  const submit = async () => {
    setTouched(true)
    setError(null)
    if (!isValidPkMobile(phone) || password.length < 6) return
    setBusy(true)
    try {
      await login(cleanPhone(phone), password)
      close()
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.cream }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <TopBar title="لاگ اِن" onBack={() => close()} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }} keyboardShouldPersistTaps="handled">
        <Txt size={15} color={colors.muted}>اپنا موبائل نمبر اور پاس ورڈ لکھیں</Txt>
        <Field
          label="موبائل نمبر"
          icon="phone"
          ltr
          placeholder="03001234567"
          keyboardType="phone-pad"
          autoComplete="tel"
          textContentType="telephoneNumber"
          maxLength={14}
          value={phone}
          onChangeText={setPhone}
          error={phoneError}
        />
        <Field
          label="پاس ورڈ یا پِن"
          icon="lock-outline"
          ltr
          secureTextEntry={!show}
          autoComplete="current-password"
          textContentType="password"
          value={password}
          onChangeText={setPassword}
          onSubmitEditing={submit}
          error={passwordError}
        />
        <Button label={show ? 'پاس ورڈ چھپائیں' : 'پاس ورڈ دکھائیں'} icon={show ? 'eye-off-outline' : 'eye-outline'} variant="soft" onPress={() => setShow(!show)} />
        {error && <Notice tone="error" text={error} />}
        <Button label="لاگ اِن کریں" icon="login" loading={busy} onPress={submit} />
        <View style={{ alignItems: 'center', gap: 8, marginTop: 8 }}>
          <Txt color={colors.muted}>اکاؤنٹ نہیں ہے؟</Txt>
          <Button label="نیا اکاؤنٹ بنائیں" variant="outline" icon="account-plus-outline" style={{ alignSelf: 'stretch' }} onPress={() => router.replace('/register')} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
