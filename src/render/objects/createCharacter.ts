import * as THREE from 'three';

export function createCharacter(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'PlayerCharacter';

  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: '#3f8cff',
    roughness: 0.58,
    metalness: 0.08
  });
  const accentMaterial = new THREE.MeshStandardMaterial({
    color: '#f8f4e8',
    roughness: 0.72
  });
  const darkMaterial = new THREE.MeshStandardMaterial({
    color: '#16171c',
    roughness: 0.65
  });

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 0.72, 6, 12), bodyMaterial);
  body.position.y = 0.9;
  body.castShadow = true;
  group.add(body);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.34, 20, 16), accentMaterial);
  head.position.y = 1.7;
  head.castShadow = true;
  group.add(head);

  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.12, 0.08), darkMaterial);
  visor.position.set(0, 1.72, -0.29);
  visor.castShadow = true;
  group.add(visor);

  const backpack = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.7, 0.2), darkMaterial);
  backpack.position.set(0, 0.92, 0.46);
  backpack.castShadow = true;
  group.add(backpack);

  const armGeometry = new THREE.CapsuleGeometry(0.11, 0.55, 5, 8);
  const leftArm = new THREE.Mesh(armGeometry, bodyMaterial);
  leftArm.position.set(-0.53, 0.95, 0);
  leftArm.rotation.z = -0.18;
  leftArm.castShadow = true;
  group.add(leftArm);

  const rightArm = leftArm.clone();
  rightArm.position.x = 0.53;
  rightArm.rotation.z = 0.18;
  group.add(rightArm);

  const legGeometry = new THREE.CapsuleGeometry(0.13, 0.5, 5, 8);
  const leftLeg = new THREE.Mesh(legGeometry, darkMaterial);
  leftLeg.position.set(-0.18, 0.22, 0);
  leftLeg.castShadow = true;
  group.add(leftLeg);

  const rightLeg = leftLeg.clone();
  rightLeg.position.x = 0.18;
  group.add(rightLeg);

  return group;
}
