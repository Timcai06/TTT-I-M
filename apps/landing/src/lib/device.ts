import { useEffect, useState } from 'react'

/** 视口宽度判断 mobile 布局的断点，需和 CSS media query 保持一致。 */
export const MOBILE_VIEWPORT_QUERY = '(max-width: 768px)'
/** 触摸/粗指针判断，用于 iPad、小窗、触屏笔记本等非纯宽度场景。 */
export const TOUCH_POINTER_QUERY = '(hover: none), (pointer: coarse)'

/**
 * @description 判断当前 viewport 是否进入 mobile 宽度断点
 * @dependencies window.matchMedia 和 MOBILE_VIEWPORT_QUERY
 * @caveats SSR/测试环境没有 window 时返回 false，避免服务端读取浏览器 API
 */
export function isMobileViewport(): boolean {
  return typeof window !== 'undefined' && window.matchMedia(MOBILE_VIEWPORT_QUERY).matches
}

/**
 * @description 判断当前设备是否主要通过触摸或粗指针交互
 * @dependencies window.matchMedia 和 TOUCH_POINTER_QUERY
 */
export function isTouchDevice(): boolean {
  return typeof window !== 'undefined' && window.matchMedia(TOUCH_POINTER_QUERY).matches
}

/**
 * @description landing 的 mobile experience 统一判断：窄视口或触摸设备任一成立即降级到移动体验
 * @dependencies isMobileViewport / isTouchDevice
 * @performance 该函数是同步读取，不订阅变化；组件需要响应式变化时使用 useMobileExperience
 */
export function isMobileExperience(): boolean {
  return isMobileViewport() || isTouchDevice()
}

/**
 * @description React 版 mobile experience 判断，监听 viewport 和 pointer media query 的运行时变化
 * @dependencies matchMedia change event
 * @caveats 初始 state 使用 isMobileExperience；挂载后立即 update，确保浏览器恢复/旋转屏幕后状态同步
 */
export function useMobileExperience(): boolean {
  const [mobile, setMobile] = useState(isMobileExperience)

  useEffect(() => {
    const viewport = window.matchMedia(MOBILE_VIEWPORT_QUERY)
    const touch = window.matchMedia(TOUCH_POINTER_QUERY)
    const update = () => setMobile(viewport.matches || touch.matches)

    viewport.addEventListener('change', update)
    touch.addEventListener('change', update)
    update()

    return () => {
      viewport.removeEventListener('change', update)
      touch.removeEventListener('change', update)
    }
  }, [])

  return mobile
}
