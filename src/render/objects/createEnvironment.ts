import * as THREE from 'three';
import type { Project } from '../../data/projects';

export type EnvironmentObject = {
  group: THREE.Group;
  animated: THREE.Object3D[];
  update: (elapsed: number) => void;
};

type EnvironmentOptions = {
  projects: Project[];
};

const palette = {
  ground: '#e9eee8',
  path: '#cfd8d1',
  pathDark: '#9aa9a2',
  plinth: '#20252d',
  metal: '#333942',
  glass: '#8ad7ff',
  gold: '#f4b860',
  foliage: '#4f8f6b',
  foliageDark: '#2f624a',
  stone: '#bcc7c3'
};

export function createEnvironment({ projects }: EnvironmentOptions): EnvironmentObject {
  const group = new THREE.Group();
  group.name = 'PortfolioEnvironment';

  const animated: THREE.Object3D[] = [];

  const island = createIsland();
  group.add(island);

  const center = createCentralHub();
  group.add(center);
  animated.push(center.userData.beacon as THREE.Object3D);

  group.add(createPathNetwork(projects));
  group.add(createOuterRing());
  group.add(createSkillColumns());
  group.add(createExperienceGate());
  group.add(createFoliageCluster(-17, -12, 1.1));
  group.add(createFoliageCluster(18, 11, 0.92));
  group.add(createFoliageCluster(-18, 13, 0.78));
  group.add(createFoliageCluster(16, -14, 1.02));
  group.add(createFloatingGlyphs(animated));

  return {
    group,
    animated,
    update(elapsed: number) {
      const beacon = center.userData.beacon as THREE.Object3D;
      beacon.rotation.y = elapsed * 0.72;
      beacon.position.y = 2.45 + Math.sin(elapsed * 1.6) * 0.12;

      animated.forEach((object, index) => {
        if (object === beacon) {
          return;
        }
        object.rotation.y += 0.003 + index * 0.0003;
        object.position.y = (object.userData.baseY as number) + Math.sin(elapsed * 1.2 + index) * 0.08;
      });
    }
  };
}

function createIsland(): THREE.Group {
  const group = new THREE.Group();
  const ground = new THREE.Mesh(
    new THREE.CylinderGeometry(27.5, 30, 0.62, 128),
    new THREE.MeshStandardMaterial({ color: palette.ground, roughness: 0.9, metalness: 0.02 })
  );
  ground.position.y = -0.31;
  ground.receiveShadow = true;
  group.add(ground);

  const underside = new THREE.Mesh(
    new THREE.CylinderGeometry(30, 24, 2.4, 128),
    new THREE.MeshStandardMaterial({ color: '#263039', roughness: 0.85 })
  );
  underside.position.y = -1.82;
  underside.receiveShadow = true;
  group.add(underside);

  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(27.6, 0.08, 8, 128),
    new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.58 })
  );
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.04;
  group.add(rim);

  return group;
}

function createCentralHub(): THREE.Group {
  const group = new THREE.Group();
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(2.45, 2.92, 0.58, 64),
    new THREE.MeshStandardMaterial({ color: palette.plinth, roughness: 0.78, metalness: 0.06 })
  );
  base.position.y = 0.29;
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(3.08, 0.045, 8, 96),
    new THREE.MeshBasicMaterial({ color: palette.glass, transparent: true, opacity: 0.55 })
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.62;
  group.add(ring);

  const beacon = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.78, 1),
    new THREE.MeshStandardMaterial({
      color: '#2f7df6',
      emissive: '#2f7df6',
      emissiveIntensity: 0.35,
      roughness: 0.38,
      metalness: 0.1
    })
  );
  beacon.position.y = 2.28;
  beacon.castShadow = true;
  group.add(beacon);
  group.userData.beacon = beacon;

  const mast = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.1, 2.2, 12),
    new THREE.MeshStandardMaterial({ color: palette.metal, roughness: 0.62 })
  );
  mast.position.y = 1.44;
  mast.castShadow = true;
  group.add(mast);

  return group;
}

function createPathNetwork(projects: Project[]): THREE.Group {
  const group = new THREE.Group();
  const hub = new THREE.Vector3(0, 0.025, 0);

  for (const project of projects) {
    const target = new THREE.Vector3(project.position[0], 0.026, project.position[2]);
    const path = createPathSegment(hub, target, project.color);
    group.add(path);
  }

  return group;
}

function createPathSegment(start: THREE.Vector3, end: THREE.Vector3, color: string): THREE.Group {
  const group = new THREE.Group();
  const midpoint = start.clone().add(end).multiplyScalar(0.5);
  const length = start.distanceTo(end);
  const direction = end.clone().sub(start);
  const angle = Math.atan2(direction.x, direction.z);

  const path = new THREE.Mesh(
    new THREE.BoxGeometry(1.05, 0.035, length),
    new THREE.MeshStandardMaterial({ color: palette.path, roughness: 0.86 })
  );
  path.position.copy(midpoint);
  path.rotation.y = angle;
  path.receiveShadow = true;
  group.add(path);

  const stripe = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.042, length * 0.82),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.72 })
  );
  stripe.position.copy(midpoint);
  stripe.position.y += 0.018;
  stripe.rotation.y = angle;
  group.add(stripe);

  return group;
}

