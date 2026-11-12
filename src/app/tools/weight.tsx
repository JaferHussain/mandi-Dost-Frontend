import { useState } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { Button, Card, Field, Notice, SpeakButton, TopBar, Txt } from '@/components/ui'
import { Choice, ChoiceGroup, digitsOnly } from '@/components/sell-parts'
import { estimateWeightKg, formatPrice, KG_PER_MAUND } from '@/lib/format'
import { colors } from '@/theme'
import { t } from '@/i18n'

const back = () => (router.canGoBack() ? router.back() : router.replace('/'))
const CM_PER_INCH = 2.54


const HOW_TO =
  'فیتے سے دو ناپ لیں۔ پہلا: اگلی ٹانگوں کے بالکل پیچھے چھاتی کے گرد پورا گھیر۔ دوسرا: کندھے کی ہڈی سے پچھلی ہڈی یعنی پونچھ کے پاس تک لمبائی۔ جانور سیدھا کھڑا ہو۔ وزن اندازہ ہوگا، پکا وزن کنڈے سے ہی پتا چلتا ہے۔'

export default function WeightCalculator() {
  const { slug } = useLocalSearchParams<{ slug?: string }>()
  const [unit, setUnit] = useState<'inch' | 'cm'>('inch')
  const [girth, setGirth] = useState('')
  const [length, setLength] = useState('')
  const [pricePerMaund, setPricePerMaund] = useState('')

  const toIn = (v: string) => (unit === 'inch' ? Number(v) : Number(v) / CM_PER_INCH)
  const result = estimateWeightKg(toIn(girth), toIn(length))
  const maund = result ? result.kg / KG_PER_MAUND : 0
  const value = result && Number(pricePerMaund) > 0 ? Math.round(maund * Number(pricePerMaund)) : null

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <TopBar title="فیتے سے وزن" onBack={back} right={<SpeakButton text={HOW_TO} />} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <Card style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <MaterialCommunityIcons name="tape-measure" size={28} color={colors.brand700} />
            <Txt bold size={17}>کیسے ناپیں؟</Txt>
          </View>
          <Txt size={15}>1۔ چھاتی کا گھیر: اگلی ٹانگوں کے بالکل پیچھے، جسم کے گرد پورا فیتہ</Txt>
          <Txt size={15}>2۔ لمبائی: کندھے کی ہڈی سے پچھلی ہڈی (پونچھ کے پاس) تک</Txt>
          <Txt size={13} color={colors.muted}>جانور سیدھا کھڑا ہو اور سر سامنے ہو</Txt>
        </Card>

        <ChoiceGroup label="فیتہ کس میں ہے؟">
          <Choice label="انچ" on={unit === 'inch'} onPress={() => setUnit('inch')} />
          <Choice label="سینٹی میٹر" on={unit === 'cm'} onPress={() => setUnit('cm')} />
        </ChoiceGroup>
        <Field label={`چھاتی کا گھیر (${t(unit === 'inch' ? 'انچ' : 'سینٹی میٹر')})`} icon="circle-outline" ltr keyboardType="decimal-pad"
          placeholder={unit === 'inch' ? '68' : '173'} value={girth} onChangeText={(v) => setGirth(digitsOnly(v, true))} maxLength={5} />
        <Field label={`لمبائی (${t(unit === 'inch' ? 'انچ' : 'سینٹی میٹر')})`} icon="arrow-expand-horizontal" ltr keyboardType="decimal-pad"
          placeholder={unit === 'inch' ? '60' : '152'} value={length} onChangeText={(v) => setLength(digitsOnly(v, true))} maxLength={5} />

        {result ? (
          <Card style={{ gap: 6, borderColor: colors.brand600, borderWidth: 2 }}>
            <Txt size={14} color={colors.muted}>اندازاً زندہ وزن</Txt>
            <Txt bold size={30} color={colors.brand700}>{`${result.kg} ${t('کلو')}`}</Txt>
            <Txt bold size={17}>{`${maund.toFixed(1)} ${t('من')}`}</Txt>
            <Txt size={14} color={colors.earth}>{`${t('اصل وزن')} ${result.min} ${t('سے')} ${result.max} ${t('کلو کے درمیان ہو سکتا ہے')}`}</Txt>
          </Card>
        ) : (
          <Notice text="دونوں ناپ لکھیں، وزن یہاں نظر آئے گا" />
        )}

        {result && (
          <>
            <Field label="منڈی کا ریٹ فی من (اختیاری)" icon="cash" ltr keyboardType="number-pad" placeholder="12000"
              value={pricePerMaund} onChangeText={(v) => setPricePerMaund(digitsOnly(v))} maxLength={7} />
            {value && <Txt bold size={18}>{`${t('اس ریٹ سے قیمت')}: ${formatPrice(value)}`}</Txt>}
            <Txt size={12} color={colors.muted}>ریٹ آپ خود لکھیں۔ منڈی دوست کوئی ریٹ نہیں بتاتا</Txt>
          </>
        )}

        <Notice tone="info" icon="scale-unbalanced" text="یہ صرف اندازہ ہے، پکی بات نہیں۔ پکا وزن کنڈے پر ہی پتا چلتا ہے" />
        {result && slug && (
          <Button label="یہ وزن اشتہار میں لگائیں" icon="check" onPress={() => router.navigate({ pathname: '/sell', params: { weight: String(result.kg) } })} />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
