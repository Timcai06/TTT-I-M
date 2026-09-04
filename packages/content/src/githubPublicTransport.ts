export const GITHUB_API_ORIGIN = 'https://api.github.com'
const GITHUB_API_VERSION = '2026-03-10'
const GITHUB_FETCH_TIMEOUT_MS = 7_000
const MAX_JSON_RESPONSE_BYTES = 1_500_000
const MAX_README_RESPONSE_BYTES = 1_000_000

export interface GitHubPublicPreviewOptions {
  fetchImpl?: typeof fetch
  /** Per-request ceiling. */
  timeoutMs?: number
  /** Whole profile + repositories + README operation ceiling. */
  totalTimeoutMs?: number
  /** Internal absolute deadline shared by every request in one operation. */
  operationDeadlineAt?: number
}

function abortReason(signal: AbortSignal): Error {
  return signal.reason instanceof Error
    ? signal.reason
    : new Error('GitHub request was aborted')
}

function raceWithAbort<T>(task: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) return Promise.reject(abortReason(signal))
  return new Promise<T>((resolve, reject) => {
    let settled = false
    const finish = (callback: () => void) => {
      if (settled) return
      settled = true
      signal.removeEventListener('abort', onAbort)
      callback()
    }
    const onAbort = () => finish(() => reject(abortReason(signal)))
    signal.addEventListener('abort', onAbort, { once: true })
    task.then(
      (value) => finish(() => resolve(value)),
      (error) => finish(() => reject(error)),
    )
  })
}

async function fetchWithDeadline<T>(
  url: string,
  init: RequestInit,
  options: GitHubPublicPreviewOptions,
  consume: (response: Response, signal: AbortSignal) => Promise<T>,
): Promise<T> {
  const controller = new AbortController()
  const configuredTimeout = options.timeoutMs ?? GITHUB_FETCH_TIMEOUT_MS
  const requestTimeoutMs = Number.isFinite(configuredTimeout) && configuredTimeout > 0
    ? Math.min(configuredTimeout, 30_000)
    : GITHUB_FETCH_TIMEOUT_MS
  const remainingOperationMs = options.operationDeadlineAt === undefined
    ? requestTimeoutMs
    : options.operationDeadlineAt - Date.now()
  if (!Number.isFinite(remainingOperationMs) || remainingOperationMs <= 0) {
    throw new Error('GitHub preview operation exceeded its total deadline')
  }
  const timeoutMs = Math.max(1, Math.min(requestTimeoutMs, remainingOperationMs))
  const timer = setTimeout(() => controller.abort(new Error(`GitHub request timed out after ${timeoutMs}ms`)), timeoutMs)
  try {
    const response = await raceWithAbort(
      (options.fetchImpl ?? fetch)(url, { ...init, signal: controller.signal }),
      controller.signal,
    )
    const cancelBodyOnAbort = () => {
      void cancelResponseBody(response, 'GitHub request deadline elapsed while consuming its body')
    }
    controller.signal.addEventListener('abort', cancelBodyOnAbort, { once: true })
    try {
      return await raceWithAbort(consume(response, controller.signal), controller.signal)
    } finally {
      controller.signal.removeEventListener('abort', cancelBodyOnAbort)
    }
  } finally {
    clearTimeout(timer)
  }
}

async function cancelResponseBody(response: Response, reason: string): Promise<void> {
  try {
    await response.body?.cancel(reason)
  } catch {
    // Cancellation is best-effort because the transport may already own the
    // stream. No rejected or oversized body is consumed by this module.
  }
}

async function readBoundedText(
  response: Response,
  signal: AbortSignal,
  maxBytes: number,
): Promise<string | undefined> {
  const declaredLength = Number(response.headers.get('content-length'))
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    await cancelResponseBody(response, 'Declared response body exceeded the configured byte limit')
    return undefined
  }
  if (!response.body) {
    const text = await response.text()
    return new TextEncoder().encode(text).byteLength <= maxBytes ? text : undefined
  }

  const reader = response.body.getReader()
  const cancelReaderOnAbort = () => {
    void reader.cancel(abortReason(signal)).catch(() => undefined)
  }
  const decoder = new TextDecoder()
  let bytesRead = 0
  let text = ''
  signal.addEventListener('abort', cancelReaderOnAbort, { once: true })
  if (signal.aborted) cancelReaderOnAbort()
  try {
    while (true) {
      const chunk = await reader.read()
      if (signal.aborted) throw abortReason(signal)
      if (chunk.done) break
      bytesRead += chunk.value.byteLength
      if (bytesRead > maxBytes) {
        await reader.cancel('Response body exceeded the configured byte limit')
        return undefined
      }
      text += decoder.decode(chunk.value, { stream: true })
    }
    text += decoder.decode()
    return text
  } finally {
    signal.removeEventListener('abort', cancelReaderOnAbort)
    reader.releaseLock()
  }
}

async function readJson<T>(response: Response, signal: AbortSignal): Promise<T | undefined> {
  try {
    const contentType = response.headers.get('content-type')?.toLowerCase() ?? ''
    if (!contentType.includes('application/json') && !contentType.includes('+json')) {
      await cancelResponseBody(response, 'Response did not contain JSON')
      return undefined
    }
    const text = await readBoundedText(response, signal, MAX_JSON_RESPONSE_BYTES)
    return text === undefined ? undefined : JSON.parse(text) as T
  } catch (error) {
    if (signal.aborted) throw signal.reason instanceof Error ? signal.reason : error
    return undefined
  }
}

export function fetchJsonWithDeadline<T>(
  url: string,
  init: RequestInit,
  options: GitHubPublicPreviewOptions,
): Promise<{ response: Response; data?: T }> {
  return fetchWithDeadline(url, init, options, async (response, signal) => {
    if (!response.ok) {
      await cancelResponseBody(response, 'Non-success GitHub JSON response')
      return { response }
    }
    return { response, data: await readJson<T>(response, signal) }
  })
}

export function fetchTextWithDeadline(
  url: string,
  init: RequestInit,
  options: GitHubPublicPreviewOptions,
): Promise<{ response: Response; text?: string }> {
  return fetchWithDeadline(url, init, options, async (response, signal) => {
    if (!response.ok) {
      await cancelResponseBody(response, 'Non-success GitHub text response')
      return { response }
    }
    return {
      response,
      text: await readBoundedText(response, signal, MAX_README_RESPONSE_BYTES),
    }
  })
}

export function publicGitHubHeaders(): HeadersInit {
  return {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': GITHUB_API_VERSION,
    'User-Agent': 'ttt-i-m-builder-graph-public-preview',
  }
}
