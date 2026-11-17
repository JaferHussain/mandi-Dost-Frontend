import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

type Assistant = {
  visible: boolean
  /** Text to start with (e.g. something the user already typed). */
  initialText: string
  open: (initialText?: string) => void
  close: () => void
}

const AssistantContext = createContext<Assistant | null>(null)

/** Holds whether the "speak to the app" sheet is open. The sheet itself is drawn once, in the root layout. */
export function AssistantProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false)
  const [initialText, setInitialText] = useState('')
  const open = useCallback((text = '') => {
    setInitialText(text)
    setVisible(true)
  }, [])
  const close = useCallback(() => setVisible(false), [])
  const value = useMemo(() => ({ visible, initialText, open, close }), [visible, initialText, open, close])
  return <AssistantContext.Provider value={value}>{children}</AssistantContext.Provider>
}

export function useAssistant() {
  const a = useContext(AssistantContext)
  if (!a) throw new Error('useAssistant must be used inside AssistantProvider')
  return a
}
