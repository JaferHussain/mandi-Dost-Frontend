import type { VoiceParse } from './api'

// The voice assistant hands what it understood to the next screen (sell form, requirement form).
// The screen takes it once, so going back and forth never fills a form twice.
let draft: VoiceParse | null = null

export const setVoiceDraft = (d: VoiceParse | null) => {
  draft = d
}

export const takeVoiceDraft = () => {
  const d = draft
  draft = null
  return d
}
