"use client";

import { Line, OrbitControls } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { nodeColor, nodeRadius } from "@/lib/visualize/node-appearance";
import type { ResearchGraphNode, ResearchTopicGraph } from "@/lib/visualize/topic-graph-data";

const INITIAL_CAMERA: [number, number, number] = [0, 2.8, 9.5];
const INITIAL_TARGET: [number, number, number] = [0, 0, 0];

type TopicGraphSceneProps = {
  graph: ResearchTopicGraph;
  selectedId: string;
  onSelect: (id: string) => void;
  reducedMotion: boolean;
  resetToken: number;
};

function ResearchNodeMesh({
  node,
  selected,
  onSelect,
}: {
  node: ResearchGraphNode;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const radius = nodeRadius(node.kind);
  const scale = selected ? 1.22 : 1;

  return (
    <group position={node.position}>
      <mesh
        scale={scale}
        onClick={(event) => {
          event.stopPropagation();
          onSelect(node.id);
        }}
        onPointerOver={(event) => {
          event.stopPropagation();
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          document.body.style.cursor = "";
        }}
      >
        <sphereGeometry args={[radius, 20, 20]} />
        <meshStandardMaterial color={nodeColor(node.kind)} roughness={0.45} metalness={0.08} />
      </mesh>
      {selected ? (
        <mesh rotation={[Math.PI / 2, 0, 0]} scale={1.35}>
          <torusGeometry args={[radius * 1.15, 0.04, 8, 32]} />
          <meshBasicMaterial color="#f8fafc" transparent opacity={0.95} />
        </mesh>
      ) : null}
    </group>
  );
}

function CameraReset({ resetToken, reducedMotion }: { resetToken: number; reducedMotion: boolean }) {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const { camera } = useThree();

  useEffect(() => {
    camera.position.set(...INITIAL_CAMERA);
    const controls = controlsRef.current;
    if (controls) {
      controls.target.set(...INITIAL_TARGET);
      controls.update();
    }
  }, [resetToken, camera]);

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping={!reducedMotion}
      dampingFactor={reducedMotion ? 0 : 0.08}
      rotateSpeed={reducedMotion ? 0.65 : 1}
      minDistance={4}
      maxDistance={16}
      maxPolarAngle={Math.PI * 0.49}
    />
  );
}

export function TopicGraphScene({
  graph,
  selectedId,
  onSelect,
  reducedMotion,
  resetToken,
}: TopicGraphSceneProps) {
  const central = graph.nodes.find((node) => node.kind === "topic");
  const satellites = graph.nodes.filter((node) => node.kind !== "topic");

  const edgeSegments = useMemo(() => {
    if (!central) return [];
    return satellites.map((node) => ({
      id: node.id,
      points: [central.position, node.position] as [[number, number, number], [number, number, number]],
    }));
  }, [central, satellites]);

  return (
    <>
      <color attach="background" args={["#0f172a"]} />
      <ambientLight intensity={0.55} />
      <directionalLight position={[4, 6, 3]} intensity={1.1} />
      <directionalLight position={[-3, 2, -4]} intensity={0.35} />

      {edgeSegments.map((edge) => (
        <Line
          key={edge.id}
          points={edge.points}
          color="#94a3b8"
          lineWidth={1}
          transparent
          opacity={0.65}
        />
      ))}

      {graph.nodes.map((node) => (
        <ResearchNodeMesh
          key={node.id}
          node={node}
          selected={node.id === selectedId}
          onSelect={onSelect}
        />
      ))}

      <CameraReset resetToken={resetToken} reducedMotion={reducedMotion} />
    </>
  );
}
