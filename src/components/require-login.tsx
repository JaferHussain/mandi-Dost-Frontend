import { View } from 'react-native'
import { router } from 'expo-router'
import { Button, EmptyState, type IconName } from './ui'

/** Shown on tabs that need an account (sell, messages) when nobody is logged in. */
export function RequireLogin({ icon, title, text }: { icon: IconName; title: string; text: string }) {
  return (
    <EmptyState
      icon={icon}
      title={title}
      text={text}
      action={
        <View style={{ gap: 10 }}>
          <Button label="لاگ اِن کریں" icon="login" onPress={() => router.push('/login')} />
          <Button label="نیا اکاؤنٹ بنائیں" icon="account-plus-outline" variant="outline" onPress={() => router.push('/register')} />
        </View>
      }
    />
  )
}
