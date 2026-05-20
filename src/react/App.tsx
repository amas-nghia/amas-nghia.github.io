import { Canvas } from '@react-three/fiber';
import { Suspense, useState } from 'react';
import { ProjectsHud } from './hud/ProjectsHud';
import { PortfolioScene } from './scene/PortfolioScene';
import type { Project } from '../data/projects';

export function App() {
  const [nearestProject, setNearestProject] = useState<Project | null>(null);
  const [activeProject, setActiveProject] = useState<Project | null>(null);

  return (
    <main className="app-shell">
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [0, 9.2, 14.5], fov: 50, near: 0.1, far: 140 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
      >
        <Suspense fallback={null}>
          <PortfolioScene
            activeProject={activeProject}
            nearestProject={nearestProject}
            onNearestProjectChange={setNearestProject}
            onInspectProject={setActiveProject}
          />
        </Suspense>
      </Canvas>

      <ProjectsHud
        nearestProject={nearestProject}
        activeProject={activeProject}
        onCloseProject={() => setActiveProject(null)}
      />
    </main>
  );
}
