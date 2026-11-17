import { useListen } from '@/lib/listen'

/**
 * Puts text behind the header's Listen button for the screen it is rendered in.
 * A component (not a hook call) so screens can use it after their loading/error early returns.
 */
export function ListenText({ text }: { text: string }) {
  useListen(text)
  return null
}
