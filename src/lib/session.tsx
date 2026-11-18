import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, ApiError, loadTokens, setSignedOutHandler, type Location, type User } from './api'
import { getItem, setItem } from './storage'
import { isLangId, setLanguage, type LangId } from '../i18n'

type Session = {
  ready: boolean
  user: User | null
  /** null until the user picks a language on first launch */
  lang: LangId | null
  locations: Location[]
  location: Location | null
  setLang: (id: LangId) => void
  setLocation: (loc: Location) => void
  login: (phone: string, password: string) => Promise<void>
  register: (input: { fullName: string; phoneNumber: string; password: string; cnic?: string }) => Promise<void>
  logout: () => Promise<void>
  reloadLocations: () => Promise<void>
}

const SessionContext = createContext<Session | null>(null)

const LANG_KEY = 'md.lang'
const LOCATION_KEY = 'md.location'

export function SessionProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [lang, setLangState] = useState<LangId | null>(null)
  const [locations, setLocations] = useState<Location[]>([])
  const [locationId, setLocationId] = useState<number | null>(null)

  const reloadLocations = useCallback(async () => {
    try {
      setLocations(await api.locations())
    } catch {
      // Offline or server down: the location button shows "شہر چنیں" and retries when opened.
    }
  }, [])

  useEffect(() => {
    setSignedOutHandler(() => setUser(null))
    ;(async () => {
      const [savedLang, savedLoc, hasSession] = await Promise.all([getItem(LANG_KEY), getItem(LOCATION_KEY), loadTokens()])
      if (isLangId(savedLang)) {
        setLanguage(savedLang)
        setLangState(savedLang)
      }
      if (savedLoc) setLocationId(Number(savedLoc))
      if (hasSession) {
        try {
          setUser(await api.me())
        } catch (e) {
          // Offline: stay signed in locally; a 401 that can't be refreshed already signed us out.
          if (!(e instanceof ApiError) || e.status !== 0) setUser(null)
        }
      }
      setReady(true)
      reloadLocations()
    })()
    return () => setSignedOutHandler(null)
  }, [reloadLocations])

  const setLang = useCallback(
    (id: LangId) => {
      setLanguage(id)
      setLangState(id)
      setItem(LANG_KEY, id)
      if (user) api.updateMe({ preferredLanguage: id }).then(setUser).catch(() => {})
    },
    [user],
  )

  const setLocation = useCallback(
    (loc: Location) => {
      setLocationId(loc.id)
      setItem(LOCATION_KEY, String(loc.id))
      if (user) api.updateMe({ locationId: loc.id }).then(setUser).catch(() => {})
    },
    [user],
  )

  const login = useCallback(async (phone: string, password: string) => {
    const u = await api.login(phone, password)
    setUser(u)
    // A returning user on a new phone gets their saved language and city.
    if (isLangId(u.profile.preferredLanguage)) {
      setLanguage(u.profile.preferredLanguage)
      setLangState(u.profile.preferredLanguage)
      setItem(LANG_KEY, u.profile.preferredLanguage)
    }
    if (u.profile.location) {
      setLocationId(u.profile.location.id)
      setItem(LOCATION_KEY, String(u.profile.location.id))
    }
  }, [])

  const register = useCallback(
    async (input: { fullName: string; phoneNumber: string; password: string }) => {
      setUser(await api.register({ ...input, preferredLanguage: lang ?? 'ur', locationId: locationId ?? undefined }))
    },
    [lang, locationId],
  )

  const logout = useCallback(async () => {
    await api.logout()
    setUser(null)
  }, [])

  const location = locations.find((l) => l.id === locationId) ?? user?.profile.location ?? null

  const value = useMemo<Session>(
    () => ({ ready, user, lang, locations, location, setLang, setLocation, login, register, logout, reloadLocations }),
    [ready, user, lang, locations, location, setLang, setLocation, login, register, logout, reloadLocations],
  )
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession() {
  const s = useContext(SessionContext)
  if (!s) throw new Error('useSession must be used inside SessionProvider')
  return s
}
