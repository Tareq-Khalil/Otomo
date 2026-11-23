/**
 * Otomo-chan Speech Recognition
 *
 * Wraps the Web Speech Recognition API with:
 * - Explicit user activation requirements (never auto-activates microphone)
 * - Visible recording state indicators
 * - Graceful fallback when unavailable
 * - Support for English and Arabic
 */

// ─── Types ─────────────────────────────────────────────────────────────────

export type RecognitionState = 'idle' | 'listening' | 'processing' | 'error' | 'unsupported'

export interface RecognitionResult {
  transcript: string
  confidence: number
  isFinal: boolean
}

export interface RecognitionCallbacks {
  onResult?: (result: RecognitionResult) => void
  onInterim?: (transcript: string) => void
  onStateChange?: (state: RecognitionState) => void
  onError?: (error: string) => void
}

// ─── Capability Check ──────────────────────────────────────────────────────

export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === 'undefined') return false
  return !!(
    (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition ||
    (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition
  )
}

// ─── Recognition Manager ──────────────────────────────────────────────────

type SpeechRecognitionAPI = {
  new(): SpeechRecognitionInstance
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  maxAlternatives: number
  start(): void
  stop(): void
  abort(): void
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: { error: string; message?: string }) => void) | null
  onend: (() => void) | null
  onstart: (() => void) | null
  onspeechend: (() => void) | null
}

interface SpeechRecognitionEvent {
  resultIndex: number
  results: {
    length: number
    item(index: number): { item(index: number): { transcript: string; confidence: number }; isFinal: boolean; length: number }
    [index: number]: { item(index: number): { transcript: string; confidence: number }; isFinal: boolean; length: number }
  }
}

let recognitionInstance: SpeechRecognitionInstance | null = null
let currentState: RecognitionState = 'idle'
let callbacks: RecognitionCallbacks = {}

function getRecognitionAPI(): SpeechRecognitionAPI | null {
  if (typeof window === 'undefined') return null
  return (
    (window as unknown as { SpeechRecognition?: SpeechRecognitionAPI }).SpeechRecognition ||
    (window as unknown as { webkitSpeechRecognition?: SpeechRecognitionAPI }).webkitSpeechRecognition ||
    null
  )
}

function setState(state: RecognitionState) {
  currentState = state
  callbacks.onStateChange?.(state)
}

export function getRecognitionState(): RecognitionState {
  return currentState
}

/**
 * Start listening for speech input.
 * REQUIRES explicit user interaction (button click).
 * Never call this automatically or on page load.
 */
export function startListening(
  lang: string = 'en-US',
  cbs: RecognitionCallbacks = {}
): boolean {
  const API = getRecognitionAPI()
  if (!API) {
    setState('unsupported')
    cbs.onError?.('Speech recognition is not supported in this browser.')
    return false
  }

  // Stop any existing session
  stopListening()

  callbacks = cbs

  try {
    recognitionInstance = new API()
    recognitionInstance.continuous = false
    recognitionInstance.interimResults = true
    recognitionInstance.lang = lang
    recognitionInstance.maxAlternatives = 1

    recognitionInstance.onstart = () => {
      setState('listening')
    }

    recognitionInstance.onresult = (event: SpeechRecognitionEvent) => {
      const results = event.results
      for (let i = event.resultIndex; i < results.length; i++) {
        const result = results[i]
        const alt = result.item(0)

        if (result.isFinal) {
          setState('processing')
          callbacks.onResult?.({
            transcript: alt.transcript,
            confidence: alt.confidence,
            isFinal: true
          })
        } else {
          callbacks.onInterim?.(alt.transcript)
        }
      }
    }

    recognitionInstance.onerror = (event) => {
      if (event.error === 'aborted' || event.error === 'no-speech') {
        setState('idle')
        return
      }
      setState('error')
      const errorMsg =
        event.error === 'not-allowed' ? 'Microphone access was denied. Please allow microphone access in your browser settings.' :
        event.error === 'network' ? 'Speech recognition requires an internet connection in this browser.' :
        `Speech recognition error: ${event.error}`
      callbacks.onError?.(errorMsg)
    }

    recognitionInstance.onend = () => {
      if (currentState === 'listening') {
        setState('idle')
      }
    }

    recognitionInstance.onspeechend = () => {
      setState('processing')
    }

    recognitionInstance.start()
    return true
  } catch (err) {
    setState('error')
    callbacks.onError?.(err instanceof Error ? err.message : 'Failed to start speech recognition')
    return false
  }
}

/**
 * Stop the current recognition session.
 */
export function stopListening(): void {
  if (recognitionInstance) {
    try {
      recognitionInstance.abort()
    } catch {
      // Ignore
    }
    recognitionInstance = null
  }
  setState('idle')
  callbacks = {}
}

/**
 * Check if currently listening.
 */
export function isListening(): boolean {
  return currentState === 'listening'
}
