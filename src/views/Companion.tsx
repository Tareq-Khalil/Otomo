import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  Send,
  Mic,
  MicOff,
  Square,
  Plus,
  Trash2,
  Edit2,
  Check,
  Search,
  MessageSquare,
  Download,
  AlertCircle,
  RotateCcw,
  X,
  Copy,
  Brain
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { OtomoCharacter } from '@/components/OtomoCharacter'
import { ChatMarkdown } from '@/components/ChatMarkdown'
import { useApp } from '@/lib/store'
import { useSync } from '@/lib/sync'
import {
  createConversation,
  listConversations,
  deleteConversation,
  renameConversation,
  addMessage,
  listMessages,
  generateTitle
} from '@/lib/otomo/conversations'
import { initConfig, getConfig } from '@/lib/otomo/config'
import {
  generate,
  loadModel,
  loadCpuModel,
  onStatusChange,
  getModelStatus,
  getLoadedModel,
  isCpuModelLoaded,
  cancelInference,
  MODEL_CATALOG,
  CPU_MODEL_NAME,
  API_PRESETS,
  loadProviderSettings,
  saveProviderSettings,
  testApiConnection,
  checkWebGPUSupport,
  checkDeviceCapability,
  type ActiveBackend,
  type ApiProviderConfig,
  type ModelProgress
} from '@/lib/otomo/inference'
import { buildSystemPrompt, detectMoodFromResponse } from '@/lib/otomo/personality'
import { buildLiveAppContext } from '@/lib/otomo/tools'
import { listActiveMemories, extractMemoryCandidates, createMemory } from '@/lib/otomo/memory'
import { startListening, stopListening } from '@/lib/otomo/voice/recognition'
import type { ChatMessage, Conversation, CharacterExpression, StudentMemory } from '@/lib/types'

function createOpeningGreeting(createdAt: number, studentName?: string): string {
  const hour = new Date(createdAt).getHours()
  const [romaji, kana, translation] =
    hour >= 5 && hour < 12 ? ['Ohayō', 'おはよう', 'Good morning'] :
    hour >= 12 && hour < 18 ? ['Konnichiwa', 'こんにちは', 'Good afternoon'] :
    ['Konbanwa', 'こんばんは', 'Good evening']
  const name = studentName?.trim().split(/\s+/)[0] || 'friend'

  return `${romaji} — ${kana} (${translation}), ${name}. I'm Otomo-chan. Tell me what you need; I'll help you work through it.`
}

