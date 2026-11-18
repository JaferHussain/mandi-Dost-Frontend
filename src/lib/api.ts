import { getItem, setItem } from './storage'

// Base URL of the .NET API. Set EXPO_PUBLIC_API_URL in mobile/.env.
// A phone cannot reach "localhost" on the PC, so use the PC's Wi-Fi IP.
export const API_URL = resolveApiUrl((process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:5080').replace(/\/$/, ''))

// In the browser preview the page and the API run on the same PC. If the configured address is a
// local-network IP (which changes whenever the PC joins another Wi-Fi), use the page's own host instead,
// so the preview keeps working. Real server addresses (https://…) are left alone.
function resolveApiUrl(url: string): string {
  const loc = typeof window !== 'undefined' ? window.location : undefined
  if (!loc?.hostname) return url
  const m = /^http:\/\/(10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$/.exec(url)
  return m ? `http://${loc.hostname}${m[3] ?? ''}` : url
}

// ---- Types matching the backend DTOs ------------------------------------

export type Location = {
  id: number; slug: string; nameUr: string; nameEn: string; districtUr: string
  latitude: number; longitude: number; isLaunchArea: boolean
}
export type Section = 'livestock' | 'crops' | 'supplies'
export type Purpose = 'qurbani' | 'meatSupply' | 'dairy' | 'breeding' | 'general'
export type PriceUnit = 'perItem' | 'perKg' | 'perMaund' | 'perTon' | 'perBag' | 'perLitre' | 'perShare'
export type QuantityUnit = 'head' | 'kg' | 'maund' | 'ton' | 'bag' | 'litre' | 'piece'
export type Gender = 'unknown' | 'male' | 'female'
export type Teeth = 'milkTeeth' | 'two' | 'four' | 'six' | 'full'
export type Frequency = 'oneTime' | 'daily' | 'weekly' | 'monthly'
export type ListingStatus = 'draft' | 'active' | 'sold' | 'expired' | 'removed' | 'hidden'

export type Category = {
  id: number; parentId: number | null; section: Section; slug: string; nameUr: string; nameEn: string; iconKey: string | null
  hasMilkProduction: boolean; allowsQurbaniShares: boolean; defaultPriceUnit: PriceUnit
  purposes: Purpose[]; priceUnits: PriceUnit[]; quantityUnits: QuantityUnit[]
}

export type SellerSummary = { id: number; fullName: string; verification: string; phoneVerified: boolean; ratingAverage: number; ratingCount: number }
export type Media = { id: number; kind: 'image' | 'video'; url: string; sortOrder: number }
export type Paged<T> = { items: T[]; page: number; pageSize: number; totalCount: number; hasMore: boolean }

export type ListingSummary = {
  id: number; title: string; section: Section; categorySlug: string; categoryNameUr: string; purposes: Purpose[]
  price: number | null; priceUnit: PriceUnit; isNegotiable: boolean; quantity: number; quantityUnit: QuantityUnit
  isBulkAvailable: boolean; locationNameUr: string; distanceKm: number | null; thumbnailUrl: string | null
  breed: string | null; gender: Gender | null; teeth: Teeth | null; ageMonths: number | null; liveWeightKg: number | null
  milkLitresPerDay: number | null; qurbaniShares: number | null; variety: string | null
  status: ListingStatus; publishedAtUtc: string | null; seller: SellerSummary
}

export type ListingDetail = {
  id: number; title: string; description: string | null; areaText: string | null; section: Section
  category: Category; location: Location; purposes: Purpose[]
  price: number | null; priceUnit: PriceUnit; isNegotiable: boolean; quantity: number; quantityUnit: QuantityUnit
  minOrderQuantity: number | null; isBulkAvailable: boolean; deliveryAvailable: boolean; media: Media[]
  livestock: { breed: string | null; gender: Gender; ageMonths: number | null; teeth: Teeth | null; liveWeightKg: number | null
    isVaccinated: boolean | null; isPregnant: boolean | null; milkLitresPerDay: number | null; healthNotes: string | null } | null
  qurbani: { totalShares: number; pricePerShare: number | null } | null
  meatSupply: { frequency: Frequency; pricePerKgLive: number | null } | null
  crop: { variety: string | null; grade: string | null; harvestDate: string | null; pickupAvailable: boolean } | null
  supply: { brand: string | null; condition: 'new' | 'used' } | null
  status: ListingStatus; viewCount: number; createdAtUtc: string; publishedAtUtc: string | null; expiresAtUtc: string | null
  seller: SellerSummary; sellerPhone: string | null; isMine: boolean; isFavorite: boolean
}

/** Body for creating/updating a listing – mirrors the API's ListingInput. */
export type ListingInput = {
  categoryId: number; locationId: number; title: string; description?: string; areaText?: string
  price?: number | null; priceUnit: PriceUnit; isNegotiable: boolean
  quantity: number; quantityUnit: QuantityUnit; minOrderQuantity?: number | null; isBulkAvailable?: boolean; deliveryAvailable?: boolean
  purposes?: Purpose[]
  livestock?: { breed?: string; gender?: Gender; ageMonths?: number | null; teeth?: Teeth | null; liveWeightKg?: number | null
    isVaccinated?: boolean | null; isPregnant?: boolean | null; milkLitresPerDay?: number | null; healthNotes?: string }
  qurbani?: { totalShares: number; pricePerShare?: number | null }
  meatSupply?: { frequency: Frequency; pricePerKgLive?: number | null }
  crop?: { variety?: string; grade?: string; harvestDate?: string | null; pickupAvailable: boolean }
  supply?: { brand?: string; condition: 'new' | 'used' }
}

export type ListingQuery = {
  section?: Section; purpose?: string; category?: string; locationId?: number; lat?: number; lng?: number; radiusKm?: number
  q?: string; sort?: 'newest' | 'priceAsc' | 'priceDesc' | 'nearest'; bulk?: boolean; shares?: boolean; sellerId?: number
  page?: number; pageSize?: number
}

// ---- Businesses, purchase requests, offers ----

export type BusinessType = 'restaurant' | 'hotel' | 'butcher' | 'meatSupplier' | 'trader' | 'farm' | 'agriSupplier' | 'other'
export type BusinessVerification = 'unverified' | 'pending' | 'verified' | 'rejected'
export type RequestStatus = 'open' | 'fulfilled' | 'closed' | 'expired'
export type OfferStatus = 'pending' | 'accepted' | 'declined' | 'withdrawn'

export type Business = {
  id: number; userId: number; businessName: string; type: BusinessType; location: Location; address: string | null
  description: string | null; contactPhone: string | null; verification: BusinessVerification; verifiedAtUtc: string | null
  createdAtUtc: string; openRequestCount: number
}
export type BusinessInput = { businessName: string; type: BusinessType; locationId: number; address?: string; description?: string; contactPhone?: string | null }

export type BuyerSummary = { id: number; fullName: string; phoneVerified: boolean; businessName: string | null; businessType: BusinessType | null; businessVerified: boolean }

export type RequestSummary = {
  id: number; title: string; section: Section; categorySlug: string; categoryNameUr: string; purpose: Purpose | null
  quantity: number; quantityUnit: QuantityUnit; frequency: Frequency; minWeightKg: number | null; maxWeightKg: number | null
  targetPrice: number | null; targetPriceUnit: PriceUnit | null; neededBy: string | null; locationNameUr: string
  distanceKm: number | null; offerCount: number; status: RequestStatus; createdAtUtc: string; buyer: BuyerSummary
}

export type Offer = {
  id: number; purchaseRequestId: number; requestTitle: string; price: number | null; priceUnit: PriceUnit | null
  quantity: number | null; message: string | null; status: OfferStatus; listingId: number | null; listingTitle: string | null
  listingThumbnailUrl: string | null; seller: SellerSummary; sellerPhone: string | null; createdAtUtc: string; updatedAtUtc: string
}

export type RequestDetail = Omit<RequestSummary, 'categorySlug' | 'categoryNameUr' | 'locationNameUr' | 'distanceKm'> & {
  notes: string | null; category: Category; location: Location; deliveryNeeded: boolean; expiresAtUtc: string
  buyerPhone: string | null; isMine: boolean; offers: Offer[] | null; myOffer: Offer | null
}

export type RequestInput = {
  categoryId: number; purpose?: Purpose | null; locationId: number; title?: string; notes?: string
  quantity: number; quantityUnit: QuantityUnit; frequency: Frequency; minWeightKg?: number | null; maxWeightKg?: number | null
  targetPrice?: number | null; targetPriceUnit?: PriceUnit | null; neededBy?: string | null; deliveryNeeded: boolean
}

export type OfferInput = { price?: number | null; priceUnit?: PriceUnit | null; quantity?: number | null; listingId?: number | null; message?: string }

// ---- Chat, Qurbani shares, people, reports ----

export type ChatSummary = {
  id: number; other: { id: number; fullName: string; phoneVerified: boolean; businessName: string | null }
  listingId: number | null; listingTitle: string | null; listingThumbnailUrl: string | null
  lastMessagePreview: string | null; lastMessageType: 'text' | 'voice' | 'image' | null; lastMessageIsMine: boolean
  lastMessageAtUtc: string; unreadCount: number
}
export type ChatMessage = {
  id: number; senderId: number; isMine: boolean; type: 'text' | 'voice' | 'image'; text: string | null
  mediaUrl: string | null; durationSeconds: number | null; createdAtUtc: string; readAtUtc: string | null
}
export type ChatDetail = { chat: ChatSummary; messages: ChatMessage[]; hasOlder: boolean }

export type BookingStatus = 'requested' | 'confirmed' | 'declined' | 'cancelled'
export type Booking = {
  id: number; listingId: number; listingTitle: string; shares: number; status: BookingStatus; note: string | null
  buyerId: number; buyerName: string; buyerPhone: string | null; createdAtUtc: string; updatedAtUtc: string
}
export type Shares = {
  totalShares: number; confirmedShares: number; requestedShares: number; availableShares: number; pricePerShare: number | null
  myBookings: Booking[]; allBookings: Booking[] | null
}

export type PublicProfile = {
  id: number; fullName: string; verification: string; phoneVerified: boolean; bio: string | null; location: Location | null
  phoneNumber: string | null; business: Business | null; activeListings: number; soldCount: number
  ratingAverage: number; ratingCount: number; memberSinceUtc: string; canReview: boolean
}
export type Review = { id: number; rating: number; text: string | null; reviewerId: number; reviewerName: string; listingId: number | null; createdAtUtc: string }

export type ReportReason = 'notAvailable' | 'wrongMedia' | 'wrongDetails' | 'advancePaymentScam' | 'hiddenIllness' | 'inappropriate' | 'other'
export type AdminReport = {
  id: number; listingId: number; listingTitle: string; listingStatus: ListingStatus; reason: ReportReason; note: string | null
  status: string; reporterName: string; openReportsOnListing: number; createdAtUtc: string; resolutionNote: string | null
}

export type RequestQuery = {
  section?: Section; purpose?: Purpose; category?: string; locationId?: number; radiusKm?: number; sort?: 'newest' | 'nearest'; page?: number; pageSize?: number
}

/** Photos are served by the API at relative paths like /media/listings/1/x.jpg. */
// ---- Notifications and voice ----------------------------------------------

export type NotificationType =
  | 'nearbyListing' | 'nearbyRequest' | 'offerReceived' | 'offerAccepted' | 'offerDeclined'
  | 'bookingRequested' | 'bookingConfirmed' | 'bookingDeclined'
export type AppNotification = {
  id: number; type: NotificationType; listingId: number | null; requestId: number | null; subject: string
  place: string | null; distanceKm: number | null; count: number | null; amount: number | null; createdAtUtc: string; isRead: boolean
}
export type NotificationList = { items: AppNotification[]; unreadCount: number }
export type NotificationSettings = { enabled: boolean; wantListings: boolean; wantRequests: boolean; radiusKm: number; categoryIds: number[] }

export type VoiceIntent = 'unknown' | 'sell' | 'wanted' | 'search'
/** What the server understood from a spoken or typed sentence. Only suggestions: the user checks them in the form. */
export type VoiceParse = {
  intent: VoiceIntent; transcript: string
  categoryId: number | null; categorySlug: string | null; section: Section | null; purposes: Purpose[]
  gender: Gender | null; teeth: Teeth | null; breed: string | null; ageMonths: number | null
  weightKg: number | null; minWeightKg: number | null; maxWeightKg: number | null
  quantity: number | null; quantityUnit: QuantityUnit | null; price: number | null; priceUnit: PriceUnit | null
  shares: number | null; frequency: Frequency | null; locationId: number | null
  isPregnant: boolean | null; isVaccinated: boolean | null; milkLitresPerDay: number | null; missing: string[]
}

export const mediaUrl = (path: string | null | undefined) => (path ? `${API_URL}${path}` : null)
export type Profile = {
  bio: string | null; avatarUrl: string | null; location: Location | null; whatsAppNumber: string | null
  showPhoneNumber: boolean; preferredLanguage: string; followerCount: number; soldCount: number
  ratingAverage: number; ratingCount: number
}
export type User = {
  id: number; fullName: string; phoneNumber: string; role: string; verification: string
  phoneVerified: boolean; profile: Profile; createdAtUtc: string
}
type AuthResponse = {
  accessToken: string; accessTokenExpiresAtUtc: string
  refreshToken: string; refreshTokenExpiresAtUtc: string; user: User
}

/** Error from the API. `code` is the stable code from ProblemDetails (e.g. "phone_taken"). */
export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public fieldErrors?: Record<string, string[]>) {
    super(message)
  }
}

// ---- Token handling ------------------------------------------------------

const ACCESS = 'md.access'
const REFRESH = 'md.refresh'
let accessToken: string | null = null
let refreshToken: string | null = null
let onSignedOut: (() => void) | null = null

export async function loadTokens() {
  accessToken = await getItem(ACCESS)
  refreshToken = await getItem(REFRESH)
  return !!refreshToken
}

async function saveTokens(a: string | null, r: string | null) {
  accessToken = a
  refreshToken = r
  await Promise.all([setItem(ACCESS, a), setItem(REFRESH, r)])
}

/** Called when the session can't be refreshed any more (e.g. password changed on another phone). */
export function setSignedOutHandler(fn: (() => void) | null) {
  onSignedOut = fn
}

// Only one refresh at a time, even if several requests get 401 together.
let refreshing: Promise<boolean> | null = null
function refreshSession(): Promise<boolean> {
  if (!refreshToken) return Promise.resolve(false)
  refreshing ??= (async () => {
    try {
      const res = await fetch(`${API_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      })
      if (!res.ok) {
        await saveTokens(null, null)
        onSignedOut?.()
        return false
      }
      const data = (await res.json()) as AuthResponse
      await saveTokens(data.accessToken, data.refreshToken)
      return true
    } catch {
      return false // offline: keep the tokens and try again later
    } finally {
      refreshing = null
    }
  })()
  return refreshing
}

// ---- Request helper ------------------------------------------------------

type Options = { method?: string; body?: unknown; auth?: boolean }

async function request<T>(path: string, { method = 'GET', body, auth = false }: Options = {}, retried = false): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (auth && accessToken) headers.Authorization = `Bearer ${accessToken}`

  let res: Response
  try {
    res = await fetch(`${API_URL}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) })
  } catch {
    throw new ApiError(0, 'network', 'Network request failed')
  }

  if (res.status === 401 && auth && !retried && (await refreshSession())) {
    return request<T>(path, { method, body, auth }, true)
  }

  if (!res.ok) {
    let problem: { code?: string; title?: string; detail?: string; errors?: Record<string, string[]> } = {}
    try {
      problem = await res.json()
    } catch {}
    const code = problem.code ?? (res.status === 429 ? 'rate_limited' : res.status >= 500 ? 'server_error' : 'unknown')
    throw new ApiError(res.status, code, problem.detail ?? problem.title ?? res.statusText, problem.errors)
  }

  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

function toQuery(q: Record<string, string | number | boolean | undefined | null>) {
  return Object.entries(q)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&')
}

export type UploadFile = { uri: string; name: string; type: string; blob?: Blob }

/** Multipart upload of one file (field "file") plus optional text fields, with the same token refresh as JSON requests. */
async function requestForm<T>(path: string, photo: UploadFile, fields: Record<string, string> = {}, retried = false): Promise<T> {
  const form = new FormData()
  // React Native's FormData takes {uri, name, type}; the web preview needs a real Blob.
  if (photo.blob) form.append('file', photo.blob, photo.name)
  else form.append('file', { uri: photo.uri, name: photo.name, type: photo.type } as unknown as Blob)
  for (const [k, v] of Object.entries(fields)) form.append(k, v)

  let res: Response
  try {
    res = await fetch(`${API_URL}${path}`, { method: 'POST', headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {}, body: form })
  } catch {
    throw new ApiError(0, 'network', 'Network request failed')
  }
  if (res.status === 401 && !retried && (await refreshSession())) return requestForm<T>(path, photo, fields, true)
  if (!res.ok) {
    let problem: { code?: string; detail?: string } = {}
    try {
      problem = await res.json()
    } catch {}
    throw new ApiError(res.status, problem.code ?? (res.status === 413 ? 'invalid_image' : 'server_error'), problem.detail ?? res.statusText)
  }
  return (await res.json()) as T
}

// ---- Endpoints -----------------------------------------------------------

export const api = {
  async register(input: { fullName: string; phoneNumber: string; password: string; cnic?: string; locationId?: number; preferredLanguage?: string }) {
    const data = await request<AuthResponse>('/api/auth/register', { method: 'POST', body: input })
    await saveTokens(data.accessToken, data.refreshToken)
    return data.user
  },
  async login(phoneNumber: string, password: string) {
    const data = await request<AuthResponse>('/api/auth/login', { method: 'POST', body: { phoneNumber, password } })
    await saveTokens(data.accessToken, data.refreshToken)
    return data.user
  },
  async logout() {
    // Best effort: the server revokes this session. Signing out locally works even offline.
    if (refreshToken) {
      await request('/api/auth/logout', { method: 'POST', body: { refreshToken }, auth: true }).catch(() => {})
    }
    await saveTokens(null, null)
  },
  me: () => request<User>('/api/users/me', { auth: true }),
  updateMe: (patch: { fullName?: string; locationId?: number; preferredLanguage?: string; whatsAppNumber?: string; bio?: string }) =>
    request<User>('/api/users/me', { method: 'PATCH', body: patch, auth: true }),
  categories: () => request<Category[]>('/api/categories'),
  locations: () => request<Location[]>('/api/locations'),

  // Listings
  listings: (query: ListingQuery) => request<Paged<ListingSummary>>(`/api/listings?${toQuery(query)}`),
  listing: (id: number) => request<ListingDetail>(`/api/listings/${id}`, { auth: true }),
  createListing: (input: ListingInput) => request<ListingDetail>('/api/listings', { method: 'POST', body: input, auth: true }),
  updateListing: (id: number, input: ListingInput) => request<ListingDetail>(`/api/listings/${id}`, { method: 'PUT', body: input, auth: true }),
  publishListing: (id: number) => request<ListingDetail>(`/api/listings/${id}/publish`, { method: 'POST', auth: true }),
  markSold: (id: number) => request<ListingDetail>(`/api/listings/${id}/sold`, { method: 'POST', auth: true }),
  removeListing: (id: number) => request<void>(`/api/listings/${id}`, { method: 'DELETE', auth: true }),
  uploadPhoto: (id: number, photo: UploadFile) =>
    requestForm<Media>(`/api/listings/${id}/media`, photo),
  myListings: (page = 1) => request<Paged<ListingSummary>>(`/api/users/me/listings?page=${page}`, { auth: true }),
  favorites: (page = 1) => request<Paged<ListingSummary>>(`/api/users/me/favorites?page=${page}`, { auth: true }),
  addFavorite: (id: number) => request<void>(`/api/users/me/favorites/${id}`, { method: 'PUT', auth: true }),
  removeFavorite: (id: number) => request<void>(`/api/users/me/favorites/${id}`, { method: 'DELETE', auth: true }),

  // Business profile (204 = none yet → null)
  myBusiness: () => request<Business | undefined>('/api/users/me/business', { auth: true }).then((b) => b ?? null),
  saveBusiness: (input: BusinessInput) => request<Business>('/api/users/me/business', { method: 'PUT', body: input, auth: true }),
  requestVerification: () => request<Business>('/api/users/me/business/verification', { method: 'POST', auth: true }),

  // Purchase requests and offers
  requests: (query: RequestQuery) => request<Paged<RequestSummary>>(`/api/purchase-requests?${toQuery(query)}`),
  requestDetail: (id: number) => request<RequestDetail>(`/api/purchase-requests/${id}`, { auth: true }),
  createRequest: (input: RequestInput) => request<RequestDetail>('/api/purchase-requests', { method: 'POST', body: input, auth: true }),
  closeRequest: (id: number, fulfilled: boolean) => request<RequestDetail>(`/api/purchase-requests/${id}/close?fulfilled=${fulfilled}`, { method: 'POST', auth: true }),
  reopenRequest: (id: number) => request<RequestDetail>(`/api/purchase-requests/${id}/reopen`, { method: 'POST', auth: true }),
  myRequests: (page = 1) => request<Paged<RequestSummary>>(`/api/users/me/purchase-requests?page=${page}`, { auth: true }),
  makeOffer: (requestId: number, input: OfferInput) => request<Offer>(`/api/purchase-requests/${requestId}/offers`, { method: 'POST', body: input, auth: true }),
  acceptOffer: (id: number) => request<Offer>(`/api/offers/${id}/accept`, { method: 'POST', auth: true }),
  declineOffer: (id: number) => request<Offer>(`/api/offers/${id}/decline`, { method: 'POST', auth: true }),
  withdrawOffer: (id: number) => request<Offer>(`/api/offers/${id}/withdraw`, { method: 'POST', auth: true }),
  myOffers: (page = 1) => request<Paged<Offer>>(`/api/users/me/offers?page=${page}`, { auth: true }),

  // Editing photos of an existing listing
  deletePhoto: (listingId: number, mediaId: number) => request<void>(`/api/listings/${listingId}/media/${mediaId}`, { method: 'DELETE', auth: true }),

  // Chat (the app polls with afterId while a chat is open)
  chats: () => request<ChatSummary[]>('/api/chats', { auth: true }),
  unreadCount: () => request<number>('/api/chats/unread-count', { auth: true }),
  startChat: (input: { listingId?: number; userId?: number }) => request<ChatSummary>('/api/chats', { method: 'POST', body: input, auth: true }),
  chat: (id: number, opts: { afterId?: number; beforeId?: number } = {}) => request<ChatDetail>(`/api/chats/${id}?${toQuery(opts)}`, { auth: true }),
  sendMessage: (id: number, text: string) => request<ChatMessage>(`/api/chats/${id}/messages`, { method: 'POST', body: { text }, auth: true }),
  sendVoice: (id: number, file: UploadFile, durationSeconds: number) =>
    requestForm<ChatMessage>(`/api/chats/${id}/voice`, file, { durationSeconds: String(durationSeconds) }),

  // Qurbani shares
  shares: (listingId: number) => request<Shares>(`/api/listings/${listingId}/shares`, { auth: true }),
  bookShares: (listingId: number, shares: number, note?: string) =>
    request<Booking>(`/api/listings/${listingId}/bookings`, { method: 'POST', body: { shares, note }, auth: true }),
  confirmBooking: (id: number) => request<Booking>(`/api/bookings/${id}/confirm`, { method: 'POST', auth: true }),
  declineBooking: (id: number) => request<Booking>(`/api/bookings/${id}/decline`, { method: 'POST', auth: true }),
  cancelBooking: (id: number) => request<Booking>(`/api/bookings/${id}/cancel`, { method: 'POST', auth: true }),
  myBookings: () => request<Booking[]>('/api/users/me/bookings', { auth: true }),

  // People, reviews, reports
  profile: (userId: number) => request<PublicProfile>(`/api/users/${userId}`, { auth: true }),
  reviews: (userId: number) => request<Review[]>(`/api/users/${userId}/reviews`),
  review: (userId: number, rating: number, text?: string, listingId?: number) =>
    request<Review>(`/api/users/${userId}/reviews`, { method: 'POST', body: { rating, text, listingId }, auth: true }),
  report: (listingId: number, reason: ReportReason, note?: string) =>
    request<void>(`/api/listings/${listingId}/reports`, { method: 'POST', body: { reason, note }, auth: true }),

  // Admin / moderator
  adminReports: () => request<AdminReport[]>('/api/admin/reports', { auth: true }),
  resolveReport: (id: number, hideListing: boolean, note?: string) =>
    request<AdminReport>(`/api/admin/reports/${id}/resolve`, { method: 'POST', body: { hideListing, note }, auth: true }),
  // Notifications
  notifications: (opts: { afterId?: number; beforeId?: number; pageSize?: number } = {}) =>
    request<NotificationList>(`/api/notifications?${toQuery(opts)}`, { auth: true }),
  markNotificationRead: (id: number) => request<void>(`/api/notifications/${id}/read`, { method: 'POST', auth: true }),
  markAllNotificationsRead: () => request<void>('/api/notifications/read-all', { method: 'POST', auth: true }),
  notificationSettings: () => request<NotificationSettings>('/api/users/me/notification-settings', { auth: true }),
  saveNotificationSettings: (s: NotificationSettings) =>
    request<NotificationSettings>('/api/users/me/notification-settings', { method: 'PUT', body: s, auth: true }),

  // Voice
  voiceParse: (text: string) => request<VoiceParse>('/api/voice/parse', { method: 'POST', body: { text } }),
  voiceStatus: () => request<{ speechRecognition: boolean }>('/api/voice/status'),
  transcribe: (file: UploadFile, language: 'ur' | 'pa' = 'ur') => requestForm<{ text: string }>('/api/voice/transcribe', file, { language }),

  pendingBusinesses: () => request<Business[]>('/api/admin/businesses/pending', { auth: true }),
  decideBusiness: (id: number, approve: boolean, note?: string) =>
    request<Business>(`/api/admin/businesses/${id}/verification`, { method: 'POST', body: { approve, note }, auth: true }),
}
