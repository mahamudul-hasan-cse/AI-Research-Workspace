"use client";

import dynamic from "next/dynamic";
import { useCallback, useState, useSyncExternalStore } from "react";
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

type TopicExplorerProps = {
  graph?: ResearchTopicGraph;
};

export function TopicExplorer({ graph = DEMO_TOPIC_GRAPH }: TopicExplorerProps) {
  const reducedMotion = usePrefersReducedMotion();
  const [selectedId, setSelectedId] = useState(DEFAULT_SELECTED_NODE_ID);
  const [resetToken, setResetToken] = useState(0);
  const webglSupported = useWebGLSupport();

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
          disabled={webglSupported === false}
          aria-label="Reset 3D view to the default camera angle"
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm font-medium hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
        >
          Reset view
        </button>
        <p className="text-xs text-muted">
          Drag to orbit, scroll or pinch to zoom. Tap a sphere or use the list to select a node.
        </p>
      </div>

      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_min(100%,18rem)]">
        <div className="relative min-h-[min(50vh,22rem)] min-w-0 overflow-hidden rounded-card border border-border bg-surface-muted">
          {webglSupported === false ? (
            <TopicExplorerStaticFallback graph={graph} selectedId={selectedId} />
          ) : webglSupported === true ? (
            <TopicSceneCanvas
              graph={graph}
              selectedId={selectedId}
              onSelect={onSelect}
              reducedMotion={reducedMotion}
              resetToken={resetToken}
            />
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
