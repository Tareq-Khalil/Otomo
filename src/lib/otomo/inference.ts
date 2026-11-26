/**
 * Otomo-chan Local AI Inference Engine
 *
 * Abstracts the AI inference layer so the model, provider, and runtime
 * can be swapped independently of the chat UI and personality system.
 *
 * Architecture:
 * - WebLLM runs in a Web Worker to avoid blocking the main thread
 * - Transformers.js provides a quantized CPU/WASM path for GPUs with restrictive limits
 * - Model files are cached in the browser (Cache API / IndexedDB) by WebLLM
 * - Supports streaming responses, cancellation, and progress reporting
 * - Falls back gracefully on unsupported/low-memory devices
 *
 * IMPORTANT: This module does NOT hardcode personality.
 * The system prompt is built by personality.ts and passed in.
 */

import * as webllm from '@mlc-ai/web-llm'
import type { ProgressInfo, TextGenerationPipeline } from '@huggingface/transformers'
import type { State, Data } from '@/lib/types'
import { generateFallbackResponse } from './fallback'
import { getConfig } from './config'

// ─── Types ─────────────────────────────────────────────────────────────────

export type ModelStatus =
  | 'idle'
  | 'checking'
  | 'downloading'
  | 'loading'
  | 'ready'
  | 'error'
  | 'unsupported'

export interface ModelProgress {
  status: ModelStatus
  progress: number       // 0-100
  text: string           // Human-readable status
  downloadedMB?: number
  totalMB?: number
}

export interface ApiProviderConfig {
  preset: 'gemini' | 'groq' | 'openrouter' | 'ollama' | 'custom'
  baseUrl: string
  apiKey: string
  model: string
}

export type ActiveBackend = 'offline' | 'api' | 'webgpu' | 'cpu'

export const CPU_MODEL_ID = 'onnx-community/Qwen3-0.6B-ONNX'
export const CPU_MODEL_NAME = 'Qwen3 0.6B (CPU / WASM)'

export const API_PRESETS: Record<ApiProviderConfig['preset'], { label: string; baseUrl: string; defaultModel: string; needsKey: boolean; hint: string }> = {
  gemini: {
    label: 'Google Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    defaultModel: 'gemini-2.5-flash',
    needsKey: true,
    hint: 'Free tier key from aistudio.google.com'
  },
  groq: {
    label: 'Groq (Fast)',
    baseUrl: 'https://api.groq.com/openai/v1',
    defaultModel: 'llama-3.3-70b-versatile',
    needsKey: true,
    hint: 'Free tier key from console.groq.com'
  },
  openrouter: {
    label: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'meta-llama/llama-3.3-70b-instruct:free',
    needsKey: true,
    hint: 'Supports free & paid models at openrouter.ai'
  },
  ollama: {
    label: 'Local Ollama',
    baseUrl: 'http://localhost:11434/v1',
    defaultModel: 'qwen2.5:3b',
    needsKey: false,
    hint: 'Runs locally on your PC (set OLLAMA_ORIGINS=*)'
  },
  custom: {
    label: 'Custom OpenAI-Compatible',
    baseUrl: '',
    defaultModel: '',
    needsKey: false,
    hint: 'Any /v1/chat/completions compatible endpoint'
  }
}

const PROVIDER_STORAGE_KEY = 'otomo:ai-provider-v1'

export interface StoredProviderSettings {
  backend: ActiveBackend
  api: ApiProviderConfig
}

export function loadProviderSettings(): StoredProviderSettings {
  try {
    const raw = JSON.parse(localStorage.getItem(PROVIDER_STORAGE_KEY) ?? 'null')
    if (raw && typeof raw === 'object' && raw.api) {
      return {
        backend: raw.backend === 'api' || raw.backend === 'webgpu' || raw.backend === 'cpu' ? raw.backend : 'offline',
        api: {
          preset: raw.api.preset in API_PRESETS ? raw.api.preset : 'gemini',
          baseUrl: typeof raw.api.baseUrl === 'string' ? raw.api.baseUrl : API_PRESETS.gemini.baseUrl,
          apiKey: typeof raw.api.apiKey === 'string' ? raw.api.apiKey : '',
          model: typeof raw.api.model === 'string' ? raw.api.model : API_PRESETS.gemini.defaultModel
        }
      }
    }
  } catch {
    // Ignore corrupt storage
  }
  return {
    backend: 'offline',
    api: {
      preset: 'gemini',
      baseUrl: API_PRESETS.gemini.baseUrl,
      apiKey: '',
      model: API_PRESETS.gemini.defaultModel
    }
  }
}

