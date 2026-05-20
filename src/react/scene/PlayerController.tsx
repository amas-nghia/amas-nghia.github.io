import { useFrame, useThree } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { projects, type Project } from '../../data/projects';
import { useKeyboardInput } from '../state/input';
import { KenneyCharacter } from './KenneyCharacter';

type PlayerControllerProps = {
  nearestProject: Project | null;
  onNearestProjectChange: (project: Project | null) => void;
  onInspectProject: (project: Project) => void;
};

export function PlayerController({ nearestProject, onNearestProjectChange, onInspectProject }: PlayerControllerProps) {
  const groupRef = useRef<THREE.Group>(null);
  const velocity = useRef(new THREE.Vector3());
  const position = useRef(new THREE.Vector3(0, 1.08, 0));
  const yaw = useRef(0);
  const cameraYaw = useRef(0);
  const speed = useRef(0);
  const input = useKeyboardInput();
  const { camera, size } = useThree();

  const projectPositions = useMemo(
    () => projects.map((project) => ({ project, position: new THREE.Vector3(...project.position) })),
    []
  );

  useFrame(({ clock }, delta) => {
    const snapshot = input.read();
    const move = new THREE.Vector3();
    if (snapshot.forward) move.z -= 1;
    if (snapshot.backward) move.z += 1;
    if (snapshot.left) move.x -= 1;
    if (snapshot.right) move.x += 1;

    if (snapshot.yawLeft) cameraYaw.current += 1.8 * delta;
    if (snapshot.yawRight) cameraYaw.current -= 1.8 * delta;

    if (move.lengthSq() > 0) {
      move.normalize();
      move.applyMatrix4(new THREE.Matrix4().makeRotationY(cameraYaw.current));
      const moveSpeed = 6.5 * (snapshot.sprint ? 1.55 : 1);
      velocity.current.copy(move.multiplyScalar(moveSpeed));
      yaw.current = Math.atan2(velocity.current.x, velocity.current.z);
    } else {
      velocity.current.multiplyScalar(Math.pow(0.0008, delta));
    }

    position.current.addScaledVector(velocity.current, Math.min(delta, 0.033));
    const radius = Math.hypot(position.current.x, position.current.z);
    if (radius > 17.4) {
      position.current.multiplyScalar(17.4 / radius);
      position.current.y = 1.08;
    }

    speed.current = velocity.current.length();
    const group = groupRef.current;
    if (group) {
      const normalizedSpeed = THREE.MathUtils.clamp(speed.current / 7, 0, 1);
      const cycle = clock.elapsedTime * THREE.MathUtils.lerp(2.4, 9.5, normalizedSpeed);
      group.position.copy(position.current);
      group.position.y += Math.abs(Math.sin(cycle)) * 0.08 * normalizedSpeed + Math.sin(clock.elapsedTime * 2.1) * 0.012;
      group.rotation.set(Math.sin(cycle * 0.5) * 0.035 * normalizedSpeed, yaw.current, Math.sin(cycle) * 0.07 * normalizedSpeed);
    }

    let nearest: Project | null = null;
    let nearestDistance = Infinity;
    for (const item of projectPositions) {
      const distance = item.position.distanceTo(position.current);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = item.project;
      }
    }

    const nextNearest = nearestDistance < 3.2 ? nearest : null;
    if (nextNearest?.id !== nearestProject?.id) {
      onNearestProjectChange(nextNearest);
    }
    if (snapshot.inspect && nextNearest) {
      onInspectProject(nextNearest);
    }

    const compact = size.width < 720;
    const distance = compact ? 16.5 : 12.2;
    const height = compact ? 8.6 : 6.25;
    const cameraOffset = new THREE.Vector3(Math.sin(cameraYaw.current) * distance, height, Math.cos(cameraYaw.current) * distance);
    const desiredCamera = position.current.clone().add(cameraOffset);
    camera.position.lerp(desiredCamera, 1 - Math.pow(0.001, delta));
    camera.lookAt(position.current.x, position.current.y + 1, position.current.z);
  });

  return (
    <group ref={groupRef}>
      <KenneyCharacter speed={speed.current} />
    </group>
  );
}
