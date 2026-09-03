/* eslint-disable react-refresh/only-export-components, react-hooks/set-state-in-effect */
import { useCallback, useEffect, useRef, useState } from "react";

export type SparkBadgeVariant = "badge" | "browser" | "iphone" | "studio-display";

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

export const SPARK_BADGE_DEFAULTS = {
  speed: 1,
  particleAmount: 1,
  rainAmount: 1,
  turbulence: 1,
  spread: 1,
} as const;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function sourceForVariant(sourceUrl: string, variant: SparkBadgeVariant) {
  if (variant === "badge") return sourceUrl;
  const hashIndex = sourceUrl.indexOf("#");
  const path = hashIndex === -1 ? sourceUrl : sourceUrl.slice(0, hashIndex);
  const hash = hashIndex === -1 ? "" : sourceUrl.slice(hashIndex);
  return `${path}${path.includes("?") ? "&" : "?"}variant=${variant}${hash}`;
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
  const hostRef = useRef<HTMLDivElement>(null);
  const intersectsRef = useRef(true);
  const [mounted, setMounted] = useState(true);
  const [active, setActive] = useState(true);
  const [ready, setReady] = useState(false);
  const frameSource = sourceForVariant(sourceUrl, variant);
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

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const sync = () => {
      const nextActive = intersectsRef.current && document.visibilityState !== "hidden";
      setActive(nextActive);
      setMounted(keepMounted || nextActive);
      postActivity(nextActive);
    };
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry) return;
      intersectsRef.current = entry.isIntersecting;
      sync();
    }, { rootMargin: keepMounted ? "140% 0px" : "80px" });

    observer.observe(host);
    document.addEventListener("visibilitychange", sync);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", sync);
    };
  }, [keepMounted, postActivity]);

  useEffect(() => {
    if (!mounted) setReady(false);
  }, [mounted]);

  useEffect(() => setReady(false), [frameSource]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow) return;
      const data: unknown = event.data;
      if (
        typeof data === "object"
        && data !== null
        && "type" in data
        && data.type === "spark-badge-ready"
      ) setReady(true);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

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
          ref={iframeRef}
          className={`spark-badge__frame${ready ? " is-ready" : ""}`}
          title={VARIANT_TITLES[variant]}
          src={frameSource}
          sandbox="allow-scripts"
          loading="eager"
          onLoad={() => {
            postControls();
            postActivity(active);
            iframeRef.current?.contentWindow?.postMessage({
              type: "spark-badge-ready-request",
            }, "*");
          }}
        />
      ) : null}
    </div>
  );
}
