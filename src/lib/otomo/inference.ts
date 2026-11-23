/**
 * Otomo-chan Local AI Inference Engine
 *
 * Abstracts the AI inference layer so the model, provider, and runtime
 * can be swapped independently of the chat UI and personality system.
 *
 * Architecture:
 * - WebLLM runs in a Web Worker to avoid blocking the main thread
 * - Model files are cached in the browser (Cache API / IndexedDB) by WebLLM
 * - Supports streaming responses, cancellation, and progress reporting
 * - Falls back gracefully on unsupported/low-memory devices
 *
 * IMPORTANT: This module does NOT hardcode personality.
 * The system prompt is built by personality.ts and passed in.
 */

import * as webllm from '@mlc-ai/web-llm'
import type { State, Data } from '@/lib/types'
import { generateFallbackResponse } from './fallback'

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

export interface InferenceOptions {
  systemPrompt: string
  messages: { role: 'user' | 'assistant' | 'system'; content: string }[]
  temperature?: number
  top_p?: number
  maxTokens?: number
  onChunk?: (chunk: string, full: string) => void
  signal?: AbortSignal
  fallbackContext?: { state: State; data: Data; owner: string }
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

  const recommended: string[] = []

  if (lowMemory) {
    recommended.push('Qwen2.5-0.5B-Instruct-q4f16_1-MLC')
    return {
      webgpu: true,
      estimatedVRAM: `~${deviceMemory ?? 'unknown'} GB device memory`,
      recommended,
      warning: 'Low memory detected. Only the smallest models are recommended to avoid crashes.'
    }
  }

  // Standard device: offer a selection
  recommended.push(
    'Qwen2.5-0.5B-Instruct-q4f16_1-MLC',
    'Qwen2.5-1.5B-Instruct-q4f16_1-MLC',
    'SmolLM2-360M-Instruct-q4f16_1-MLC'
  )

  return {
    webgpu: true,
    estimatedVRAM: `~${deviceMemory ?? 'unknown'} GB device memory`,
    recommended
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
}

export const MODEL_CATALOG: ModelInfo[] = [
  {
    id: 'SmolLM2-360M-Instruct-q4f16_1-MLC',
    name: 'SmolLM2 360M',
    size: '~200 MB',
    description: 'Extremely lightweight. Fast on all devices. Limited reasoning.',
    recommended: false,
    minRAM: '2 GB'
  },
  {
    id: 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC',
    name: 'Qwen 2.5 (0.5B)',
    size: '~350 MB',
    description: 'Tiny but capable. Best balance for 4-8 GB devices. Good reasoning for its size.',
    recommended: true,
    minRAM: '4 GB'
  },
  {
    id: 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC',
    name: 'Qwen 2.5 (1.5B)',
    size: '~1 GB',
    description: 'Better reasoning and longer responses. Needs 8 GB+ RAM.',
    recommended: false,
    minRAM: '8 GB'
  }
]

// ─── Engine Singleton ──────────────────────────────────────────────────────

let engine: webllm.MLCEngine | null = null
let loadedModel: string | null = null
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
    const message = err instanceof Error ? err.message : 'Failed to load model'
    updateStatus({ status: 'error', progress: 0, text: message })
    engine = null
    loadedModel = null
    return false
  }
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

  if (!engine || currentStatus.status !== 'ready') {
    if (options.fallbackContext) {
      const lastUserMsg = [...options.messages].reverse().find(m => m.role === 'user')?.content || ''
      try {
        const fallbackText = await generateFallbackResponse({
          userMessage: lastUserMsg,
          state: options.fallbackContext.state,
          data: options.fallbackContext.data,
          owner: options.fallbackContext.owner,
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

    // Use streaming
    const asyncGenerator = await engine.chat.completions.create({
      messages,
      temperature: options.temperature ?? 0.7,
      top_p: options.top_p ?? 0.9,
      max_tokens: options.maxTokens ?? 1024,
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
}
