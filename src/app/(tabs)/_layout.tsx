import { View, StyleSheet, type ColorValue } from 'react-native'
import { Tabs } from 'expo-router'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { colors, fonts } from '@/theme'
import { t } from '@/i18n'
import type { IconName } from '@/components/ui'

const icon = (name: IconName, active: IconName) =>
  function TabIcon({ color, focused }: { color: ColorValue; focused: boolean }) {
    return <MaterialCommunityIcons name={focused ? active : name} size={28} color={color as string} />
  }

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand700,
        tabBarInactiveTintColor: '#7b8476',
        tabBarStyle: { height: 84, paddingTop: 6, paddingBottom: 8, backgroundColor: colors.white, borderTopColor: colors.border },
        // Nastaliq letters hang low: give the label room so it isn't clipped
        tabBarLabelStyle: { fontFamily: fonts.urdu, fontSize: 12, lineHeight: 26, paddingBottom: 4 },
        sceneStyle: { backgroundColor: colors.cream },
      }}>
      <Tabs.Screen name="index" options={{ title: t('گھر'), tabBarIcon: icon('home-outline', 'home') }} />
      <Tabs.Screen name="explore" options={{ title: t('تلاش'), tabBarIcon: icon('magnify', 'magnify') }} />
      <Tabs.Screen
        name="sell"
        options={{
          title: t('بیچیں'),
          tabBarActiveTintColor: colors.brand800,
          tabBarIcon: () => (
            // Raised round button so the most important action is easy to find
            <View style={styles.sell}>
              <MaterialCommunityIcons name="plus" size={36} color={colors.white} />
            </View>
          ),
        }}
      />
      <Tabs.Screen name="messages" options={{ title: t('پیغامات'), tabBarIcon: icon('message-outline', 'message') }} />
      <Tabs.Screen name="profile" options={{ title: t('پروفائل'), tabBarIcon: icon('account-outline', 'account') }} />
    </Tabs>
  )
}

const styles = StyleSheet.create({
  sell: {
    width: 62, height: 62, borderRadius: 31, marginTop: -26, backgroundColor: colors.brand700,
    alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: colors.white,
    elevation: 6, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 6, shadowOffset: { width: 0, height: 3 },
  },
})
