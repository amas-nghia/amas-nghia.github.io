import * as THREE from 'three';

export class CharacterAnimator {
  private model: THREE.Object3D | null = null;
  private readonly baseScale = new THREE.Vector3(1, 1, 1);

  public setModel(model: THREE.Object3D): void {
    this.model = model;
    this.baseScale.copy(model.scale);
  }

  public update(elapsed: number, speed: number): void {
    if (!this.model) {
      return;
    }

    const normalizedSpeed = THREE.MathUtils.clamp(speed / 7, 0, 1);
    const walkCycle = elapsed * THREE.MathUtils.lerp(2.4, 9.5, normalizedSpeed);
    const bob = Math.abs(Math.sin(walkCycle)) * 0.08 * normalizedSpeed;
    const idleBreath = Math.sin(elapsed * 2.1) * 0.012 * (1 - normalizedSpeed);
    const sway = Math.sin(walkCycle) * 0.07 * normalizedSpeed;

    this.model.position.y = bob + idleBreath;
    this.model.rotation.z = sway;
    this.model.rotation.x = Math.sin(walkCycle * 0.5) * 0.035 * normalizedSpeed;

    const squash = Math.sin(walkCycle * 2) * 0.028 * normalizedSpeed;
    this.model.scale.set(
      this.baseScale.x * (1 + squash * 0.45),
      this.baseScale.y * (1 - squash),
      this.baseScale.z * (1 + squash * 0.45)
    );
  }
}
