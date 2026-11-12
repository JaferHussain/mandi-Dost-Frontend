import { Platform } from 'react-native'
import * as SecureStore from 'expo-secure-store'

// Tokens and small preferences. On the phone they go into the encrypted
// keystore; the web preview (used only for development) falls back to localStorage.
const isWeb = Platform.OS === 'web'

export async function getItem(key: string): Promise<string | null> {
  try {
    if (isWeb) return globalThis.localStorage?.getItem(key) ?? null
    return await SecureStore.getItemAsync(key)
  } catch {
    return null
  }
}

export async function setItem(key: string, value: string | null): Promise<void> {
  try {
    if (isWeb) {
      if (value === null) globalThis.localStorage?.removeItem(key)
      else globalThis.localStorage?.setItem(key, value)
      return
    }
    if (value === null) await SecureStore.deleteItemAsync(key)
    else await SecureStore.setItemAsync(key, value)
  } catch {
    // Storage can fail on some devices; the app still works, the user just has to log in again.
  }
}
