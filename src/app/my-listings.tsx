import { useCallback, useState } from 'react'
import { View } from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { Button, TopBar } from '@/components/ui'
import { ListingFeed } from '@/components/listing-feed'
import { api } from '@/lib/api'

const close = () => (router.canGoBack() ? router.back() : router.replace('/profile'))

export default function MyListings() {
  // Reload when coming back from a listing (it may have been published, sold or removed).
  const [version, setVersion] = useState(0)
  useFocusEffect(useCallback(() => setVersion((v) => v + 1), []))

  return (
    <View style={{ flex: 1 }}>
      <TopBar title="میرے اشتہار" onBack={close} />
      <ListingFeed
        source={(page) => api.myListings(page)}
        sourceKey={`mine:${version}`}
        showStatus
        emptyTitle="آپ نے ابھی کوئی اشتہار نہیں لگایا"
        emptyAction={<Button label="جانور یا چیز بیچیں" icon="plus" onPress={() => router.navigate('/sell')} />}
      />
    </View>
  )
}
