'use client';
import { useRef, useState, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import type { FarmPoint } from '@/types/agrochain';

const MOCK_FARMS: FarmPoint[] = [
  { id: '1', name: 'Fazenda São Benedito', lat: -21.7, lng: -45.8, type: 'Coffee', certCount: 12 },
  { id: '2', name: 'Fazenda Esperança', lat: -19.2, lng: -46.3, type: 'Cacao', certCount: 8 },
  { id: '3', name: 'Sítio Boa Vista', lat: -15.6, lng: -47.1, type: 'Coffee', certCount: 5 },
  { id: '4', name: 'Fazenda Bela Aurora', lat: -22.9, lng: -43.2, type: 'Cacao', certCount: 15 },
  { id: '5', name: 'Hacienda Verde', lat: -12.3, lng: -38.5, type: 'Coffee', certCount: 9 },
  { id: '6', name: 'Fazenda Cacaueiro', lat: -14.8, lng: -39.0, type: 'Cacao', certCount: 20 },
];

function latLngToXYZ(lat: number, lng: number, radius: number): [number, number, number] {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return [
    -(radius * Math.sin(phi) * Math.cos(theta)),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  ];
}

function GlobeMesh({ onFarmClick }: { onFarmClick: (farm: FarmPoint) => void }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.15;
    }
  });

  const farmPositions = MOCK_FARMS.map(f => ({
    farm: f,
    pos: latLngToXYZ(f.lat, f.lng, 1.02),
  }));

  return (
    <group ref={groupRef}>
      {/* Wireframe globe */}
      <mesh>
        <sphereGeometry args={[1, 24, 24]} />
        <meshBasicMaterial color="#1f6440" wireframe opacity={0.4} transparent />
      </mesh>
      {/* Solid inner sphere */}
      <mesh>
        <sphereGeometry args={[0.98, 24, 24]} />
        <meshBasicMaterial color="#0b1d12" opacity={0.3} transparent />
      </mesh>
      {/* Farm points */}
      {farmPositions.map(({ farm, pos }) => (
        <mesh
          key={farm.id}
          position={pos}
          onClick={(e) => { e.stopPropagation(); onFarmClick(farm); }}
        >
          <sphereGeometry args={[0.028, 8, 8]} />
          <meshBasicMaterial
            color={farm.type === 'Coffee' ? '#b8912a' : '#4a2f1c'}
          />
        </mesh>
      ))}
    </group>
  );
}

export function FarmGlobe() {
  const [selectedFarm, setSelectedFarm] = useState<FarmPoint | null>(null);

  return (
    <div style={{width: '100%', height: '400px', borderRadius: '12px', overflow: 'hidden', background: '#0b1d12'}}>
      <Canvas camera={{position: [0, 0, 2.5], fov: 50}}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        <Suspense fallback={null}>
          <GlobeMesh onFarmClick={setSelectedFarm} />
          <OrbitControls enableZoom={false} />
          {selectedFarm && (
            <Html
              position={latLngToXYZ(selectedFarm.lat, selectedFarm.lng, 1.2)}
            >
              <div
                style={{background: '#0b1d12',
                  border: '1px solid #b8912a',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  color: '#f3f7f2',
                  fontSize: '12px',
                  minWidth: '160px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.4)',}}
                onClick={() => setSelectedFarm(null)}
              >
                <strong style={{color: '#b8912a'}}>{selectedFarm.name}</strong>
                <br />
                <span>{selectedFarm.type === 'Coffee' ? '☕' : '🍫'} {selectedFarm.type}</span>
                <br />
                <span>🏆 {selectedFarm.certCount} certificações</span>
              </div>
            </Html>
          )}
        </Suspense>
      </Canvas>
    </div>
  );
}
