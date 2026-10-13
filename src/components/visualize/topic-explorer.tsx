"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import {
  DEFAULT_SELECTED_NODE_ID,
  DEMO_TOPIC_GRAPH,
  type ResearchTopicGraph,
} from "@/lib/visualize/topic-graph-data";
import { usePrefersReducedMotion } from "@/lib/visualize/use-prefers-reduced-motion";
import { detectWebGLSupport } from "@/lib/visualize/webgl-support";
import { TopicExplorerCanvasShell } from "./topic-explorer-canvas-shell";
import { TopicExplorerPanel } from "./topic-explorer-panel";
import { TopicExplorerStaticFallback } from "./topic-explorer-static-fallback";

function useWebGLSupport(): boolean | null {
  return useSyncExternalStore(
    () => () => {},
    () => detectWebGLSupport(),
    () => null,
  );
}

const TopicSceneCanvas = dynamic(() => import("./topic-scene-canvas"), {
  ssr: false,
  loading: () => <TopicExplorerCanvasShell loading />,
});

/** Defers the heavy Three.js bundle until after first paint / idle time. */
function useDeferredCanvasMount(enabled: boolean) {
  const [idleReady, setIdleReady] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const start = () => {
      if (!cancelled) setIdleReady(true);
    };
    const idleId =
      typeof requestIdleCallback !== "undefined"
        ? requestIdleCallback(start, { timeout: 1800 })
        : undefined;
    const timerId = idleId === undefined ? window.setTimeout(start, 120) : undefined;
    return () => {
      cancelled = true;
      if (idleId !== undefined) cancelIdleCallback(idleId);
      if (timerId !== undefined) window.clearTimeout(timerId);
    };
  }, [enabled]);
  return enabled && idleReady;
}

type TopicExplorerProps = {
  graph?: ResearchTopicGraph;
};

export function TopicExplorer({ graph = DEMO_TOPIC_GRAPH }: TopicExplorerProps) {
  const reducedMotion = usePrefersReducedMotion();
  const [selectedId, setSelectedId] = useState(DEFAULT_SELECTED_NODE_ID);
  const [resetToken, setResetToken] = useState(0);
  const [view3dRequested, setView3dRequested] = useState(false);
  const webglSupported = useWebGLSupport();
  const canvasReady = useDeferredCanvasMount(webglSupported === true && view3dRequested);

  const onSelect = useCallback((id: string) => {
    setSelectedId(id);
  }, []);

  const resetView = useCallback(() => {
    setResetToken((value) => value + 1);
  }, []);

  return (
    <section aria-label="3D Research Topic Explorer" className="min-w-0 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={resetView}
          disabled={webglSupported === false || !view3dRequested}
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm font-medium hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
        >
          Reset view
        </button>
        {webglSupported === true && !view3dRequested ? (
          <button
            type="button"
            onClick={() => setView3dRequested(true)}
            className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-accent-foreground hover:opacity-90"
          >
            Show 3D view
          </button>
        ) : null}
        <p className="text-xs text-muted">
          Drag to orbit, scroll or pinch to zoom. Tap a sphere or use the list to select a node.
        </p>
      </div>

      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_min(100%,18rem)]">
        <div className="relative min-h-[min(50vh,22rem)] min-w-0 overflow-hidden rounded-card border border-border bg-surface-muted">
          {webglSupported === false ? (
            <TopicExplorerStaticFallback graph={graph} selectedId={selectedId} />
          ) : webglSupported === true && view3dRequested && canvasReady ? (
            <TopicSceneCanvas
              graph={graph}
              selectedId={selectedId}
              onSelect={onSelect}
              reducedMotion={reducedMotion}
              resetToken={resetToken}
            />
          ) : webglSupported === true && view3dRequested ? (
            <TopicExplorerCanvasShell loading />
          ) : webglSupported === true ? (
            <div className="flex h-full min-h-[min(50vh,22rem)] flex-col items-center justify-center gap-3 px-4 text-center">
              <p className="text-sm font-medium">3D view loads on demand</p>
              <p className="max-w-sm text-xs text-muted">
                Open the interactive scene when you want to orbit the graph. The node list stays
                fully usable without loading Three.js.
              </p>
            </div>
          ) : (
            <TopicExplorerCanvasShell />
          )}
        </div>

        <TopicExplorerPanel
          graph={graph}
          selectedId={selectedId}
          onSelect={onSelect}
          reducedMotion={reducedMotion}
          webglUnavailable={webglSupported === false}
        />
      </div>
    </section>
  );
}
