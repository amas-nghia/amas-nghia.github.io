import * as THREE from 'three';
import { projects, type Project } from '../../data/projects';
import { ProjectStation } from './ProjectStation';
import { PlayerController } from './PlayerController';
import { VoxelWorld } from './VoxelWorld';

type PortfolioSceneProps = {
  activeProject: Project | null;
  nearestProject: Project | null;
  onNearestProjectChange: (project: Project | null) => void;
  onInspectProject: (project: Project) => void;
};

export function PortfolioScene({
  activeProject,
  nearestProject,
  onNearestProjectChange,
  onInspectProject
}: PortfolioSceneProps) {
  return (
    <>
      <color attach="background" args={['#d9e5e8']} />
      <fog attach="fog" args={['#d9e5e8', 26, 64]} />
      <hemisphereLight args={['#f7fbff', '#53636b', 1.45]} />
      <directionalLight
        position={[-12, 18, 10]}
        intensity={2.65}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-34}
        shadow-camera-right={34}
        shadow-camera-top={34}
        shadow-camera-bottom={-34}
      />

      <VoxelWorld />

      <group position={[0, 1.02, 0]}>
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[2.25, 2.65, 0.42, 48]} />
          <meshStandardMaterial color="#20252d" roughness={0.78} metalness={0.06} />
        </mesh>
        <mesh position={[0, 1.65, 0]} castShadow>
          <octahedronGeometry args={[0.72, 1]} />
          <meshStandardMaterial color="#2f7df6" emissive="#2f7df6" emissiveIntensity={0.35} roughness={0.38} />
        </mesh>
      </group>

      {projects.map((project) => (
        <ProjectStation key={project.id} project={project} active={activeProject?.id === project.id || nearestProject?.id === project.id} />
      ))}

      <PlayerController
        nearestProject={nearestProject}
        onNearestProjectChange={onNearestProjectChange}
        onInspectProject={onInspectProject}
      />
    </>
  );
}

THREE.ColorManagement.enabled = true;
