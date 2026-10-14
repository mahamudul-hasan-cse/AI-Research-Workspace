"use client";

import { useEffect, useRef } from "react";
import { startSignalField } from "@/lib/shader/signal-field-renderer";
import { usePrefersReducedMotion } from "@/lib/visualize/use-prefers-reduced-motion";

/**
 * Decorative WebGL background for the home hero. It steers from pointer
 * movement over the nearest `[data-signal-field-host]` element and reports
 * its state in `data-state` (animating, paused, static or unsupported).
 */
export function SignalFieldCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = canvas?.closest<HTMLElement>("[data-signal-field-host]");
    if (!canvas || !host) return;
    return startSignalField(canvas, {
      pointerTarget: host,
      reducedMotion,
      onStateChange: (state) => {
        canvas.dataset.state = state;
      },
    });
  }, [reducedMotion]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="absolute inset-0 h-full w-full opacity-0 transition-opacity duration-700 data-[ready=true]:opacity-100 motion-reduce:transition-none"
    />
  );
}
