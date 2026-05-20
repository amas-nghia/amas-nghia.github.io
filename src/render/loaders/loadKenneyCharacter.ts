import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const CHARACTER_URL = './assets/vendor/kenney/blocky-characters/character-b.glb';

export async function loadKenneyCharacter(): Promise<THREE.Group> {
  const loader = new GLTFLoader();
  const gltf = await loader.loadAsync(CHARACTER_URL);
  const wrapper = new THREE.Group();
  wrapper.name = 'KenneyBlockyCharacter';

  const model = gltf.scene;
  model.name = 'character-b';
  model.scale.setScalar(0.5);
  model.rotation.y = Math.PI;

  const bounds = new THREE.Box3().setFromObject(model);
  const center = bounds.getCenter(new THREE.Vector3());
  const minY = bounds.min.y;

  model.position.x -= center.x;
  model.position.z -= center.z;
  model.position.y -= minY + 1.05;

  model.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true;
      child.receiveShadow = true;
      child.frustumCulled = true;

      if (Array.isArray(child.material)) {
        child.material.forEach((material) => tuneMaterial(material));
      } else {
        tuneMaterial(child.material);
      }
    }
  });

  wrapper.add(model);
  return wrapper;
}

function tuneMaterial(material: THREE.Material): void {
  if (material instanceof THREE.MeshStandardMaterial) {
    material.roughness = Math.max(material.roughness, 0.62);
    material.metalness = Math.min(material.metalness, 0.05);
  }
}
