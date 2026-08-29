import { useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'

/**
 * @description WebGL surface 的通用挂载/暂停生命周期，统一处理“靠近才挂载、可见才渲染”
 * @dependencies 依赖 IntersectionObserver；调用方通常把 visible/mounted 接到 R3F Canvas 和 frameloop
 * @performance renderMargin 控制暂停范围，mountMargin 控制卸载范围，两层 observer 形成迟滞区，避免边界来回抖动
 * @caveats 这个 hook 不直接创建 Canvas，也不登记 context；调用方仍要负责 acquireContext/releaseContext 和 reduced-motion 降级
 */
export interface GLSurfaceOptions {
  /** 渲染暂停 observer 的 rootMargin，默认 120px，进入该范围后才允许 frameloop 运行 */
  renderMargin?: string
  /** 挂载卸载 observer 的 rootMargin，默认上下一个 viewport，离开该范围后可卸载 Canvas */
  mountMargin?: string
  /** Optional/deferred surfaces can start unmounted until their observer resolves. */
  initiallyMounted?: boolean
}

export interface GLSurface {
  /** 需要绑定到 WebGL surface 外层占位节点的 ref */
  ref: RefObject<HTMLDivElement | null>
  /** 是否进入渲染范围；true 表示调用方可以让 frameloop 运行 */
  visible: boolean
  /** 是否进入挂载范围；false 表示调用方可以卸载 Canvas 释放 GPU 资源 */
  mounted: boolean
}

/**
 * @description 返回一个 WebGL surface 的 ref、visible 和 mounted 状态，供视觉组件统一做空闲停机
 * @dependencies 依赖 GLSurfaceOptions 和浏览器 IntersectionObserver
 * @performance 两个 observer 只写 React boolean 状态，不在滚动中读布局；适合 Hero/About/未来 GLTF 组件复用
 * @steps
 * step1: 创建外层 ref，并默认认为首屏可见/已挂载，避免 hydration 初始闪烁
 * step2: 绑定 render observer 更新 visible
 * step3: 绑定 mount observer 更新 mounted
 * step4: 卸载时断开两个 observer
 */
export function useGLSurface({
  renderMargin = '120px',
  mountMargin = '100% 0px',
  initiallyMounted = true,
}: GLSurfaceOptions = {}): GLSurface {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(true)
  const [mounted, setMounted] = useState(initiallyMounted)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const render = new IntersectionObserver(
      ([entry]) => { if (entry) setVisible(entry.isIntersecting) },
      { rootMargin: renderMargin }
    )
    const mount = new IntersectionObserver(
      ([entry]) => { if (entry) setMounted(entry.isIntersecting) },
      { rootMargin: mountMargin }
    )
    render.observe(el)
    mount.observe(el)
    return () => { render.disconnect(); mount.disconnect() }
  }, [initiallyMounted, renderMargin, mountMargin])

  return { ref, visible, mounted }
}
