import { useGLTF } from '@react-three/drei';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

const CHARACTER_URL = './assets/vendor/kenney/blocky-characters/character-b.glb';

type KenneyCharacterProps = {
  speed: number;
};

export function KenneyCharacter({ speed }: KenneyCharacterProps) {
  const groupRef = useRef<THREE.Group>(null);
  const gltf = useGLTF(CHARACTER_URL);

  const model = useMemo(() => {
    const clone = gltf.scene.clone(true);
    const bounds = new THREE.Box3().setFromObject(clone);
    const center = bounds.getCenter(new THREE.Vector3());
    const minY = bounds.min.y;
    clone.position.set(-center.x, -minY - 1.05, -center.z);
    clone.rotation.y = Math.PI;
    clone.scale.setScalar(0.38);
    clone.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    return clone;
  }, [gltf.scene]);

  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;
    group.add(model);
    return () => {
      group.remove(model);
    };
  }, [model]);

  return <group ref={groupRef} userData={{ speed }} />;
}

useGLTF.preload(CHARACTER_URL);
