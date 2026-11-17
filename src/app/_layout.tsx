import { useEffect } from 'react'
import { View } from 'react-native'
import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { useFonts, NotoNastaliqUrdu_400Regular, NotoNastaliqUrdu_700Bold } from '@expo-google-fonts/noto-nastaliq-urdu'
import { SessionProvider, useSession } from '@/lib/session'
import { AssistantProvider } from '@/lib/assistant'
import { NotificationsProvider } from '@/lib/notifications'
import { NotificationPopup } from '@/components/notification-popup'
import { VoiceAssistant } from '@/components/voice-assistant'
import { FirstLaunchLanguage } from '@/components/language'
import { colors } from '@/theme'

SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({ NotoNastaliqUrdu_400Regular, NotoNastaliqUrdu_700Bold })
  const fontsReady = fontsLoaded || !!fontError // if the font fails, carry on with the system font

  return (
    <SafeAreaProvider>
      {/* The whole app is right-to-left (Urdu, Punjabi and Saraiki all use Arabic script). */}
      <View style={{ flex: 1, direction: 'rtl', backgroundColor: colors.cream }}>
        <StatusBar style="dark" />
        <SessionProvider>
          <AssistantProvider>
            <NotificationsProvider>{fontsReady && <AppRoutes />}</NotificationsProvider>
          </AssistantProvider>
        </SessionProvider>
      </View>
    </SafeAreaProvider>
  )
}

function AppRoutes() {
  const { ready, lang, setLang } = useSession()

  useEffect(() => {
    if (ready) SplashScreen.hideAsync()
  }, [ready])

  if (!ready) return null
  if (!lang) return <FirstLaunchLanguage onPick={setLang} />

  return (
    // key={lang}: remount every screen so all text switches language at once.
    <>
    <Stack key={lang} screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.cream } }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="login" options={{ presentation: 'modal' }} />
      <Stack.Screen name="register" options={{ presentation: 'modal' }} />
      <Stack.Screen name="feed/[section]" />
      <Stack.Screen name="listing/[id]" />
      <Stack.Screen name="my-listings" />
      <Stack.Screen name="favorites" />
      <Stack.Screen name="business" />
      <Stack.Screen name="my-requests" />
      <Stack.Screen name="my-offers" />
      <Stack.Screen name="request/new" />
      <Stack.Screen name="request/[id]" />
      <Stack.Screen name="chat/[id]" />
      <Stack.Screen name="user/[id]" />
      <Stack.Screen name="tools/weight" />
      <Stack.Screen name="my-bookings" />
      <Stack.Screen name="admin" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="notification-settings" />
    </Stack>
    {/* Always on top of every screen: alerts that arrive while the app is open, and the "speak to the app" sheet */}
    <NotificationPopup />
    <VoiceAssistant />
    </>
  )
}
