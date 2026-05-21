import { Canvas } from '@react-three/fiber';
import { Suspense, useCallback, useState } from 'react';
import { CityScene, type CvPoi } from './scene/CityScene';

export function App() {
  const [nearbyPoi, setNearbyPoi] = useState<CvPoi | null>(null);
  const [activePoi, setActivePoi] = useState<CvPoi | null>(null);
  const openPoi = useCallback((poi: CvPoi) => setActivePoi(poi), []);

  return (
    <main className="app-shell">
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [9, 8, 9], fov: 45, near: 0.1, far: 120 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
      >
        <Suspense fallback={null}>
          <CityScene onNearbyPoiChange={setNearbyPoi} onOpenPoi={openPoi} />
        </Suspense>
      </Canvas>
      <div className="overlay cv-overlay">
        <div className={`prompt ${nearbyPoi && !activePoi ? 'is-visible' : ''}`}>Nhấn E để xem {nearbyPoi?.title}</div>
        <section className={`project-panel ${activePoi ? 'is-open' : ''}`}>
          {activePoi ? (
            <>
              <button className="close-button" type="button" aria-label="Close CV panel" onClick={() => setActivePoi(null)}>
                x
              </button>
              <p className="panel-label">CV checkpoint</p>
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
            </>
          ) : null}
        </section>
      </div>
    </main>
  );
}
