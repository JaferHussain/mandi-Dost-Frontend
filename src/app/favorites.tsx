import { useCallback, useState } from 'react'
import { View } from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { TopBar } from '@/components/ui'
import { ListingFeed } from '@/components/listing-feed'
import { api } from '@/lib/api'

const close = () => (router.canGoBack() ? router.back() : router.replace('/profile'))

export default function Favorites() {
  const [version, setVersion] = useState(0)
  useFocusEffect(useCallback(() => setVersion((v) => v + 1), []))

  return (
    <View style={{ flex: 1 }}>
      <TopBar title="پسندیدہ" onBack={close} />
      <ListingFeed
        source={(page) => api.favorites(page)}
        sourceKey={`fav:${version}`}
        emptyTitle="ابھی کچھ پسندیدہ نہیں"
        emptyText="کسی اشتہار پر دل کا نشان دبائیں، وہ یہاں محفوظ ہو جائے گا"
      />
    </View>
  )
}
