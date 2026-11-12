import type { ReactElement } from 'react'
import { api, type ListingQuery, type ListingSummary, type Paged } from '@/lib/api'
import type { SectionId } from '@/data/sections'
import { ListingCard } from './listing-card'
import { PagedList } from './paged-list'

/** Paged list of listings: the public feed for a query, or another source (my listings, favourites). */
export function ListingFeed({
  query, source, sourceKey, showStatus, view, header, emptyTitle = 'ابھی کوئی اشتہار نہیں', emptyText, emptyAction,
}: {
  query?: ListingQuery
  source?: (page: number) => Promise<Paged<ListingSummary>>
  sourceKey?: string
  showStatus?: boolean
  emptyAction?: ReactElement
  view?: SectionId
  header?: ReactElement
  emptyTitle?: string
  emptyText?: string
}) {
  return (
    <PagedList<ListingSummary>
      source={source ?? ((page) => api.listings({ ...query, page, pageSize: 20 }))}
      sourceKey={sourceKey ?? JSON.stringify(query)}
      renderItem={(item) => <ListingCard item={item} view={view} showStatus={showStatus} />}
      header={header}
      emptyTitle={emptyTitle}
      emptyText={emptyText}
      emptyAction={emptyAction}
    />
  )
}