function createOuterRing(): THREE.Group {
  const group = new THREE.Group();
  for (let i = 0; i < 32; i += 1) {
    const angle = (i / 32) * Math.PI * 2;
    const radius = 25.2;
    const height = i % 4 === 0 ? 1.15 : 0.62;
    const marker = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, height, 0.22),
      new THREE.MeshStandardMaterial({ color: i % 2 ? palette.stone : palette.pathDark, roughness: 0.82 })
    );
    marker.position.set(Math.sin(angle) * radius, height / 2, Math.cos(angle) * radius);
    marker.rotation.y = angle;
    marker.castShadow = true;
    group.add(marker);
  }
  return group;
}

function createSkillColumns(): THREE.Group {
  const group = new THREE.Group();
  const labels = ['Unity', 'C#', 'WebGL', 'Netcode', 'Firebase', 'AdMob'];
  labels.forEach((_, index) => {
    const angle = -Math.PI * 0.2 + index * 0.16;
    const radius = 19.5;
    const height = 0.9 + (index % 3) * 0.28;
    const column = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.42, height, 6),
      new THREE.MeshStandardMaterial({
        color: index % 2 ? '#6bb6ff' : palette.gold,
        roughness: 0.56,
        metalness: 0.08
      })
    );
    column.position.set(Math.sin(angle) * radius, height / 2, Math.cos(angle) * radius);
    column.castShadow = true;
    column.receiveShadow = true;
    group.add(column);
  });
  return group;
}

function createExperienceGate(): THREE.Group {
  const group = new THREE.Group();
  group.position.set(-15.5, 0, 0);
  group.rotation.y = Math.PI / 2;

  const material = new THREE.MeshStandardMaterial({ color: palette.metal, roughness: 0.68, metalness: 0.12 });
  const left = new THREE.Mesh(new THREE.BoxGeometry(0.38, 3.1, 0.38), material);
  left.position.set(-1.6, 1.55, 0);
  const right = left.clone();
  right.position.x = 1.6;
  const top = new THREE.Mesh(new THREE.BoxGeometry(3.58, 0.34, 0.38), material);
  top.position.set(0, 3.05, 0);
  [left, right, top].forEach((part) => {
    part.castShadow = true;
    part.receiveShadow = true;
    group.add(part);
  });

  const light = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 0.06, 0.42),
    new THREE.MeshBasicMaterial({ color: palette.glass, transparent: true, opacity: 0.72 })
  );
  light.position.set(0, 2.66, -0.02);
  group.add(light);
  return group;
}

function createFoliageCluster(x: number, z: number, scale: number): THREE.Group {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.scale.setScalar(scale);

  for (let i = 0; i < 7; i += 1) {
    const angle = (i / 7) * Math.PI * 2;
    const radius = 0.5 + (i % 3) * 0.22;
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.12, 0.58, 6),
      new THREE.MeshStandardMaterial({ color: '#8c6046', roughness: 0.82 })
    );
    trunk.position.set(Math.sin(angle) * radius, 0.29, Math.cos(angle) * radius);
    trunk.castShadow = true;
    group.add(trunk);

    const crown = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.38 + (i % 2) * 0.08, 0),
      new THREE.MeshStandardMaterial({ color: i % 2 ? palette.foliage : palette.foliageDark, roughness: 0.76 })
    );
    crown.position.set(trunk.position.x, 0.84 + (i % 3) * 0.05, trunk.position.z);
    crown.castShadow = true;
    crown.receiveShadow = true;
    group.add(crown);
  }

  return group;
}

function createFloatingGlyphs(animated: THREE.Object3D[]): THREE.Group {
  const group = new THREE.Group();
  const shapes = [
    new THREE.TetrahedronGeometry(0.38, 0),
    new THREE.BoxGeometry(0.48, 0.48, 0.48),
    new THREE.OctahedronGeometry(0.42, 0),
    new THREE.DodecahedronGeometry(0.36, 0)
  ];

  for (let i = 0; i < 10; i += 1) {
    const angle = (i / 10) * Math.PI * 2 + 0.2;
    const radius = 13.5 + (i % 2) * 2.2;
    const glyph = new THREE.Mesh(
      shapes[i % shapes.length],
      new THREE.MeshStandardMaterial({
        color: i % 2 ? palette.glass : palette.gold,
        emissive: i % 2 ? palette.glass : palette.gold,
        emissiveIntensity: 0.08,
        roughness: 0.44,
        metalness: 0.08
      })
    );
    glyph.position.set(Math.sin(angle) * radius, 2.2 + (i % 4) * 0.34, Math.cos(angle) * radius);
    glyph.userData.baseY = glyph.position.y;
    glyph.castShadow = true;
    animated.push(glyph);
    group.add(glyph);
  }

  return group;
}
