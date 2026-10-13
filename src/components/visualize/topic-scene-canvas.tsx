"use client";

import { Canvas } from "@react-three/fiber";
import type { ResearchTopicGraph } from "@/lib/visualize/topic-graph-data";
import { TopicGraphScene } from "./topic-graph-scene";

export type TopicSceneCanvasProps = {
  graph: ResearchTopicGraph;
  selectedId: string;
  onSelect: (id: string) => void;
  reducedMotion: boolean;
  resetToken: number;
};

export default function TopicSceneCanvas({
  graph,
  selectedId,
  onSelect,
  reducedMotion,
  resetToken,
}: TopicSceneCanvasProps) {
  return (
    <Canvas
      className="h-full w-full touch-none"
      dpr={[1, 1.75]}
      camera={{ position: [0, 2.8, 9.5], fov: 48, near: 0.1, far: 40 }}
      gl={{ antialias: true, alpha: false, powerPreference: "default" }}
    >
      <TopicGraphScene
        graph={graph}
        selectedId={selectedId}
        onSelect={onSelect}
        reducedMotion={reducedMotion}
        resetToken={resetToken}
      />
    </Canvas>
  );
}