export function saveProviderSettings(settings: StoredProviderSettings): void {
  try {
    localStorage.setItem(PROVIDER_STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // Ignore storage error
  }
}

export interface InferenceOptions {
  systemPrompt: string
  messages: { role: 'user' | 'assistant' | 'system'; content: string }[]
  temperature?: number
  top_p?: number
  maxTokens?: number
  onChunk?: (chunk: string, full: string) => void
  signal?: AbortSignal
  fallbackContext?: { state: State; data: Data; owner: string }
  backendOverride?: ActiveBackend
  apiConfig?: ApiProviderConfig
}

export interface InferenceResult {
  content: string
  finishReason: 'stop' | 'length' | 'cancelled' | 'error'
  tokensUsed?: number
}

// ─── Capability Detection ──────────────────────────────────────────────────

export function checkWebGPUSupport(): { supported: boolean; reason?: string } {
  if (typeof navigator === 'undefined') {
    return { supported: false, reason: 'Not running in a browser environment.' }
  }

  if (!('gpu' in navigator)) {
    return {
      supported: false,
      reason: 'WebGPU is not available in this browser. Try Chrome 113+, Edge 113+, or a recent Chromium-based browser.'
    }
  }

  return { supported: true }
}

export async function checkDeviceCapability(): Promise<{
  webgpu: boolean
  estimatedVRAM: string
  recommended: string[]
  maxComputeWorkgroupStorageSize?: number
  warning?: string
}> {
  const gpuCheck = checkWebGPUSupport()

  if (!gpuCheck.supported) {
    return {
      webgpu: false,
      estimatedVRAM: 'unknown',
      recommended: [],
      warning: gpuCheck.reason
    }
  }

  // Estimate available memory
  const deviceMemory = (navigator as unknown as { deviceMemory?: number }).deviceMemory
  const lowMemory = deviceMemory !== undefined && deviceMemory <= 4
  const gpu = (navigator as Navigator & {
    gpu?: {
      requestAdapter: () => Promise<{ limits: { maxComputeWorkgroupStorageSize: number } } | null>
    }
  }).gpu
  const adapter = await gpu?.requestAdapter()
  const maxComputeWorkgroupStorageSize = adapter?.limits.maxComputeWorkgroupStorageSize
  const compatibleModels = MODEL_CATALOG
    .filter(model => maxComputeWorkgroupStorageSize === undefined ||
      model.minWorkgroupStorageSize <= maxComputeWorkgroupStorageSize)
    .map(model => model.id)

  const recommended: string[] = []

  if (lowMemory) {
    recommended.push(...compatibleModels.filter(id => id !== 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC'))
    return {
      webgpu: true,
      estimatedVRAM: `~${deviceMemory ?? 'unknown'} GB device memory`,
      recommended,
      maxComputeWorkgroupStorageSize,
      warning: 'Low memory detected. Smaller models are recommended to reduce the risk of running out of memory.'
    }
  }

  recommended.push(...compatibleModels)

  return {
    webgpu: true,
    estimatedVRAM: `~${deviceMemory ?? 'unknown'} GB device memory`,
    recommended,
    maxComputeWorkgroupStorageSize,
    ...(maxComputeWorkgroupStorageSize === undefined
      ? { warning: 'Could not inspect the GPU adapter limits. Model compatibility will be checked when loading.' }
      : {})
  }
}

// ─── Model Catalog ─────────────────────────────────────────────────────────

export interface ModelInfo {
  id: string
  name: string
  size: string
  description: string
  recommended: boolean
  minRAM: string
  minWorkgroupStorageSize: number
}

export const MODEL_CATALOG: ModelInfo[] = [
  {
    id: 'SmolLM2-360M-Instruct-q4f16_1-MLC',
    name: 'SmolLM2 360M',
    size: '~200 MB',
    description: 'Extremely lightweight WebGPU model. Requires 32 KB GPU workgroup storage.',
    recommended: false,
    minRAM: '2 GB',
    minWorkgroupStorageSize: 32768
  },
  {
    id: 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC',
    name: 'Qwen 2.5 (0.5B)',
    size: '~350 MB',
    description: 'Compact WebGPU model for 4–8 GB devices. Requires 32 KB GPU workgroup storage.',
    recommended: true,
    minRAM: '4 GB',
    minWorkgroupStorageSize: 32768
  },
  {
    id: 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC',
    name: 'Qwen 2.5 (1.5B)',
    size: '~1 GB',
    description: 'Better reasoning and longer responses. Needs 8 GB+ RAM and 32 KB GPU workgroup storage.',
    recommended: false,
    minRAM: '8 GB',
    minWorkgroupStorageSize: 32768
  }
]

// ─── Engine Singleton ──────────────────────────────────────────────────────

let engine: webllm.MLCEngine | null = null
let loadedModel: string | null = null
let cpuEngine: TextGenerationPipeline | null = null
let modelLoad: Promise<boolean> | null = null
let modelLoadId: string | null = null
let currentStatus: ModelProgress = {
  status: 'idle',
  progress: 0,
  text: 'No model loaded'
}

const statusListeners = new Set<(p: ModelProgress) => void>()

function updateStatus(update: Partial<ModelProgress>) {
  currentStatus = { ...currentStatus, ...update }
  statusListeners.forEach(fn => fn(currentStatus))
}

export function onStatusChange(fn: (p: ModelProgress) => void): () => void {
  statusListeners.add(fn)
  fn(currentStatus) // Immediately report current status
  return () => statusListeners.delete(fn)
}

export function getModelStatus(): ModelProgress {
  return currentStatus
}

export function isCpuModelLoaded(): boolean {
  return cpuEngine !== null
}

// ─── Model Loading ─────────────────────────────────────────────────────────

export function loadModel(modelId: string): Promise<boolean> {
  // Already loaded
  if (engine && loadedModel === modelId && currentStatus.status === 'ready') {
    return Promise.resolve(true)
  }

  if (modelLoad) {
    if (modelLoadId === modelId) return modelLoad
    return modelLoad.then(() => loadModel(modelId))
  }

  const pending = loadModelInternal(modelId)
  modelLoad = pending
  modelLoadId = modelId
  return pending.finally(() => {
    if (modelLoad === pending) {
      modelLoad = null
      modelLoadId = null
    }
  })
}

async function loadModelInternal(modelId: string): Promise<boolean> {
  // Check WebGPU
  const gpuCheck = checkWebGPUSupport()
  if (!gpuCheck.supported) {
    updateStatus({
      status: 'unsupported',
      progress: 0,
      text: gpuCheck.reason || 'WebGPU not supported'
    })
    return false
  }

  try {
    updateStatus({ status: 'checking', progress: 0, text: 'Checking device compatibility...' })
    const model = MODEL_CATALOG.find(candidate => candidate.id === modelId)
    const capability = await checkDeviceCapability()
    if (
      model &&
      capability.maxComputeWorkgroupStorageSize !== undefined &&
      capability.maxComputeWorkgroupStorageSize < model.minWorkgroupStorageSize
    ) {
      updateStatus({
        status: 'error',
        progress: 0,
        text: `${model.name} needs ${model.minWorkgroupStorageSize / 1024} KB of GPU workgroup storage, but this adapter supports only ${Math.floor(capability.maxComputeWorkgroupStorageSize / 1024)} KB. Use the Local CPU (WASM) model instead; it does not require WebGPU.`
      })
      return false
    }

    if (cpuEngine) {
      const previousCpuEngine = cpuEngine
      cpuEngine = null
      try {
        await previousCpuEngine.dispose()
      } catch (error) {
        console.warn('Could not unload the previous CPU AI model cleanly:', error)
      }
    }

    // Release any previous engine before replacing it, including a failed reload.
    if (engine) {
      const previousEngine = engine
      engine = null
      loadedModel = null
      try {
        await previousEngine.unload()
      } catch (error) {
        console.warn('Could not unload the previous AI model cleanly:', error)
      }
    }

    updateStatus({ status: 'downloading', progress: 0, text: 'Preparing model...' })

    engine = new webllm.MLCEngine()
    engine.setInitProgressCallback((report: webllm.InitProgressReport) => {
      const progress = Math.round(report.progress * 100)
      const downloading = report.text?.toLowerCase().includes('download') ||
                          report.text?.toLowerCase().includes('fetch')
      updateStatus({
        status: downloading ? 'downloading' : 'loading',
        progress,
        text: report.text || `Loading... ${progress}%`
      })
    })

    await engine.reload(modelId)

    loadedModel = modelId
    updateStatus({ status: 'ready', progress: 100, text: `${modelId} ready` })
    return true
  } catch (err) {
    const rawMessage = err instanceof Error ? err.message : 'Unknown error'
    const message = /failed to fetch|networkerror|load failed/i.test(rawMessage)
      ? `Could not download ${modelId}. Check your internet connection and retry. Model files are served by Hugging Face and GitHub; if this app is embedded in another site, its security policy must allow those hosts. (${rawMessage})`
      : `Could not load ${modelId}: ${rawMessage}`
    updateStatus({ status: 'error', progress: 0, text: message })
    engine = null
    loadedModel = null
    return false
  }
}

export function loadCpuModel(): Promise<boolean> {
  if (modelLoad) {
    if (modelLoadId === CPU_MODEL_ID) return modelLoad
    return modelLoad.then(() => loadCpuModel())
  }

  if (cpuEngine) {
    updateStatus({ status: 'ready', progress: 100, text: `${CPU_MODEL_NAME} ready` })
    return Promise.resolve(true)
  }

  const pending = loadCpuModelInternal()
  modelLoad = pending
  modelLoadId = CPU_MODEL_ID
  return pending.finally(() => {
    if (modelLoad === pending) {
      modelLoad = null
      modelLoadId = null
    }
  })
}

async function loadCpuModelInternal(): Promise<boolean> {
  if (typeof window === 'undefined') {
    updateStatus({ status: 'unsupported', progress: 0, text: 'The local CPU model requires a browser.' })
    return false
  }

  try {
    updateStatus({ status: 'checking', progress: 0, text: 'Preparing the local CPU model...' })

    if (engine) await unloadModel()

    const { pipeline } = await import('@huggingface/transformers')
    cpuEngine = await pipeline('text-generation', CPU_MODEL_ID, {
      device: 'wasm',
      dtype: 'q4',
      progress_callback: (progress: ProgressInfo) => {
        if (progress.status === 'ready') {
          updateStatus({ status: 'loading', progress: 99, text: 'Initializing local CPU model...' })
          return
        }

        if (progress.status === 'progress' || progress.status === 'progress_total') {
          const percent = Math.round(progress.progress)
          updateStatus({
            status: 'downloading',
            progress: percent,
            text: `Downloading local CPU model${'file' in progress ? `: ${progress.file}` : ''} (${percent}%)`,
            downloadedMB: Math.round(progress.loaded / 1_000_000),
            totalMB: Math.round(progress.total / 1_000_000)
          })
          return
        }

        if (progress.status === 'download') {
          updateStatus({
            status: 'downloading',
            progress: 0,
            text: `Downloading local CPU model: ${progress.file}`
          })
        }
      }
    })

    updateStatus({ status: 'ready', progress: 100, text: `${CPU_MODEL_NAME} ready` })
    return true
  } catch (error) {
    cpuEngine = null
    const message = error instanceof Error ? error.message : 'Unknown error'
    updateStatus({
      status: 'error',
      progress: 0,
      text: `Could not load ${CPU_MODEL_NAME}: ${message}`
    })
    return false
  }
}

export async function unloadCpuModel(): Promise<void> {
  if (!cpuEngine) return

  const currentEngine = cpuEngine
  cpuEngine = null
  try {
    await currentEngine.dispose()
  } catch (error) {
    updateStatus({
      status: 'error',
      progress: 0,
      text: `Could not unload the local CPU model: ${error instanceof Error ? error.message : 'Unknown error'}`
    })
    throw error
  }
  updateStatus({ status: 'idle', progress: 0, text: 'Model unloaded' })
}

export async function unloadModel(): Promise<void> {
  if (engine) {
    const currentEngine = engine
    engine = null
    loadedModel = null
    try {
      await currentEngine.unload()
    } catch (error) {
      updateStatus({
        status: 'error',
        progress: 0,
        text: `Could not unload the AI model: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
      throw error
    }
    updateStatus({ status: 'idle', progress: 0, text: 'Model unloaded' })
  }
}

export function getLoadedModel(): string | null {
  return loadedModel
}

// ─── Inference ─────────────────────────────────────────────────────────────

let activeAbort: AbortController | null = null

export function cancelInference(): void {
  if (activeAbort) {
    activeAbort.abort()
    activeAbort = null
  }
}

async function generateViaApi(
  options: InferenceOptions,
  api: ApiProviderConfig,
  signal: AbortSignal
): Promise<InferenceResult> {
  const baseUrl = api.baseUrl.trim().replace(/\/$/, '')
  if (!baseUrl || !api.model.trim()) {
    throw new Error('API endpoint URL and model name are required.')
  }
  const presetInfo = API_PRESETS[api.preset]
  if (presetInfo.needsKey && !api.apiKey.trim()) {
    throw new Error(`An API key is required for ${presetInfo.label}.`)
  }

  const brain = getConfig().brain
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (api.apiKey.trim()) {
    headers['Authorization'] = `Bearer ${api.apiKey.trim()}`
  }

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers,
    signal,
    body: JSON.stringify({
      model: api.model.trim(),
      messages: [
        { role: 'system', content: options.systemPrompt },
        ...options.messages
      ],
      temperature: options.temperature ?? brain.temperature ?? 0.7,
      top_p: options.top_p ?? brain.top_p ?? 0.9,
      max_tokens: options.maxTokens ?? brain.maxTokens ?? 1024,
      stream: true
    })
  })

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({})) as { error?: { message?: string }; message?: string }
    throw new Error(errBody.error?.message || errBody.message || `API returned HTTP ${res.status}`)
  }

  const contentType = res.headers.get('content-type') || ''
  if (!contentType.includes('text/event-stream') || !res.body) {
    const json = await res.json() as { choices?: { message?: { content?: string } }[] }
    const text = json.choices?.[0]?.message?.content || ''
    if (text) options.onChunk?.(text, text)
    return { content: text, finishReason: 'stop' }
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let fullContent = ''

  while (true) {
    if (signal.aborted) {
      await reader.cancel().catch(() => undefined)
      return { content: fullContent, finishReason: 'cancelled' }
    }
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data:')) continue
      const payload = trimmed.slice(5).trim()
      if (payload === '[DONE]') {
        return { content: fullContent, finishReason: 'stop' }
      }
      try {
        const parsed = JSON.parse(payload) as { choices?: { delta?: { content?: string } }[] }
        const delta = parsed.choices?.[0]?.delta?.content
        if (delta) {
          fullContent += delta
          options.onChunk?.(delta, fullContent)
        }
      } catch {
        // Ignore partial SSE JSON
      }
    }
  }

  return { content: fullContent, finishReason: 'stop' }
}

async function generateViaCpu(
  options: InferenceOptions,
  signal: AbortSignal
): Promise<InferenceResult> {
  if (signal.aborted) return { content: '', finishReason: 'cancelled' }

  if (!cpuEngine) {
    return {
      content: `The local CPU model is not loaded yet. Open Model Settings and load ${CPU_MODEL_NAME}.`,
      finishReason: 'error'
    }
  }

  const brain = getConfig().brain
  const temperature = options.temperature ?? brain.temperature ?? 0.7
  let fullContent = ''
  const streamer = new (await import('@huggingface/transformers')).TextStreamer(cpuEngine.tokenizer, {
    skip_prompt: true,
    skip_special_tokens: true,
    token_callback_function: () => {
      if (signal.aborted) throw new Error('Inference cancelled')
    },
    callback_function: text => {
      if (signal.aborted) return
      fullContent += text
      options.onChunk?.(text, fullContent)
    }
  })

  const messages = [
    { role: 'system' as const, content: options.systemPrompt },
    ...options.messages.map(message => ({ role: message.role, content: message.content }))
  ]

  const result = await cpuEngine(messages, {
    max_new_tokens: options.maxTokens ?? brain.maxTokens ?? 512,
    do_sample: temperature > 0,
    temperature,
    top_p: options.top_p ?? brain.top_p ?? 0.9,
    streamer
  })

  if (signal.aborted) return { content: '', finishReason: 'cancelled' }

  const generated = result[0]?.generated_text
  const lastMessage = Array.isArray(generated) ? generated.at(-1) : undefined
  const content = fullContent.trim() ||
    (lastMessage && typeof lastMessage.content === 'string' ? lastMessage.content : '')

  return { content, finishReason: 'stop' }
}

export async function testApiConnection(api: ApiProviderConfig): Promise<{ ok: boolean; message: string }> {
  const baseUrl = api.baseUrl.trim().replace(/\/$/, '')
  if (!baseUrl || !api.model.trim()) return { ok: false, message: 'Enter both a base URL and model name.' }
  const presetInfo = API_PRESETS[api.preset]
  if (presetInfo.needsKey && !api.apiKey.trim()) return { ok: false, message: `Enter your ${presetInfo.label} API key.` }

  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (api.apiKey.trim()) headers['Authorization'] = `Bearer ${api.apiKey.trim()}`
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: api.model.trim(),
        messages: [{ role: 'user', content: 'Reply with OK.' }],
        max_tokens: 8,
        stream: false
      })
    })
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({})) as { error?: { message?: string }; message?: string }
      return { ok: false, message: errBody.error?.message || errBody.message || `HTTP ${res.status}` }
    }
    return { ok: true, message: `Connected to ${api.model.trim()}!` }
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'Network error' }
  }
}

export async function generate(options: InferenceOptions): Promise<InferenceResult> {
  cancelInference()
  const controller = new AbortController()
  activeAbort = controller
  const abortFromCaller = () => controller.abort()
  if (options.signal?.aborted) {
    controller.abort()
  } else {
    options.signal?.addEventListener('abort', abortFromCaller, { once: true })
  }
  const signal = controller.signal
  const cleanup = () => {
    options.signal?.removeEventListener('abort', abortFromCaller)
    if (activeAbort === controller) activeAbort = null
  }

  const stored = loadProviderSettings()
  const backend = options.backendOverride ?? stored.backend
  const apiCfg = options.apiConfig ?? stored.api

  if (backend === 'api') {
    try {
      return await generateViaApi(options, apiCfg, signal)
    } catch (err) {
      if (signal.aborted) return { content: '', finishReason: 'cancelled' }
      const message = err instanceof Error ? err.message : 'API request failed'
      if (options.fallbackContext) {
        const lastUserMsg = [...options.messages].reverse().find(m => m.role === 'user')?.content || ''
        try {
          const fallbackText = await generateFallbackResponse({
            userMessage: lastUserMsg,
            state: options.fallbackContext.state,
            data: options.fallbackContext.data,
            owner: options.fallbackContext.owner,
            history: options.messages,
            onChunk: options.onChunk,
            signal
          })
          return {
            content: `Cloud/API request failed (${message}), so I switched to Quick Offline Mode for this reply:\n\n${fallbackText}`,
            finishReason: 'stop'
          }
        } catch {
          // Fall through to error
        }
      }
      return { content: `API error: ${message}`, finishReason: 'error' }
    } finally {
      cleanup()
    }
  }

  if (backend === 'cpu') {
    try {
      return await generateViaCpu(options, signal)
    } catch (error) {
      if (signal.aborted) return { content: '', finishReason: 'cancelled' }

      const message = error instanceof Error ? error.message : 'Unknown error'
      updateStatus({ status: 'error', progress: 0, text: `Local CPU response failed: ${message}` })
      if (options.fallbackContext) {
        const lastUserMsg = [...options.messages].reverse().find(item => item.role === 'user')?.content || ''
        try {
          const fallbackText = await generateFallbackResponse({
            userMessage: lastUserMsg,
            state: options.fallbackContext.state,
            data: options.fallbackContext.data,
            owner: options.fallbackContext.owner,
            history: options.messages,
            onChunk: options.onChunk,
            signal
          })
          return {
            content: `The local CPU model failed (${message}), so I switched to Quick Offline Mode for this reply:\n\n${fallbackText}`,
            finishReason: 'stop'
          }
        } catch (fallbackError) {
          return {
            content: `The local CPU model failed: ${message}\nThe offline companion also failed: ${fallbackError instanceof Error ? fallbackError.message : 'Unknown error'}`,
            finishReason: 'error'
          }
        }
      }
      return { content: `The local CPU model failed: ${message}`, finishReason: 'error' }
    } finally {
      cleanup()
    }
  }

  if (backend === 'offline' || !engine || currentStatus.status !== 'ready') {
    if (options.fallbackContext) {
      const lastUserMsg = [...options.messages].reverse().find(m => m.role === 'user')?.content || ''
      try {
        const fallbackText = await generateFallbackResponse({
          userMessage: lastUserMsg,
          state: options.fallbackContext.state,
          data: options.fallbackContext.data,
          owner: options.fallbackContext.owner,
          history: options.messages,
          onChunk: options.onChunk,
          signal
        })
        if (signal.aborted) return { content: '', finishReason: 'cancelled' }
        return { content: fallbackText, finishReason: 'stop' }
      } catch (err) {
        if (signal.aborted) return { content: '', finishReason: 'cancelled' }
        return {
          content: `The offline companion could not prepare a reply: ${err instanceof Error ? err.message : 'Unknown error'}`,
          finishReason: 'error'
        }
      } finally {
        cleanup()
      }
    }
    cleanup()
    return {
      content: 'The AI model is not loaded yet. You can download our lightweight local model from the top bar or use the built-in offline companion!',
      finishReason: 'error'
    }
  }

  let fullContent = ''

  try {
    const messages: webllm.ChatCompletionMessageParam[] = [
      { role: 'system', content: options.systemPrompt },
      ...options.messages.map(m => ({
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.content
      }))
    ]

    const brain = getConfig().brain
    // Use streaming
    const asyncGenerator = await engine.chat.completions.create({
      messages,
      temperature: options.temperature ?? brain.temperature ?? 0.7,
      top_p: options.top_p ?? brain.top_p ?? 0.9,
      max_tokens: options.maxTokens ?? brain.maxTokens ?? 1024,
      stream: true,
      stream_options: { include_usage: true }
    })
    if (signal.aborted) return { content: '', finishReason: 'cancelled' }

    let tokensUsed = 0

    for await (const chunk of asyncGenerator) {
      if (signal.aborted) {
        return { content: fullContent, finishReason: 'cancelled' }
      }

      const delta = chunk.choices?.[0]?.delta?.content
      if (delta) {
        fullContent += delta
        options.onChunk?.(delta, fullContent)
      }

      if (chunk.usage) {
        tokensUsed = chunk.usage.total_tokens ?? 0
      }

      const finishReason = chunk.choices?.[0]?.finish_reason
      if (finishReason === 'stop' || finishReason === 'length') {
        return {
          content: fullContent,
          finishReason: finishReason === 'stop' ? 'stop' : 'length',
          tokensUsed
        }
      }
    }

    return { content: fullContent, finishReason: 'stop', tokensUsed }
  } catch (err) {
    if (signal.aborted) {
      return { content: '', finishReason: 'cancelled' }
    }
    const message = err instanceof Error ? err.message : 'Unknown error'
    updateStatus({ status: 'error', progress: 0, text: `Local AI response failed: ${message}` })
    const fallbackContext = options.fallbackContext
    if (fallbackContext) {
      const lastUserMsg = [...options.messages].reverse().find(m => m.role === 'user')?.content || ''
      try {
        const fallbackText = await generateFallbackResponse({
          userMessage: lastUserMsg,
          state: fallbackContext.state,
          data: fallbackContext.data,
          owner: fallbackContext.owner,
          history: options.messages,
          onChunk: options.onChunk,
          signal
        })
        return {
          content: `The local AI model ran into a problem, so I switched to offline mode for this reply.\n\n${fallbackText}`,
          finishReason: 'stop'
        }
      } catch (fallbackError) {
        return {
          content: `The local AI model failed: ${message}\nThe offline companion also failed: ${fallbackError instanceof Error ? fallbackError.message : 'Unknown error'}`,
          finishReason: 'error'
        }
      }
    }
    return {
      content: `The local AI model failed: ${message}`,
      finishReason: 'error'
    }
  } finally {
    cleanup()
  }
}

// ─── Reset ─────────────────────────────────────────────────────────────────

export async function resetEngine(): Promise<void> {
  cancelInference()
  await unloadModel()
  await unloadCpuModel()
}
