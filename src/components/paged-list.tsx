import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react'
import { FlatList, RefreshControl, View } from 'react-native'
import type { Paged } from '@/lib/api'
import { errorMessage } from '@/lib/errors'
import { colors } from '@/theme'
import { Button, EmptyState, Loading, Notice, type IconName } from './ui'

/**
 * Paged list for any API list endpoint. Loads 20 at a time as the user scrolls
 * (keeps data use low), pull down to refresh, reloads when `sourceKey` changes.
 */
export function PagedList<T extends { id: number }>({
  source, sourceKey, renderItem, header, emptyTitle, emptyText, emptyAction, emptyIcon = 'clipboard-text-search-outline',
}: {
  source: (page: number) => Promise<Paged<T>>
  sourceKey: string
  renderItem: (item: T) => ReactElement
  header?: ReactElement
  emptyTitle: string
  emptyText?: string
  emptyAction?: ReactElement
  emptyIcon?: IconName
}) {
  const [items, setItems] = useState<T[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const latestKey = useRef(sourceKey)
  const appending = useRef(false)
  const sourceRef = useRef(source)
  // Keep the latest source without reloading on every render (runs before the load effect below).
  useEffect(() => {
    sourceRef.current = source
  })

  const load = useCallback(async (p: number, mode: 'replace' | 'append') => {
    const requestKey = latestKey.current
    if (mode === 'append') {
      if (appending.current) return // scrolling fires this repeatedly; one page at a time
      appending.current = true
    }
    try {
      const res = await sourceRef.current(p)
      if (latestKey.current !== requestKey) return // filters changed meanwhile
      setItems((prev) => (mode === 'replace' ? res.items : [...prev, ...res.items.filter((i) => !prev.some((x) => x.id === i.id))]))
      setPage(p)
      setHasMore(res.hasMore)
      setError(null)
    } catch (e) {
      if (latestKey.current === requestKey) setError(errorMessage(e))
    } finally {
      if (mode === 'append') appending.current = false
      if (latestKey.current === requestKey) {
        setLoading(false)
        setRefreshing(false)
      }
    }
  }, [])

  useEffect(() => {
    latestKey.current = sourceKey
    // Reset and load the first page whenever the filters change
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    load(1, 'replace')
  }, [sourceKey, load])

  return (
    <FlatList
      data={items}
      keyExtractor={(i) => String(i.id)}
      renderItem={({ item }) => renderItem(item)}
      ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      ListHeaderComponent={header ? <View style={{ marginBottom: 12 }}>{header}</View> : undefined}
      ListEmptyComponent={
        loading ? <Loading /> : error ? (
          <View style={{ gap: 10 }}>
            <Notice tone="error" text={error} />
            <Button label="دوبارہ کوشش کریں" icon="refresh" variant="outline" onPress={() => { setLoading(true); load(1, 'replace') }} />
          </View>
        ) : (
          <View style={{ backgroundColor: colors.white, borderRadius: 24, borderWidth: 1, borderColor: colors.border }}>
            <EmptyState icon={emptyIcon} title={emptyTitle} text={emptyText} action={emptyAction} />
          </View>
        )
      }
      ListFooterComponent={hasMore ? <Loading label="مزید…" /> : undefined}
      onEndReachedThreshold={0.5}
      onEndReached={() => {
        if (hasMore && !loading) load(page + 1, 'append')
      }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(1, 'replace') }} colors={[colors.brand700]} />}
    />
  )
}
