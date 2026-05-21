import { Canvas } from '@react-three/fiber';
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { profile } from '../data/profile';
import { CityScene, type CvPoi } from './scene/CityScene';

const CHECKPOINT_COUNT = 5;

export function App() {
  const [nearbyPoi, setNearbyPoi] = useState<CvPoi | null>(null);
  const [activePoi, setActivePoi] = useState<CvPoi | null>(null);
  const [visitedPois, setVisitedPois] = useState<Set<string>>(() => new Set());
  const [toast, setToast] = useState<CvPoi | null>(null);
  const [introOpen, setIntroOpen] = useState(true);
  const visitedCount = visitedPois.size;
  const progressPips = useMemo(() => Array.from({ length: CHECKPOINT_COUNT }, (_, index) => index < visitedCount), [visitedCount]);
  const openPoi = useCallback(
    (poi: CvPoi) => {
      setActivePoi(poi);
      setIntroOpen(false);
      if (!visitedPois.has(poi.id)) setToast(poi);
      setVisitedPois((current) => new Set(current).add(poi.id));
    },
    [visitedPois]
  );

  useEffect(() => {
    if (!toast) return undefined;
    const timeout = window.setTimeout(() => setToast(null), 2400);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  return (
    <main className="app-shell">
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [9, 8, 9], fov: 45, near: 0.1, far: 120 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => {
          gl.outputColorSpace = THREE.SRGBColorSpace;
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.08;
          gl.shadowMap.enabled = true;
          gl.shadowMap.type = THREE.PCFSoftShadowMap;
        }}
      >
        <Suspense fallback={null}>
          <CityScene onNearbyPoiChange={setNearbyPoi} onOpenPoi={openPoi} />
        </Suspense>
      </Canvas>
      <div className="overlay cv-overlay">
        <header className="profile-hud">
          <p className="panel-label">Playable CV City</p>
          <h1>{profile.name}</h1>
          <p className="role-line">{profile.title}</p>
          <p className="profile-summary">{profile.summary}</p>
          <nav className="profile-actions" aria-label="Profile links">
            <a href={profile.cvPath}>CV</a>
            <a href={profile.linkedIn} target="_blank" rel="noreferrer">
              LinkedIn
            </a>
            <a href={profile.github} target="_blank" rel="noreferrer">
              GitHub
            </a>
          </nav>
        </header>

        <section className={`intro-card ${introOpen ? 'is-open' : ''}`} aria-label="Portfolio objective">
          <button className="mini-close" type="button" aria-label="Hide intro" onClick={() => setIntroOpen(false)}>
            X
          </button>
          <p className="panel-label">Objective</p>
          <h2>Drive through the CV checkpoints</h2>
          <p>Explore marked buildings to reveal Unity gameplay, optimization, multiplayer, and production experience.</p>
        </section>

        <div className="control-strip" aria-label="Driving controls">
          <span>A / D: switch lane</span>
          <span>E: inspect marker</span>
        </div>

        <aside className="progress-log" aria-label="Checkpoint progress">
          <p className="panel-label">Discovery log</p>
          <div className="progress-row">
            {progressPips.map((isActive, index) => (
              <span key={index} className={isActive ? 'is-active' : ''} />
            ))}
          </div>
          <strong>
            {visitedCount}/{CHECKPOINT_COUNT} checkpoints inspected
          </strong>
        </aside>

        <div className={`achievement-toast ${toast ? 'is-visible' : ''}`} role="status">
          <span>Checkpoint discovered</span>
          <strong>{toast?.title}</strong>
        </div>

        <button
          className={`prompt ${nearbyPoi && !activePoi ? 'is-visible' : ''}`}
          type="button"
          onClick={() => nearbyPoi && setActivePoi(nearbyPoi)}
        >
          Press E to inspect {nearbyPoi?.title}
        </button>

        <section className={`project-panel ${activePoi ? 'is-open' : ''}`}>
          {activePoi ? (
            <>
              <button className="close-button" type="button" aria-label="Close CV panel" onClick={() => setActivePoi(null)}>
                X
              </button>
              <p className="panel-label">
                CV checkpoint - {Math.max(1, Array.from(visitedPois).indexOf(activePoi.id) + 1).toString().padStart(2, '0')}
              </p>
              <h2>{activePoi.title}</h2>
              <p className="project-meta">{activePoi.meta}</p>
              <div className="project-tech">
                {activePoi.tech.map((item) => (
                  <span key={item}>{item}</span>
                ))}
              </div>
              <ul>
                {activePoi.bullets.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <div className="panel-actions">
                <a href={profile.cvPath}>Download CV</a>
                <a href={`mailto:${profile.email}`}>Contact</a>
              </div>
            </>
          ) : null}
        </section>
      </div>
    </main>
  );
}
