import { useCallback, useState } from 'react'
import { View } from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { Button, TopBar } from '@/components/ui'
import { PagedList } from '@/components/paged-list'
import { RequestCard } from '@/components/request-card'
import { api, type RequestSummary } from '@/lib/api'

const close = () => (router.canGoBack() ? router.back() : router.replace('/profile'))

/** Requirements the user posted as a buyer, with their status and offer count. */
export default function MyRequests() {
  const [version, setVersion] = useState(0)
  useFocusEffect(useCallback(() => setVersion((v) => v + 1), []))
  return (
    <View style={{ flex: 1 }}>
      <TopBar title="میری ضرورتیں" onBack={close} />
      <PagedList<RequestSummary>
        source={(page) => api.myRequests(page)}
        sourceKey={`myreq:${version}`}
        renderItem={(item) => <RequestCard item={item} showStatus />}
        header={<Button label="نئی ضرورت بتائیں" icon="bullhorn-outline" onPress={() => router.push('/request/new')} />}
        emptyTitle="آپ نے ابھی کوئی ضرورت نہیں لگائی"
        emptyText="بتائیں آپ کو کیا چاہیے، بیچنے والے پیشکش بھیجیں گے"
      />
    </View>
  )
}
