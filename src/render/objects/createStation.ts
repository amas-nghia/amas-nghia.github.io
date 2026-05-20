import * as THREE from 'three';
import type { Project } from '../../data/projects';

export type StationObject = {
  project: Project;
  group: THREE.Group;
  ring: THREE.Mesh;
  position: THREE.Vector3;
};

export function createStation(project: Project): StationObject {
  const group = new THREE.Group();
  group.name = `ProjectStation:${project.id}`;

  const position = new THREE.Vector3(...project.position);
  group.position.copy(position);

  const platformMaterial = new THREE.MeshStandardMaterial({
    color: project.color,
    roughness: 0.5,
    metalness: 0.08
  });
  const darkMaterial = new THREE.MeshStandardMaterial({
    color: '#1e2128',
    roughness: 0.76,
    metalness: 0.05
  });

  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.55, 0.34, 32), platformMaterial);
  base.position.y = 0.17;
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);

  const pillar = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.5, 0.16), darkMaterial);
  pillar.position.set(0, 1.05, 0);
  pillar.castShadow = true;
  group.add(pillar);

  const screen = new THREE.Mesh(
    new THREE.BoxGeometry(1.02, 0.72, 0.05),
    new THREE.MeshStandardMaterial({
      color: project.color,
      roughness: 0.36,
      emissive: project.color,
      emissiveIntensity: 0.18
    })
  );
  screen.position.set(0, 1.16, -0.1);
  screen.castShadow = true;
  group.add(screen);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1.72, 0.025, 8, 64),
    new THREE.MeshBasicMaterial({ color: project.color, transparent: true, opacity: 0.72 })
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.04;
  group.add(ring);

  return { project, group, ring, position };
}