export function Companion() {
  const { s, data } = useApp()
  const sync = useSync()
  const owner = sync.signedIn && sync.email ? sync.email : 'local_student'

  // Conversation & Messages State
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConvId, setActiveConvId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [editingConvId, setEditingConvId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [uiNotice, setUiNotice] = useState<string | null>(null)

  // Character & Interaction State
  const [currentMood, setCurrentMood] = useState<CharacterExpression>('idle')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [streamingText, setStreamingText] = useState('')

  // Model & Inference Engine State
  const [providerSettings, setProviderSettings] = useState(loadProviderSettings)
  const [apiTestStatus, setApiTestStatus] = useState<{ ok: boolean; message: string } | null>(null)
  const [testingApi, setTestingApi] = useState(false)
  const [modelProgress, setModelProgress] = useState<ModelProgress>(getModelStatus())
  const [selectedModel, setSelectedModel] = useState('Qwen2.5-0.5B-Instruct-q4f16_1-MLC')
  const [showModelBar, setShowModelBar] = useState(false)
  const [deviceCapability, setDeviceCapability] = useState<Awaited<ReturnType<typeof checkDeviceCapability>> | null>(null)
  const gpuSupported = checkWebGPUSupport().supported
  const modelLoadBusy = ['checking', 'downloading', 'loading'].includes(modelProgress.status)
  const webGpuModelReady = modelProgress.status === 'ready' && getLoadedModel() === selectedModel
  const cpuModelReady = isCpuModelLoaded()
  const cpuModelError = ['error', 'unsupported'].includes(modelProgress.status) && (
    modelProgress.text.startsWith(`Could not load ${CPU_MODEL_NAME}`) ||
    modelProgress.text.startsWith('The local CPU model') ||
    modelProgress.text.startsWith('Local CPU response failed')
  )
  const selectedModelInfo = MODEL_CATALOG.find(model => model.id === selectedModel)
  const selectedModelIncompatible = Boolean(
    selectedModelInfo &&
    deviceCapability?.maxComputeWorkgroupStorageSize !== undefined &&
    deviceCapability.maxComputeWorkgroupStorageSize < selectedModelInfo.minWorkgroupStorageSize
  )

  const updateProvider = (next: { backend?: ActiveBackend; api?: Partial<ApiProviderConfig> }) => {
    setProviderSettings(prev => {
      const merged = {
        backend: next.backend ?? prev.backend,
        api: next.api ? { ...prev.api, ...next.api } : prev.api
      }
      saveProviderSettings(merged)
      return merged
    })
  }

  const handleTestApi = async () => {
    setTestingApi(true)
    setApiTestStatus(null)
    const result = await testApiConnection(providerSettings.api)
    setApiTestStatus(result)
    setTestingApi(false)
  }

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // 1. Initial Load: Conversations & Model Status Listener
  useEffect(() => {
    setActiveConvId(null)
    setMessages([])
    void loadConversationsList(true)
    void checkDeviceCapability().then(setDeviceCapability).catch(error => {
      setModelProgress(progress => ({
        ...progress,
        status: 'error',
        text: `Could not inspect GPU compatibility: ${error instanceof Error ? error.message : 'Unknown error'}`
      }))
    })
    const unsubscribe = onStatusChange(p => setModelProgress({ ...p }))
    return () => {
      unsubscribe()
      stopListening()
      cancelInference()
    }
  }, [owner])

  // 2. Load Messages when Active Conversation Changes
  useEffect(() => {
    if (activeConvId) {
      void loadActiveMessages(activeConvId)
    }
  }, [activeConvId])

  // 3. Auto Scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingText])

  const loadConversationsList = async (forceReset = false) => {
    const list = await listConversations(owner)
    setConversations(list)
    if (list.length > 0 && (forceReset || !activeConvId)) {
      setActiveConvId(list[0].id)
    } else if (list.length === 0) {
      // Create initial conversation
      const first = await createConversation(owner, 'First Chat with Otomo-chan')
      setConversations([first])
      setActiveConvId(first.id)
      const greeting = await addMessage(
        first.id,
        'assistant',
        createOpeningGreeting(first.createdAt, s.name),
        'happy'
      )
      setMessages([greeting])
    }
  }

  const loadActiveMessages = async (convId: string) => {
    const msgs = await listMessages(convId)
    setMessages(msgs)
  }

  const handleNewChat = async () => {
    const conv = await createConversation(owner)
    const greeting = await addMessage(
      conv.id,
      'assistant',
      createOpeningGreeting(conv.createdAt, s.name),
      'welcome'
    )
    setConversations(prev => [conv, ...prev])
    setMessages([greeting])
    setActiveConvId(conv.id)
    setIsDrawerOpen(false)
    setCurrentMood('welcome')
  }

  const handleDeleteChat = async (id: string) => {
    await deleteConversation(id)
    const remaining = conversations.filter(c => c.id !== id)
    setConversations(remaining)
    if (activeConvId === id) {
      setActiveConvId(remaining[0]?.id || null)
    }
  }

  // 4. Send Message Handler
  const handleSend = async (textToSend?: string) => {
    const messageContent = (textToSend || input).trim()
    if (!messageContent || isGenerating || !activeConvId) return

    setInput('')
    if (isRecording) stopSpeechRecognition()

    // Add user message
    const userMsg = await addMessage(activeConvId, 'user', messageContent)
    setMessages(prev => [...prev, userMsg])

    // Update conversation title if first user message
    const existingUserMsgs = messages.filter(m => m.role === 'user')
    if (existingUserMsgs.length === 0) {
      const title = generateTitle(messageContent)
      await renameConversation(activeConvId, title)
      setConversations(prev =>
        prev.map(c => c.id === activeConvId ? { ...c, title } : c)
      )
    }

    // Set thinking state
    setIsGenerating(true)
    setCurrentMood('thinking')
    setStreamingText('')

    try {
      // Gather context
      const cfg = await initConfig()
      const [memories, liveCtx] = await Promise.all([
        listActiveMemories(owner),
        buildLiveAppContext({ state: s, data, owner }, cfg.tools.enabledTools).catch(() => '')
      ])
      const systemPrompt = buildSystemPrompt(s, memories, undefined, liveCtx)

      const historyForInference = [...messages, userMsg].map(m => ({
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.content
      }))

      let accumulated = ''
      const result = await generate({
        systemPrompt,
        messages: historyForInference,
        backendOverride: providerSettings.backend,
        apiConfig: providerSettings.api,
        onChunk: (_chunk, full) => {
          accumulated = full
          setStreamingText(full)
          setCurrentMood('explaining')
        },
        fallbackContext: { state: s, data, owner }
      })
      if (result.finishReason === 'cancelled') {
        setCurrentMood('idle')
        return
      }

      const finalResponse = result.content || accumulated
      setStreamingText('')

      // Detect character mood
      const detectedMood = detectMoodFromResponse(finalResponse)
      setCurrentMood(detectedMood)

      // Save assistant message to IndexedDB
      const assistantMsg = await addMessage(
        activeConvId,
        'assistant',
        finalResponse,
        detectedMood
      )
      setMessages(prev => [...prev, assistantMsg])

      // Memory Extraction Candidate Check
      const candidates = extractMemoryCandidates(messageContent, finalResponse)
      for (const cand of candidates) {
        await createMemory(owner, cand.category, cand.content, cand.importance)
      }
    } catch (err) {
      const errMsg = `I ran into an issue thinking through that: ${err instanceof Error ? err.message : 'Unknown error'}`
      const errAssistantMsg = await addMessage(activeConvId, 'assistant', errMsg, 'confused')
      setMessages(prev => [...prev, errAssistantMsg])
      setCurrentMood('confused')
    } finally {
      setIsGenerating(false)
      setStreamingText('')
    }
  }

  // 5. Speech Recognition Handler
  const toggleSpeechRecognition = () => {
    if (isRecording) {
      stopSpeechRecognition()
    } else {
      startSpeechRecognition()
    }
  }

  const startSpeechRecognition = () => {
    const success = startListening('en-US', {
      onResult: (result) => {
        if (result.isFinal && result.transcript.trim()) {
          setInput(result.transcript)
          void handleSend(result.transcript)
          setIsRecording(false)
          setCurrentMood('idle')
        }
      },
      onInterim: (transcript) => {
        setInput(transcript)
      },
      onStateChange: (state) => {
        if (state === 'listening') {
          setIsRecording(true)
          setCurrentMood('listening')
        } else if (state === 'idle' || state === 'error') {
          setIsRecording(false)
          setCurrentMood('idle')
        }
      },
      onError: (err) => {
        setUiNotice(err)
        setIsRecording(false)
        setCurrentMood('idle')
      }
    })
    if (!success) {
      setUiNotice('Speech recognition is not available or supported in this browser.')
    }
  }

  const stopSpeechRecognition = () => {
    stopListening()
    setIsRecording(false)
    setCurrentMood('idle')
  }

  // 6. Load Local WebLLM Model
  const handleDownloadModel = async () => {
    setShowModelBar(true)
    const ok = await loadModel(selectedModel)
    if (ok) {
      updateProvider({ backend: 'webgpu' })
    }
  }

  const handleLoadCpuModel = async () => {
    setShowModelBar(true)
    const ok = await loadCpuModel()
    if (ok) updateProvider({ backend: 'cpu' })
  }

  const handleCopyMessage = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(id)
      setTimeout(() => setCopiedId(cur => (cur === id ? null : cur)), 1600)
    } catch {
      setUiNotice('Clipboard access was blocked by your browser.')
    }
  }

  const handleRetryFrom = (msgIndex: number) => {
    if (isGenerating) return
    const prevUser = [...messages.slice(0, msgIndex)].reverse().find(m => m.role === 'user')
    if (prevUser) {
      void handleSend(prevUser.content)
    }
  }

  const handleRenameSave = async (id: string) => {
    const trimmed = editingTitle.trim()
    if (!trimmed) {
      setEditingConvId(null)
      return
    }
    await renameConversation(id, trimmed)
    setConversations(prev => prev.map(c => (c.id === id ? { ...c, title: trimmed } : c)))
    setEditingConvId(null)
  }

  const filteredConversations = searchQuery.trim()
    ? conversations.filter(c => c.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : conversations

  const activeConv = conversations.find(c => c.id === activeConvId)

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      {/* ─── Top Header Bar ────────────────────────────────────────────── */}
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-line bg-surface/80 px-3 py-2.5 backdrop-blur-md sm:px-4 sm:py-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <button
            onClick={() => setIsDrawerOpen(!isDrawerOpen)}
            aria-label="Toggle saved chats"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-line bg-bg font-mono text-xs text-mute transition-colors hover:border-accent hover:text-ink"
          >
            <MessageSquare size={14} />
          </button>
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-base font-semibold leading-tight truncate">
              {activeConv?.title || 'Otomo-chan'}
            </h2>
            <p className="label flex min-w-0 items-center gap-1.5 !text-[9px] !tracking-wider">
              <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
              <span className="hidden truncate min-[380px]:inline">
                {providerSettings.backend === 'api'
                  ? `API · ${providerSettings.api.model || API_PRESETS[providerSettings.api.preset].label}`
                  : providerSettings.backend === 'cpu' && cpuModelReady
                    ? 'Local CPU Model Active'
                    : providerSettings.backend === 'cpu'
                      ? 'Local CPU Model · Load Needed'
                      : providerSettings.backend === 'webgpu' && webGpuModelReady
                        ? 'Neural WebGPU Active'
                        : 'Quick Offline Mode'}
              </span>
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          {/* Model Status Pill */}
          <button
            type="button"
            onClick={() => setShowModelBar(!showModelBar)}
            aria-label="Toggle model settings"
            className="flex h-11 w-11 items-center justify-center gap-1.5 rounded-xl border border-line bg-bg font-mono text-xs text-mute transition-colors hover:border-ink xl:w-auto xl:px-2.5"
          >
            <Brain size={14} className="text-accent" />
            <span className="hidden xl:inline">
              {providerSettings.backend === 'api'
                ? 'AI: API'
                : providerSettings.backend === 'cpu' && cpuModelReady
                  ? 'CPU Ready'
                  : providerSettings.backend === 'cpu'
                    ? 'Load CPU Model'
                    : providerSettings.backend === 'webgpu' && webGpuModelReady
                      ? 'Neural Ready'
                      : 'AI Settings'}
            </span>
          </button>

          <Button
            size="sm"
            variant="accent"
            onClick={handleNewChat}
            aria-label="Start a new chat"
            className="!h-11 !w-11 !shrink-0 !px-0 xl:!w-auto xl:!px-3"
          >
            <Plus size={14} />
            <span className="hidden xl:inline">New Chat</span>
          </Button>
        </div>
      </div>

      {/* ─── AI Backend & Model Settings Bar ───────────────────────────── */}
      <AnimatePresence>
        {showModelBar && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-b border-line bg-bg p-3.5 space-y-3 overflow-hidden"
          >
            {/* Mode Switcher */}
            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  { id: 'offline', label: 'Quick Offline (0 MB)' },
                  { id: 'api', label: 'Cloud / Local API' },
                  { id: 'cpu', label: 'Local CPU (WASM)' },
                  { id: 'webgpu', label: 'Browser WebGPU' }
                ] as const
              ).map(mode => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => updateProvider({ backend: mode.id })}
                  className={`rounded-xl border px-3 py-1.5 font-mono text-[11px] transition-colors ${
                    providerSettings.backend === mode.id
                      ? 'border-accent bg-accent text-white font-semibold'
                      : 'border-line bg-surface text-mute hover:text-ink'
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>

            {providerSettings.backend === 'offline' && (
              <p className="text-xs text-mute">
                Instant built-in mode: reads your real schedule, Building 18 exams, tasks (and creates new ones), focus timer, and core CS/math topics with zero download.
              </p>
            )}

            {providerSettings.backend === 'api' && (
              <div className="space-y-2.5 rounded-2xl border border-line bg-surface p-3 text-xs">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <div>
                    <label className="label block mb-1">Provider</label>
                    <select
                      value={providerSettings.api.preset}
                      onChange={e => {
                        const preset = e.target.value as ApiProviderConfig['preset']
                        const info = API_PRESETS[preset]
                        setApiTestStatus(null)
                        updateProvider({
                          api: {
                            preset,
                            baseUrl: info.baseUrl,
                            model: info.defaultModel
                          }
                        })
                      }}
                      className="h-9 w-full rounded-lg border border-line bg-bg px-2 font-mono text-xs"
                    >
                      {Object.entries(API_PRESETS).map(([id, info]) => (
                        <option key={id} value={id}>{info.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="label block mb-1">Model</label>
                    <input
                      type="text"
                      value={providerSettings.api.model}
                      onChange={e => updateProvider({ api: { model: e.target.value } })}
                      placeholder="e.g. gemini-2.5-flash"
                      className="h-9 w-full rounded-lg border border-line bg-bg px-2.5 font-mono text-xs focus:border-accent focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="label block mb-1">
                      API Key {API_PRESETS[providerSettings.api.preset].needsKey ? '' : '(Optional)'}
                    </label>
                    <input
                      type="password"
                      value={providerSettings.api.apiKey}
                      onChange={e => updateProvider({ api: { apiKey: e.target.value } })}
                      placeholder={API_PRESETS[providerSettings.api.preset].needsKey ? 'Paste key (stored locally)' : 'Not required'}
                      className="h-9 w-full rounded-lg border border-line bg-bg px-2.5 font-mono text-xs focus:border-accent focus:outline-none"
                    />
                  </div>
                </div>

                {providerSettings.api.preset === 'custom' || providerSettings.api.preset === 'ollama' ? (
                  <div>
                    <label className="label block mb-1">Base URL</label>
                    <input
                      type="url"
                      value={providerSettings.api.baseUrl}
                      onChange={e => updateProvider({ api: { baseUrl: e.target.value } })}
                      placeholder="http://localhost:11434/v1"
                      className="h-9 w-full rounded-lg border border-line bg-bg px-2.5 font-mono text-xs focus:border-accent focus:outline-none"
                    />
                  </div>
                ) : null}

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <span className="text-[11px] text-mute">
                    {API_PRESETS[providerSettings.api.preset].hint}. Stored only on this device.
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="line"
                    disabled={testingApi}
                    onClick={handleTestApi}
                  >
                    {testingApi ? 'Testing…' : 'Test Connection'}
                  </Button>
                </div>

                {apiTestStatus && (
                  <p role="status" className={`rounded-lg border p-2 text-xs ${apiTestStatus.ok ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500' : 'border-accent/30 bg-accent/10 text-ink'}`}>
                    {apiTestStatus.message}
                  </p>
                )}
              </div>
            )}

            {providerSettings.backend === 'cpu' && (
              <div className="space-y-2 rounded-2xl border border-line bg-surface p-3 text-xs">
                <p className="text-mute">
                  {CPU_MODEL_NAME} runs locally on your CPU through WebAssembly, so it works without WebGPU. The model downloads once from Hugging Face and is cached by your browser.
                </p>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono font-semibold">{CPU_MODEL_NAME}</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="accent"
                    onClick={handleLoadCpuModel}
                    disabled={cpuModelReady || modelLoadBusy}
                  >
                    <Download size={12} />
                    {cpuModelReady ? 'CPU Model Ready' : modelLoadBusy ? 'Loading…' : 'Download & Load'}
                  </Button>
                </div>
                {!cpuModelReady && cpuModelError && (
                  <p role="alert" className="rounded-lg border border-accent/30 bg-accent/5 p-2 text-xs text-ink">
                    {modelProgress.text}
                  </p>
                )}
                {modelLoadBusy && (
                  <div className="space-y-1">
                    <div className="flex justify-between gap-2 text-[11px] font-mono text-mute">
                      <span className="truncate">{modelProgress.text}</span>
                      <span>{modelProgress.progress}%</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-line">
                      <div className="h-full bg-accent transition-all duration-300" style={{ width: `${modelProgress.progress}%` }} />
                    </div>
                  </div>
                )}
              </div>
            )}

            {providerSettings.backend === 'webgpu' && (
              <>
                <div className="flex flex-col gap-2 text-xs sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <span className="font-mono font-semibold">WebGPU Model:</span>
                    <select
                      value={selectedModel}
                      onChange={e => setSelectedModel(e.target.value)}
                      disabled={modelLoadBusy}
                      className="min-w-0 max-w-full rounded-lg border border-line bg-surface px-2 py-1 font-mono text-xs"
                    >
                      {MODEL_CATALOG.map(m => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.size})
                        </option>
                      ))}
                    </select>
                  </div>

                  {!webGpuModelReady && (
                    <Button
                      size="sm"
                      variant="accent"
                      onClick={handleDownloadModel}
                      disabled={!gpuSupported || selectedModelIncompatible || modelLoadBusy}
                    >
                      <Download size={12} />
                      {!gpuSupported
                        ? 'Unavailable'
                        : modelLoadBusy
                          ? 'Loading…'
                          : 'Load Model'}
                    </Button>
                  )}
                </div>

                {selectedModelIncompatible && selectedModelInfo && (
                  <div role="status" className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-accent/30 bg-accent/5 p-2.5 text-xs text-ink">
                    <span>
                      This GPU supports {Math.floor((deviceCapability?.maxComputeWorkgroupStorageSize ?? 0) / 1024)} KB workgroup storage, but every WebGPU model needs at least 32 KB. Keep the model selectable, but it cannot load on this adapter. Use Local CPU (WASM), Cloud / Local API, or Quick Offline instead.
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      <Button size="sm" variant="accent" onClick={() => updateProvider({ backend: 'cpu' })}>
                        Use CPU Model
                      </Button>
                      <Button size="sm" variant="line" onClick={() => updateProvider({ backend: 'api' })}>
                        Use API
                      </Button>
                      <Button size="sm" variant="line" onClick={() => updateProvider({ backend: 'offline' })}>
                        Quick Offline
                      </Button>
                    </div>
                  </div>
                )}

                {!webGpuModelReady && (modelProgress.status === 'error' || modelProgress.status === 'unsupported' || !gpuSupported) && (
                  <p role="alert" className="rounded-lg border border-accent/30 bg-accent/5 p-2 text-xs text-ink">
                    {!gpuSupported
                      ? 'WebGPU is unavailable in this browser. Switch to Cloud / Local API or Quick Offline Mode.'
                      : modelProgress.text}
                  </p>
                )}

                {['checking', 'downloading', 'loading'].includes(modelProgress.status) && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-mono text-mute">
                      <span>{modelProgress.text}</span>
                      <span>{modelProgress.progress}%</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-line overflow-hidden">
                      <div
                        className="h-full bg-accent transition-all duration-300"
                        style={{ width: `${modelProgress.progress}%` }}
                      />
                    </div>
                  </div>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Inline Notice Banner ──────────────────────────────────────── */}
      {uiNotice && (
        <div role="alert" className="flex items-center justify-between gap-2 border-b border-accent/30 bg-accent/10 px-4 py-2 text-xs text-ink">
          <span className="flex items-center gap-2">
            <AlertCircle size={14} className="shrink-0 text-accent" />
            {uiNotice}
          </span>
          <button type="button" onClick={() => setUiNotice(null)} aria-label="Dismiss notice" className="text-mute hover:text-ink">
            <X size={14} />
          </button>
        </div>
      )}

      {/* ─── Main Chat & Character Stage ───────────────────────────────── */}
      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        {/* Messages Scroll Area */}
        <div className="min-h-0 min-w-0 flex-1 space-y-4 overflow-y-auto p-3 sm:p-4 md:p-6">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12 space-y-4">
              <OtomoCharacter mood="happy" size="lg" />
              <div className="max-w-sm space-y-1">
                <h3 className="font-display text-xl font-semibold">Otomo-chan is ready!</h3>
                <p className="text-xs text-mute">Ask about your lectures, upcoming exams, homework, programming, or practice questions.</p>
              </div>
              <div className="flex flex-wrap justify-center gap-2 max-w-md pt-2">
                {[
                  'What classes do I have today?',
                  'Do I have any pending tasks?',
                  'Explain binary search in Python',
                  'Give me tips for midterm revision'
                ].map(prompt => (
                  <button
                    key={prompt}
                    onClick={() => { setInput(prompt); void handleSend(prompt) }}
                    className="rounded-xl border border-line bg-surface/80 px-3 py-1.5 text-xs text-ink hover:border-accent hover:text-accent transition-colors text-left"
                  >
                    "{prompt}"
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg, msgIndex) => {
              const isUser = msg.role === 'user'
              const isErrorMsg = !isUser && msg.expression === 'confused'
              return (
                <div
                  key={msg.id}
                  className={`flex min-w-0 items-start gap-3 ${isUser ? 'flex-row-reverse' : ''}`}
                >
                  {!isUser && (
                    <div className="shrink-0 pt-1">
                      <OtomoCharacter
                        mood={msg.expression || 'idle'}
                        size="sm"
                        showBadge={false}
                        subtleAnimation={false}
                      />
                    </div>
                  )}

                  <div className={`group relative min-w-0 max-w-[calc(100%-3.5rem)] break-words rounded-3xl p-3 sm:max-w-xl sm:p-4 ${isUser ? 'bg-ink text-surface rounded-br-sm' : 'border border-line bg-surface text-ink rounded-bl-sm shadow-sm'}`}>
                    {/* Header */}
                    <div className="flex items-center justify-between gap-4 mb-1">
                      <span className={`label !text-[9px] ${isUser ? '!text-surface/60' : '!text-accent'}`}>
                        {isUser ? 'You' : 'Otomo-chan'}
                      </span>
                      <div className="flex items-center gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                        {isErrorMsg && (
                          <button
                            type="button"
                            onClick={() => handleRetryFrom(msgIndex)}
                            disabled={isGenerating}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-accent hover:bg-bg/30 disabled:opacity-40"
                            title="Retry last prompt"
                            aria-label="Retry last prompt"
                          >
                            <RotateCcw size={12} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => void handleCopyMessage(msg.id, msg.content)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-mute hover:bg-bg/20"
                          title="Copy message"
                          aria-label="Copy message"
                        >
                          {copiedId === msg.id ? <Check size={12} className="text-accent" /> : <Copy size={12} />}
                        </button>
                      </div>
                    </div>

                    {/* Message Content */}
                    {isUser ? (
                      <div className="break-words whitespace-pre-wrap font-sans text-sm leading-relaxed sm:text-base">
                        {msg.content}
                      </div>
                    ) : (
                      <ChatMarkdown content={msg.content} />
                    )}

                    <p className={`mt-2 font-mono text-[9px] text-right ${isUser ? 'text-surface/50' : 'text-mute'}`}>
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              )
            })
          )}

          {/* Streaming Bubble */}
          {isGenerating && streamingText && (
            <div className="flex items-start gap-3">
              <div className="shrink-0 pt-1">
                <OtomoCharacter mood="explaining" size="sm" showBadge={false} />
              </div>
              <div className="min-w-0 max-w-[calc(100%-3.5rem)] break-words rounded-3xl rounded-bl-sm border border-line bg-surface p-3 text-sm leading-relaxed shadow-sm sm:max-w-xl sm:p-4 sm:text-base">
                <span className="label !text-[9px] !text-accent block mb-1">Otomo-chan</span>
                <ChatMarkdown content={streamingText} />
                <span className="inline-block h-3 w-1.5 ml-1 bg-accent animate-pulse" />
              </div>
            </div>
          )}

          {isGenerating && !streamingText && (
            <div className="flex items-center gap-3">
              <OtomoCharacter mood="thinking" size="sm" showBadge={false} />
              <div className="rounded-2xl border border-line bg-surface px-4 py-2 text-xs font-mono text-mute flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-accent animate-ping" />
                Thinking through your question...
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* ─── Persistent Character Floating Presence ────────────────── */}
        <div className="hidden lg:flex flex-col items-center justify-center w-56 border-l border-line bg-surface/50 p-6 select-none shrink-0">
          <OtomoCharacter
            mood={currentMood}
            size="lg"
            subtleAnimation={true}
          />
          <div className="mt-4 text-center">
            <span className="seal !h-7 !w-7 !text-xs mx-auto mb-1">供</span>
            <h4 className="font-display text-sm font-semibold">Otomo-chan</h4>
            <p className="jp text-xs text-mute">お供ちゃん</p>
            <p className="mt-2 text-[11px] text-mute leading-snug">
              {currentMood === 'thinking' ? 'Analyzing equations & notes...' :
               currentMood === 'listening' ? 'Listening closely...' :
               currentMood === 'explaining' ? 'Breaking down concept...' :
               currentMood === 'happy' ? 'Great progress!' :
               'Always ready by your side.'}
            </p>
          </div>
        </div>

        {/* ─── Conversations Drawer ────────────────────────────────────── */}
        <AnimatePresence>
          {isDrawerOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsDrawerOpen(false)}
                className="absolute inset-0 z-30 bg-black/30"
                aria-hidden="true"
              />
              <motion.div
                initial={{ x: -280, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -280, opacity: 0 }}
                className="absolute inset-y-0 left-0 z-40 w-72 border-r border-line bg-surface shadow-2xl flex flex-col"
              >
                <div className="flex items-center justify-between border-b border-line p-4">
                  <h3 className="font-display text-sm font-semibold">Saved Chats</h3>
                  <button onClick={() => setIsDrawerOpen(false)} aria-label="Close saved chats" className="rounded p-1 text-mute hover:text-ink">
                    <X size={16} />
                  </button>
                </div>

                {/* Search */}
                <div className="border-b border-line px-3 py-2">
                  <div className="relative">
                    <Search size={13} className="absolute left-2.5 top-2.5 text-mute" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Filter chats…"
                      aria-label="Filter saved chats"
                      className="h-8 w-full rounded-lg border border-line bg-bg pl-8 pr-2 text-xs text-ink focus:border-accent focus:outline-none"
                    />
                  </div>
                </div>

                {/* Chat List */}
                <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
                  {filteredConversations.length === 0 ? (
                    <p className="py-6 text-center text-xs text-mute">No matching chats.</p>
                  ) : (
                    filteredConversations.map(conv => (
                      <div
                        key={conv.id}
                        onClick={() => {
                          if (editingConvId !== conv.id) {
                            setActiveConvId(conv.id)
                            setIsDrawerOpen(false)
                          }
                        }}
                        className={`group flex items-center justify-between gap-1 rounded-xl p-2.5 text-xs cursor-pointer transition-colors ${activeConvId === conv.id ? 'bg-accent/10 text-accent font-semibold' : 'hover:bg-bg text-ink'}`}
                      >
                        {editingConvId === conv.id ? (
                          <input
                            type="text"
                            autoFocus
                            value={editingTitle}
                            onChange={e => setEditingTitle(e.target.value)}
                            onClick={e => e.stopPropagation()}
                            onKeyDown={e => {
                              if (e.key === 'Enter') void handleRenameSave(conv.id)
                              if (e.key === 'Escape') setEditingConvId(null)
                            }}
                            onBlur={() => void handleRenameSave(conv.id)}
                            className="h-7 min-w-0 flex-1 rounded border border-accent bg-bg px-2 text-xs text-ink focus:outline-none"
                          />
                        ) : (
                          <>
                            <span className="truncate flex-1">{conv.title}</span>
                            <div className="flex items-center gap-0.5 opacity-80 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                              <button
                                type="button"
                                aria-label="Rename chat"
                                onClick={e => {
                                  e.stopPropagation()
                                  setEditingConvId(conv.id)
                                  setEditingTitle(conv.title)
                                }}
                                className="rounded p-1 text-mute hover:text-ink"
                              >
                                <Edit2 size={12} />
                              </button>
                              <button
                                type="button"
                                aria-label="Delete chat"
                                onClick={e => { e.stopPropagation(); void handleDeleteChat(conv.id) }}
                                className="rounded p-1 text-mute hover:text-accent"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* ─── Input Bar ─────────────────────────────────────────────────── */}
      <div className="shrink-0 border-t border-line bg-surface p-3 md:p-4">
        <form
          onSubmit={e => { e.preventDefault(); void handleSend() }}
          className="flex items-center gap-2 max-w-4xl mx-auto"
        >
          {/* Speech-to-Text Button */}
          <button
            type="button"
            onClick={toggleSpeechRecognition}
            aria-label={isRecording ? 'Stop recording' : 'Speak to Otomo-chan'}
            title={isRecording ? 'Stop recording' : 'Speak to Otomo-chan'}
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition-colors ${isRecording ? 'bg-sakura text-white animate-pulse' : 'border border-line bg-bg text-mute hover:border-accent hover:text-accent'}`}
          >
            {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
          </button>

          {/* Text Input */}
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                void handleSend()
              }
            }}
            placeholder={isRecording ? 'Listening to your voice...' : 'Ask Otomo-chan about courses, schedule, tasks, or math…'}
            disabled={isGenerating}
            className="max-h-32 min-h-12 min-w-0 flex-1 resize-none rounded-2xl border border-line bg-bg px-3 py-3 font-sans text-base text-ink focus:border-accent focus:outline-none disabled:opacity-50 sm:px-4 sm:text-sm"
          />

          {/* Send / Cancel Button */}
          {isGenerating ? (
            <Button
              type="button"
              variant="solid"
              size="icon"
              onClick={cancelInference}
              title="Stop generation"
              className="!h-12 !w-12 rounded-2xl shrink-0"
            >
              <Square size={16} />
            </Button>
          ) : (
            <Button
              type="submit"
              variant="accent"
              size="icon"
              disabled={!input.trim()}
              title="Send message"
              className="!h-12 !w-12 rounded-2xl shrink-0"
            >
              <Send size={16} />
            </Button>
          )}
        </form>
      </div>
    </div>
  )
}
