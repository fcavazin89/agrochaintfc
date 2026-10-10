'use client';
import { useRef, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import * as THREE from 'three';
import type { TraceNode } from '@/types/agrochain';

const STAGE_COLORS: Record<string, string> = {
  ORIGINATION: '#b8912a',
  BLOCKCHAIN:  '#1f6440',
  COMPLIANCE:  '#2f8f52',
  VALIDATION:  '#4a2f1c',
};

function NodeMesh({ node, position }: { node: TraceNode; position: [number, number, number] }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const color = STAGE_COLORS[node.stage] ?? '#1f6440';
  const isActive = node.status === 'ACTIVE';

  useFrame((state) => {
    if (meshRef.current && isActive) {
      meshRef.current.scale.setScalar(
        1 + Math.sin(state.clock.elapsedTime * 3) * 0.1,
      );
    }
  });

  return (
    <group position={position}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.25, 16, 16]} />
        <meshStandardMaterial
          color={color}
          opacity={node.status === 'PENDING' ? 0.4 : 1}
          transparent
          emissive={isActive ? color : '#000'}
          emissiveIntensity={isActive ? 0.3 : 0}
        />
      </mesh>
      <Text
        position={[0, -0.45, 0]}
        fontSize={0.18}
        color="#f3f7f2"
        anchorX="center"
        anchorY="middle"
      >
        {node.label}
      </Text>
    </group>
  );
}

function ConnectorLine({ from, to }: { from: [number, number, number]; to: [number, number, number] }) {
  const points = [new THREE.Vector3(...from), new THREE.Vector3(...to)];
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  return (
    <line geometry={geometry}>
      <lineBasicMaterial color="#2f8f52" opacity={0.6} transparent />
    </line>
  );
}

function ChainScene({ nodes }: { nodes: TraceNode[] }) {
  const spacing = 2.5;
  const positions: [number, number, number][] = nodes.map((_, i) => [
    (i - (nodes.length - 1) / 2) * spacing,
    0,
    0,
  ]);

  return (
    <>
      <ambientLight intensity={0.6} />
      <pointLight position={[0, 5, 5]} intensity={1} />
      {nodes.map((node, i) => (
        <NodeMesh key={node.id} node={node} position={positions[i]} />
      ))}
      {nodes.slice(0, -1).map((_, i) => (
        <ConnectorLine key={i} from={positions[i]} to={positions[i + 1]} />
      ))}
    </>
  );
}

interface TraceChainProps {
  nodes: TraceNode[];
}

export function TraceChain({ nodes }: TraceChainProps) {
  return (
    <div style={{width: '100%', height: '280px', borderRadius: '12px', overflow: 'hidden', background: '#0b1d12'}}>
      <Canvas camera={{position: [0, 0, 8], fov: 50}}>
        <Suspense fallback={null}>
          <ChainScene nodes={nodes} />
          <OrbitControls enableZoom={false} />
        </Suspense>
      </Canvas>
    </div>
  );
}
