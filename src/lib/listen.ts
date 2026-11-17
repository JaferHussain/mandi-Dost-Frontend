import { useCallback, useSyncExternalStore } from 'react'
import { useFocusEffect } from 'expo-router'
import * as Speech from 'expo-speech'
import { t } from '../i18n'

// One place that speaks, so only one thing is ever read aloud at a time
// and every Listen button shows "stop" while something is playing.

let speaking = false
const subscribers = new Set<() => void>()
const setSpeaking = (v: boolean) => {
  if (speaking === v) return
  speaking = v
  subscribers.forEach((f) => f())
}

/** Read text aloud in Urdu (shown text is translated first, so Punjabi/Saraiki users hear their wording in an Urdu voice). */
export function speak(text: string) {
  if (!text.trim()) return
  Speech.stop()
  setSpeaking(true)
  Speech.speak(t(text), {
    language: 'ur-PK',
    rate: 0.9,
    onDone: () => setSpeaking(false),
    onStopped: () => setSpeaking(false),
    onError: () => setSpeaking(false),
  })
}

export function stopSpeaking() {
  Speech.stop()
  setSpeaking(false)
}

/** True while something is being read aloud. */
export function useSpeaking() {
  return useSyncExternalStore(
    (cb) => { subscribers.add(cb); return () => { subscribers.delete(cb) } },
    () => speaking,
    () => false,
  )
}

// ---- What "Listen" reads on each screen ------------------------------------------------

let pageText: string | null = null
export const currentListenText = () => pageText

/**
 * A screen calls this with what is worth hearing (title, price, instructions).
 * The Listen button in the header reads it. Only the screen in front counts.
 */
export function useListen(text: string | null | undefined) {
  const value = text?.trim() || null
  useFocusEffect(
    useCallback(() => {
      pageText = value
      return () => {
        if (pageText === value) pageText = null
      }
    }, [value]),
  )
}
