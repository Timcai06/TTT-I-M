type IdleCallbackHandle = number

interface IdleDeadlineLike {
  didTimeout: boolean
  timeRemaining: () => number
}

interface IdleCallbackWindow {
  requestIdleCallback?: (callback: (deadline: IdleDeadlineLike) => void, options?: { timeout?: number }) => IdleCallbackHandle
  cancelIdleCallback?: (handle: IdleCallbackHandle) => void
}

const MIN_IDLE_BUDGET_MS = 6
const DEFAULT_IDLE_TIMEOUT_MS = 1800
const INTERACTION_QUIET_MS = 420

let lastInteractionAt = 0
let activityListenersAttached = false

/**
 * 等待 idle decode 的图片队列。
 * 每个 item 对应一个已经 onload 且 naturalWidth > 0 的 HTMLImageElement。
 */
const queue: Array<{
  image: HTMLImageElement
  reject: (error: unknown) => void
  resolve: () => void
}> = []

let scheduled = false

function markInteraction() {
  lastInteractionAt = performance.now()
}

function ensureActivityListeners() {
  if (activityListenersAttached || typeof window === 'undefined') return
  activityListenersAttached = true
  window.addEventListener('wheel', markInteraction, { passive: true })
  window.addEventListener('scroll', markInteraction, { passive: true })
  window.addEventListener('touchmove', markInteraction, { passive: true })
  window.addEventListener('pointerdown', markInteraction, { passive: true })
}

function isInteractionWindowBusy() {
  return performance.now() - lastInteractionAt < INTERACTION_QUIET_MS
}

function scheduleAfterFrame() {
  scheduled = true
  window.requestAnimationFrame(() => schedule(runQueue))
}

/**
 * @description 调度一次空闲任务。优先使用 `requestIdleCallback`，不支持时回退到 32ms timeout。
 * @dependencies 浏览器 `requestIdleCallback` / `setTimeout`
 * @performance / @caveats fallback 的 `didTimeout=true` 表示没有真实 idle budget，只允许队列按保守节奏释放。
 */
function schedule(callback: (deadline: IdleDeadlineLike) => void) {
  const idleWindow = window as IdleCallbackWindow
  if (typeof idleWindow.requestIdleCallback === 'function') {
    return idleWindow.requestIdleCallback(callback, { timeout: DEFAULT_IDLE_TIMEOUT_MS })
  }

  return window.setTimeout(() => callback({
    didTimeout: true,
    timeRemaining: () => MIN_IDLE_BUDGET_MS,
  }), 32)
}

/**
 * @description 按 idle budget 分片执行图片 decode。
 *   每轮只取一个图片，避免一次 idle callback 内连续 decode 多张大图造成主线程长任务。
 * @dependencies `HTMLImageElement.decode`
 * @performance / @caveats
 *   - `MIN_IDLE_BUDGET_MS=6` 是每轮继续处理的最低预算；低于该值就让出一帧。
 *   - decode reject 不在这里吞掉，交给调用方决定是否作为非致命跳过。
 *   - `scheduled` 是全局门闩，防止大量图片同时入队时注册多个 idle callback。
 * @steps
 *   step1: 取出队首图片并执行 decode
 *   step2: resolve/reject 当前 Promise
 *   step3: 若队列仍有任务，根据 idle budget 决定立即续排或下一帧再排
 */
function runQueue(deadline: IdleDeadlineLike) {
  scheduled = false
  ensureActivityListeners()

  if (deadline.didTimeout && isInteractionWindowBusy()) {
    scheduleAfterFrame()
    return
  }

  const item = queue.shift()
  if (!item) return

  const decode = typeof item.image.decode === 'function'
    ? item.image.decode()
    : Promise.resolve()

  void decode.then(item.resolve, item.reject).finally(() => {
    if (queue.length === 0) return

    if (!isInteractionWindowBusy() && (deadline.didTimeout || deadline.timeRemaining() >= MIN_IDLE_BUDGET_MS)) {
      scheduled = true
      schedule(runQueue)
      return
    }

    scheduleAfterFrame()
  })
}

/**
 * @description 将已加载图片加入 idle decode 队列。
 *   用于滚动邻近预热图片：网络加载完成后不立即同步 decode，而是在浏览器空闲片段中释放解码压力。
 * @dependencies `runQueue` / `schedule`
 * @performance / @caveats 只接受 complete 且 naturalWidth > 0 的图片；未完成图片直接 resolve，
 *   因为加载失败/未加载的判定属于 `loadImage` 负责。
 */
export function enqueueImageDecode(image: HTMLImageElement): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()
  if (!image.complete || image.naturalWidth <= 0) return Promise.resolve()
  ensureActivityListeners()

  return new Promise<void>((resolve, reject) => {
    queue.push({ image, reject, resolve })
    if (scheduled) return
    scheduled = true
    schedule(runQueue)
  })
}
