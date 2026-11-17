import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { AppState } from 'react-native'
import { api, type AppNotification } from './api'
import { useSession } from './session'

const POLL_MS = 25_000
const PAGE = 30

type Popup = { n: AppNotification; more: number }

type Notifications = {
  items: AppNotification[]
  unread: number
  loaded: boolean
  hasMore: boolean
  /** The newest alert, shown as a popup for a few seconds. */
  popup: Popup | null
  dismissPopup: () => void
  refresh: () => Promise<void>
  loadMore: () => Promise<void>
  markRead: (id: number) => Promise<void>
  markAllRead: () => Promise<void>
}

const NotificationsContext = createContext<Notifications | null>(null)

/**
 * Keeps the notification list and unread count fresh while the app is open (checks every 25 seconds
 * and when the app comes to the front). Alerts that arrive while the app is open pop up once.
 * Phone push alerts for a closed app come later and need a Play Store build.
 */
export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useSession()
  const userId = user?.id ?? null
  const [items, setItems] = useState<AppNotification[]>([])
  const [unread, setUnread] = useState(0)
  const [loaded, setLoaded] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [popup, setPopup] = useState<Popup | null>(null)
  const lastId = useRef<number | null>(null)
  const busy = useRef(false)

  const refresh = useCallback(async () => {
    if (userId == null || busy.current) return
    busy.current = true
    try {
      if (lastId.current == null) {
        // First load: show what's there, but don't pop up old alerts
        const res = await api.notifications({ pageSize: PAGE })
        setItems(res.items)
        setUnread(res.unreadCount)
        setHasMore(res.items.length === PAGE)
        lastId.current = res.items[0]?.id ?? 0
        setLoaded(true)
      } else {
        const res = await api.notifications({ afterId: lastId.current, pageSize: PAGE })
        setUnread(res.unreadCount)
        if (res.items.length > 0) {
          lastId.current = Math.max(lastId.current, res.items[0].id)
          setItems((prev) => [...res.items, ...prev.filter((p) => !res.items.some((r) => r.id === p.id))])
          setPopup({ n: res.items[0], more: res.items.length - 1 })
        }
      }
    } catch {
      // Offline or server busy: try again at the next check
    } finally {
      busy.current = false
    }
  }, [userId])

  // Start over for each signed-in user
  useEffect(() => {
    lastId.current = null
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setItems([]); setUnread(0); setLoaded(false); setHasMore(false); setPopup(null)
    if (userId == null) return
    refresh()
    const timer = setInterval(refresh, POLL_MS)
    const sub = AppState.addEventListener('change', (s) => s === 'active' && refresh())
    return () => { clearInterval(timer); sub.remove() }
  }, [userId, refresh])

  const loadMore = useCallback(async () => {
    const oldest = items[items.length - 1]
    if (!oldest || !hasMore) return
    try {
      const res = await api.notifications({ beforeId: oldest.id, pageSize: PAGE })
      setItems((prev) => [...prev, ...res.items.filter((r) => !prev.some((p) => p.id === r.id))])
      setHasMore(res.items.length === PAGE)
    } catch {}
  }, [items, hasMore])

  const markRead = useCallback(async (id: number) => {
    const was = items.find((n) => n.id === id)
    if (!was || was.isRead) return
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)))
    setUnread((u) => Math.max(0, u - 1))
    try { await api.markNotificationRead(id) } catch {}
  }, [items])

  const markAllRead = useCallback(async () => {
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })))
    setUnread(0)
    try { await api.markAllNotificationsRead() } catch {}
  }, [])

  const dismissPopup = useCallback(() => setPopup(null), [])

  const value = useMemo<Notifications>(
    () => ({ items, unread, loaded, hasMore, popup, dismissPopup, refresh, loadMore, markRead, markAllRead }),
    [items, unread, loaded, hasMore, popup, dismissPopup, refresh, loadMore, markRead, markAllRead],
  )
  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>
}

export function useNotifications() {
  const n = useContext(NotificationsContext)
  if (!n) throw new Error('useNotifications must be used inside NotificationsProvider')
  return n
}
