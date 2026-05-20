import * as THREE from 'three';

export class PlayerState {
  public readonly position = new THREE.Vector3(0, 1.05, 0);
  public readonly velocity = new THREE.Vector3();
  public yaw = 0;
  public speed = 6.5;
  public sprintMultiplier = 1.55;
  public activeProjectId: string | null = null;
}
