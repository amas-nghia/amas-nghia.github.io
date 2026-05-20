import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import type { Project } from '../../data/projects';

type ProjectStationProps = {
  project: Project;
  active: boolean;
};

export function ProjectStation({ project, active }: ProjectStationProps) {
  const ringRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (ringRef.current) {
      const elapsed = clock.elapsedTime;
      ringRef.current.rotation.z = elapsed * (active ? 1.55 : 0.5);
      ringRef.current.scale.setScalar(active ? 1.08 + Math.sin(elapsed * 5) * 0.025 : 1);
    }
    if (groupRef.current) {
      groupRef.current.lookAt(0, groupRef.current.position.y, 0);
    }
  });

  return (
    <group ref={groupRef} position={project.position}>
      <mesh position={[0, 0.2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.35, 1.55, 0.38, 32]} />
        <meshStandardMaterial color={project.color} roughness={0.55} metalness={0.06} />
      </mesh>
      <mesh position={[0, 1.05, 0]} castShadow>
        <boxGeometry args={[1.1, 1.5, 0.16]} />
        <meshStandardMaterial color="#1e2128" roughness={0.76} />
      </mesh>
      <mesh position={[0, 1.16, -0.1]} castShadow>
        <boxGeometry args={[1.02, 0.72, 0.05]} />
        <meshStandardMaterial color={project.color} emissive={project.color} emissiveIntensity={0.18} roughness={0.36} />
      </mesh>
      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
        <torusGeometry args={[1.72, 0.025, 8, 64]} />
        <meshBasicMaterial color={project.color} transparent opacity={0.72} />
      </mesh>
    </group>
  );
}
