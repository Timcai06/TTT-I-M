import { useEffect, useRef, useState } from 'react'
import NumberFlow from '@number-flow/react'
import type { ProjectMetric } from '../../content'

interface ProjectMetricsProps {
  metrics: readonly ProjectMetric[]
}

function formatMetric(metric: ProjectMetric): string {
  return `${metric.prefix ?? ''}${metric.value.toFixed(metric.precision ?? 0)}${metric.suffix ?? ''}`
}

export default function ProjectMetrics({ metrics }: ProjectMetricsProps) {
  const root = useRef<HTMLDListElement>(null)
  const [visible, setVisible] = useState(() => typeof IntersectionObserver === 'undefined')

  useEffect(() => {
    if (!root.current) return
    if (typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return
        setVisible(true)
        observer.disconnect()
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.25 },
    )
    observer.observe(root.current)
    return () => observer.disconnect()
  }, [])

  return (
    <dl className="project-metrics" ref={root} aria-label="项目量化证据">
      {metrics.map((metric) => (
        <div className="project-metric" key={`${metric.label}:${metric.value}`}>
          <dt>{metric.label}</dt>
          <dd title={metric.evidence}>
            <span aria-hidden="true">
              <NumberFlow
                value={visible ? metric.value : 0}
                prefix={metric.prefix}
                suffix={metric.suffix}
                format={{
                  minimumFractionDigits: metric.precision ?? 0,
                  maximumFractionDigits: metric.precision ?? 0,
                }}
                respectMotionPreference
              />
            </span>
            <span className="project-metric__sr">
              {metric.label}：{formatMetric(metric)}。{metric.evidence}
            </span>
          </dd>
        </div>
      ))}
    </dl>
  )
}
