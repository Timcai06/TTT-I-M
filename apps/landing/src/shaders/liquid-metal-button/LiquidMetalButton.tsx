import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { preloadLiquidMetalButtonSource } from "./liquidMetalSource";
import {
  buildLiquidMetalSource,
  clampLiquidMetalValue,
  type LiquidMetalButtonVariant,
} from "./liquidMetalAdapter";
import {
  acquireOptionalContextWhenAvailable,
  type ContextLease,
} from "../../lib/webgl/contextRegistry";

export type { LiquidMetalButtonVariant } from "./liquidMetalAdapter";

export type LiquidMetalButtonProps = {
  variant?: LiquidMetalButtonVariant;
  className?: string;
  rendering?: "colored" | "monotone";
  diameter?: number;
  strokeWidth?: number;
  text?: string;
  cursorLabel?: string;
  embedded?: boolean;
  onClick?: () => void;
};

export function LiquidMetalButton({
  className = "",
  variant = "pill",
  rendering = "colored",
  diameter = 88,
  strokeWidth = 3,
  text,
  cursorLabel,
  embedded = false,
  onClick,
}: LiquidMetalButtonProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [frameElement, setFrameElement] = useState<HTMLIFrameElement | null>(null);
  const contextLeaseRef = useRef<ContextLease | null>(null);
  const instanceId = useId();
  const intersectsRef = useRef(true);
  const [mounted, setMounted] = useState(
    () => typeof document === "undefined" || document.visibilityState !== "hidden",
  );
  const safeVariant: LiquidMetalButtonVariant =
    variant === "circle" || variant === "play" ? variant : "pill";
  const isPlayButton = safeVariant === "play";
  const safeText = String(text ?? (safeVariant === "pill" ? "Sign up" : safeVariant === "circle" ? "Add" : "Play"))
    .slice(0, 24);
  const pillWidthUnits = safeVariant === "pill"
    ? Math.min(3000, Math.max(1407, 820 + safeText.length * 94))
    : undefined;
  const sourceKey = `${safeVariant}:${safeText}`;
  const [sourceState, setSourceState] = useState<{
    key: string;
    source: string | null;
    failed: boolean;
  }>({ key: "", source: null, failed: false });
  const source = sourceState.key === sourceKey ? sourceState.source : null;
  const sourceFailed = sourceState.key === sourceKey && sourceState.failed;
  const [rendererState, setRendererState] = useState<{
    frame: HTMLIFrameElement;
    key: string;
    status: "ready" | "failed";
  } | null>(null);
  const rendererFailed = rendererState?.key === sourceKey && rendererState.status === "failed";
  const failed = sourceFailed || rendererFailed;
  const playConfig = useMemo(() => ({
    diameter: clampLiquidMetalValue(diameter, 72, 160, 88),
    strokeWidth: clampLiquidMetalValue(strokeWidth, 1, 8, 3),
    rendering,
    text: safeText,
  } as const), [diameter, rendering, safeText, strokeWidth]);
  const gpuRequest = useMemo(() => (
    mounted && source && !failed
      ? { key: sourceKey, owner: `liquid-metal:${safeVariant}:${instanceId}` }
      : null
  ), [failed, instanceId, mounted, safeVariant, source, sourceKey]);
  const [grantedRequest, setGrantedRequest] = useState<typeof gpuRequest>(null);
  const gpuGranted = gpuRequest !== null && grantedRequest === gpuRequest;
  const ready = mounted
    && gpuGranted
    && rendererState?.key === sourceKey
    && rendererState.status === "ready"
    && rendererState.frame === frameElement;

  useEffect(() => {
    const controller = new AbortController();
    preloadLiquidMetalButtonSource(controller.signal).then((baseSource) => {
      if (controller.signal.aborted) return;
      setSourceState({
        key: sourceKey,
        failed: false,
        source: buildLiquidMetalSource(baseSource, safeVariant, safeText),
      });
    }).catch(() => {
      if (controller.signal.aborted) return;
      setSourceState({ key: sourceKey, source: null, failed: true });
    });
    return () => controller.abort(new Error("Liquid Metal source consumer detached"));
  }, [safeText, safeVariant, sourceKey]);

  const syncButtonConfig = useCallback(() => {
    frameRef.current?.contentWindow?.postMessage({
      liquidMetalButton: { text: safeText, pillWidthUnits, embedded, rendering },
    }, "*");
  }, [embedded, pillWidthUnits, rendering, safeText]);

  const syncPlayConfig = useCallback(() => {
    if (!isPlayButton) return;
    frameRef.current?.contentWindow?.postMessage({ liquidMetalPlayButton: playConfig }, "*");
  }, [isPlayButton, playConfig]);
  const assignFrame = useCallback((frame: HTMLIFrameElement | null) => {
    frameRef.current = frame;
    setFrameElement(frame);
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const sync = () => setMounted(intersectsRef.current && document.visibilityState !== "hidden");
    const observer = typeof IntersectionObserver === "undefined"
      ? null
      : new IntersectionObserver(([entry]) => {
        if (!entry) return;
        intersectsRef.current = entry.isIntersecting;
        sync();
      }, { rootMargin: "80px" });

    observer?.observe(host);
    document.addEventListener("visibilitychange", sync);
    return () => {
      observer?.disconnect();
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);

  useEffect(() => {
    if (!gpuRequest) return;
    let active = true;

    const stopWaiting = acquireOptionalContextWhenAvailable(
      gpuRequest.owner,
      (lease) => {
        if (!active) {
          lease.release();
          return;
        }
        contextLeaseRef.current = lease;
        queueMicrotask(() => {
          if (active && contextLeaseRef.current === lease) setGrantedRequest(gpuRequest);
        });
      },
    );

    return () => {
      active = false;
      stopWaiting();
      const lease = contextLeaseRef.current;
      contextLeaseRef.current = null;
      lease?.release();
    };
  }, [gpuRequest]);

  useEffect(() => {
    if (!mounted || ready || !source || failed || !gpuGranted) return;

    const syncPendingFrame = () => {
      syncButtonConfig();
      syncPlayConfig();
    };
    syncPendingFrame();
    const retry = window.setInterval(syncPendingFrame, 90);
    const deadline = window.setTimeout(() => {
      const frameWindow = frameRef.current?.contentWindow;
      const frame = frameRef.current;
      if (frameWindow && frame) {
        setRendererState({ frame, key: sourceKey, status: "failed" });
      }
    }, 3_000);
    return () => {
      window.clearInterval(retry);
      window.clearTimeout(deadline);
    };
  }, [failed, gpuGranted, mounted, ready, source, sourceKey, syncButtonConfig, syncPlayConfig]);

  useEffect(() => {
    if (!ready) return;
    syncButtonConfig();
    syncPlayConfig();
  }, [ready, syncButtonConfig, syncPlayConfig]);

  useEffect(() => {
    const receiveMessage = (event: MessageEvent) => {
      if (event.source !== frameRef.current?.contentWindow) return;
      const data = event.data as unknown;
      if (!data || typeof data !== "object") return;
      const message = (data as { liquidMetalButton?: unknown }).liquidMetalButton;
      if (!message || typeof message !== "object") return;
      const type = (message as { type?: unknown }).type;
      if (type === "bridge-ready") {
        syncButtonConfig();
        syncPlayConfig();
      }
      if (type === "renderer-ready") {
        const frame = frameRef.current;
        if (frame) setRendererState({ frame, key: sourceKey, status: "ready" });
        syncButtonConfig();
        syncPlayConfig();
      }
      if (type === "renderer-failed") {
        const frame = frameRef.current;
        if (frame) setRendererState({ frame, key: sourceKey, status: "failed" });
      }
      if (type === "activate") onClick?.();
      if (type === "pointer-bridge") {
        const frame = frameRef.current;
        const host = hostRef.current;
        if (!frame || !host) return;
        const pointerMessage = message as {
          phase?: unknown;
          x?: unknown;
          y?: unknown;
          interactive?: unknown;
        };
        const frameRect = frame.getBoundingClientRect();
        const localX = typeof pointerMessage.x === "number" && Number.isFinite(pointerMessage.x) ? pointerMessage.x : 0;
        const localY = typeof pointerMessage.y === "number" && Number.isFinite(pointerMessage.y) ? pointerMessage.y : 0;
        window.dispatchEvent(new CustomEvent("portfolio:iframe-pointer", {
          detail: {
            phase: pointerMessage.phase === "leave" ? "leave" : "move",
            clientX: frameRect.left + localX,
            clientY: frameRect.top + localY,
            interactive: pointerMessage.interactive === true && Boolean(cursorLabel),
            target: host,
          },
        }));
      }
    };
    window.addEventListener("message", receiveMessage);
    return () => window.removeEventListener("message", receiveMessage);
  }, [cursorLabel, onClick, sourceKey, syncButtonConfig, syncPlayConfig]);

  return (
    <div
      ref={hostRef}
      className={`liquid-metal-button${className ? ` ${className}` : ""}`}
      data-state={!mounted
        ? "paused"
        : failed || (source !== null && !gpuGranted)
          ? "fallback"
          : ready
            ? "ready"
            : "loading"}
      data-variant={safeVariant}
      data-cursor-label={cursorLabel}
    >
      <button
        type="button"
        className="liquid-metal-button__fallback"
        aria-label={safeText}
        aria-hidden={ready ? "true" : undefined}
        disabled={ready || !onClick}
        tabIndex={ready ? -1 : undefined}
        onClick={onClick}
      >
        {safeText}
      </button>
      {mounted && source && gpuGranted && !failed ? (
        <iframe
          key={`${sourceKey}:${source.length}`}
          ref={assignFrame}
          className={`liquid-metal-button__frame${ready ? " is-ready" : ""}`}
          title={safeVariant === "circle"
            ? "Interactive liquid metal circle button"
            : isPlayButton
              ? "Interactive liquid metal play button"
              : "Interactive liquid metal button"}
          srcDoc={source}
          sandbox="allow-scripts"
          loading="eager"
          referrerPolicy="no-referrer"
          onLoad={() => {
            syncButtonConfig();
            syncPlayConfig();
          }}
        />
      ) : null}
    </div>
  );
}
