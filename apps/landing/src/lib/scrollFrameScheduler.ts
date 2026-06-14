interface ScrollFrameSchedulerOptions {
  request: (callback: FrameRequestCallback) => number
  cancel: (id: number) => void
  flush: () => void
}

/**
 * @description 创建滚动测量的 rAF 合帧调度器。
 *   滚动期间重复 schedule 只保留第一个待执行帧，不反复 cancel/requeue；
 *   否则 Lenis/ScrollTrigger 高频更新会把测量帧不断推迟到滚动停止后。
 * @dependencies 浏览器 `requestAnimationFrame` / `cancelAnimationFrame`
 * @performance / @caveats cancel 只用于 teardown；滚动合帧用“已有 pending 就跳过”策略保证每帧最多一次布局读取。
 */
export function createScrollFrameScheduler({
  request,
  cancel,
  flush,
}: ScrollFrameSchedulerOptions) {
  let frame = 0

  return {
    schedule() {
      if (frame !== 0) return
      frame = request(() => {
        frame = 0
        flush()
      })
    },
    cancel() {
      if (frame === 0) return
      cancel(frame)
      frame = 0
    },
  }
}
