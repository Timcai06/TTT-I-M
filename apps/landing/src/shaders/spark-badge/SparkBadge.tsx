import { useCallback, useEffect, useRef, useState } from "react";
import { useGLSurface } from "../../lib/webgl/useGLSurface";
import {
  resolveSparkBadgeSource,
  SPARK_BADGE_DEFAULTS,
  type SparkBadgeVariant,
} from "./sparkBadgeSource";

export { SPARK_BADGE_DEFAULTS, type SparkBadgeVariant } from "./sparkBadgeSource";

export type SparkBadgeProps = {
  className?: string;
  keepMounted?: boolean;
  particleAmount?: number;
  rainAmount?: number;
  sourceUrl?: string;
  speed?: number;
  spread?: number;
  turbulence?: number;
  variant?: SparkBadgeVariant;
};

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

const VARIANT_TITLES: Record<SparkBadgeVariant, string> = {
  badge: "Animated credential badge in rain",
  browser: "Animated browser interface in rain",
  iphone: "Animated iPhone interface in rain",
  "studio-display": "Animated studio display workspace in rain",
};

export function SparkBadge({
  className = "",
  keepMounted = false,
  particleAmount = SPARK_BADGE_DEFAULTS.particleAmount,
  rainAmount = SPARK_BADGE_DEFAULTS.rainAmount,
  sourceUrl = "/spark-badge.html",
  speed = SPARK_BADGE_DEFAULTS.speed,
  spread = SPARK_BADGE_DEFAULTS.spread,
  turbulence = SPARK_BADGE_DEFAULTS.turbulence,
  variant = "badge",
}: SparkBadgeProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [frameElement, setFrameElement] = useState<HTMLIFrameElement | null>(null);
  const { ref: hostRef, visible: active, mounted } = useGLSurface({
    renderMargin: "80px",
    mountMargin: keepMounted ? "140% 0px" : "80px",
    initiallyMounted: false,
  });
  const [readyFrame, setReadyFrame] = useState<{
    source: string;
    frame: HTMLIFrameElement;
  } | null>(null);
  const frameSource = resolveSparkBadgeSource(sourceUrl, variant);
  const ready = mounted
    && readyFrame?.source === frameSource
    && readyFrame.frame === frameElement;
  const safeSpeed = clamp(speed, 0, 2);
  const safeParticleAmount = clamp(particleAmount, 0.08, 1.4);
  const safeRainAmount = clamp(rainAmount, 0, 1.5);
  const safeTurbulence = clamp(turbulence, 0, 2);
  const safeSpread = clamp(spread, 0.5, 1.75);
  const postControls = useCallback(() => {
    iframeRef.current?.contentWindow?.postMessage({
      type: "spark-badge-controls",
      controls: {
        speed: safeSpeed,
        particleAmount: safeParticleAmount,
        rainAmount: safeRainAmount,
        turbulence: safeTurbulence,
        spread: safeSpread,
      },
    }, "*");
  }, [safeParticleAmount, safeRainAmount, safeSpeed, safeSpread, safeTurbulence]);
  const postActivity = useCallback((nextActive: boolean) => {
    iframeRef.current?.contentWindow?.postMessage({
      type: "spark-badge-activity",
      active: nextActive,
    }, "*");
  }, []);
  const assignFrame = useCallback((frame: HTMLIFrameElement | null) => {
    iframeRef.current = frame;
    setFrameElement(frame);
  }, []);

  useEffect(() => {
    postActivity(active && mounted);
  }, [active, mounted, postActivity]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow) return;
      const data: unknown = event.data;
      if (
        typeof data === "object"
        && data !== null
        && "type" in data
        && data.type === "spark-badge-ready"
      ) {
        const frame = iframeRef.current;
        if (frame) setReadyFrame({ source: frameSource, frame });
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [frameSource]);

  useEffect(() => {
    postControls();
  }, [postControls]);

  return (
    <div
      ref={hostRef}
      className={`spark-badge${className ? ` ${className}` : ""}`}
      data-state={!mounted || !active ? "paused" : ready ? "ready" : "loading"}
      data-variant={variant}
    >
      {mounted ? (
        <iframe
          key={frameSource}
          ref={assignFrame}
          className={`spark-badge__frame${ready ? " is-ready" : ""}`}
          title={VARIANT_TITLES[variant]}
          src={frameSource}
          sandbox="allow-scripts"
          loading="eager"
          onLoad={() => {
            postControls();
            postActivity(active && mounted);
            iframeRef.current?.contentWindow?.postMessage({
              type: "spark-badge-ready-request",
            }, "*");
          }}
        />
      ) : null}
    </div>
  );
}
