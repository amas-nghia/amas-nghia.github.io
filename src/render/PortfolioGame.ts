import * as THREE from 'three';
import { projects, type Project } from '../data/projects';
import { experience } from '../data/experience';
import { profile, skills } from '../data/profile';
import { InputState } from '../simulation/InputState';
import { PlayerState } from '../simulation/PlayerState';
import { createCharacter } from './objects/createCharacter';
import { createStation, type StationObject } from './objects/createStation';
import { loadKenneyCharacter } from './loaders/loadKenneyCharacter';

type UiRefs = {
  projectPanel: HTMLDivElement;
  projectTitle: HTMLHeadingElement;
  projectMeta: HTMLParagraphElement;
  projectTech: HTMLDivElement;
  projectBullets: HTMLUListElement;
  prompt: HTMLDivElement;
  quickPanel: HTMLDivElement;
};

export class PortfolioGame {
  private readonly canvas = document.createElement('canvas');
  private readonly overlay = document.createElement('div');
  private readonly renderer = new THREE.WebGLRenderer({
    canvas: this.canvas,
    antialias: true,
    powerPreference: 'high-performance'
  });
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(52, 1, 0.1, 160);
  private readonly clock = new THREE.Clock();
  private readonly input: InputState;
  private readonly player = new PlayerState();
  private readonly playerObject = createCharacter();
  private readonly stations: StationObject[] = [];
  private readonly ui: UiRefs;
  private animationId = 0;
  private nearestProject: Project | null = null;
  private cameraYaw = 0;
  private cameraPitch = 0.42;
  private disposed = false;

  public constructor(private readonly root: HTMLElement) {
    this.input = new InputState(this.canvas);
    this.ui = this.createUi();
    this.setupRenderer();
    this.setupScene();
    this.root.append(this.canvas, this.overlay);
    this.resize();
    window.addEventListener('resize', this.resize);
    this.canvas.addEventListener('click', this.handleCanvasClick);
    window.addEventListener('keydown', this.handleKeyDown);
  }

  public start(): void {
    this.renderer.setAnimationLoop(this.tick);
  }

  public dispose(): void {
    if (this.disposed) {
      return;
    }

    this.disposed = true;
    cancelAnimationFrame(this.animationId);
    this.renderer.setAnimationLoop(null);
    this.renderer.dispose();
    this.input.dispose();
    window.removeEventListener('resize', this.resize);
    this.canvas.removeEventListener('click', this.handleCanvasClick);
    window.removeEventListener('keydown', this.handleKeyDown);
  }

  private setupRenderer(): void {
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.canvas.className = 'game-canvas';
  }

  private setupScene(): void {
    this.scene.background = new THREE.Color('#dce6ea');
    this.scene.fog = new THREE.Fog('#dce6ea', 24, 58);

    const ambient = new THREE.HemisphereLight('#f3fbff', '#59666f', 1.6);
    this.scene.add(ambient);

    const sun = new THREE.DirectionalLight('#ffffff', 2.4);
    sun.position.set(-10, 16, 9);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -28;
    sun.shadow.camera.right = 28;
    sun.shadow.camera.top = 28;
    sun.shadow.camera.bottom = -28;
    this.scene.add(sun);

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(28, 96),
      new THREE.MeshStandardMaterial({ color: '#eef0e7', roughness: 0.92 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    const grid = new THREE.GridHelper(56, 28, '#b9c1bd', '#ced5d1');
    grid.position.y = 0.012;
    this.scene.add(grid);

    this.createWorldObjects();
    this.playerObject.position.copy(this.player.position);
    this.scene.add(this.playerObject);
    void this.replaceCharacterWithKenneyAsset();

    this.camera.position.set(0, 7, 9);
    this.camera.lookAt(this.player.position);
  }

  private async replaceCharacterWithKenneyAsset(): Promise<void> {
    try {
      const character = await loadKenneyCharacter();
      this.playerObject.clear();
      this.playerObject.add(character);
    } catch (error) {
      console.warn('Failed to load Kenney character asset. Using procedural fallback.', error);
    }
  }

  private createWorldObjects(): void {
    const center = new THREE.Mesh(
      new THREE.CylinderGeometry(2.2, 2.5, 0.42, 48),
      new THREE.MeshStandardMaterial({ color: '#20252d', roughness: 0.78 })
    );
    center.position.y = 0.21;
    center.castShadow = true;
    center.receiveShadow = true;
    this.scene.add(center);

    const beacon = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.68, 1),
      new THREE.MeshStandardMaterial({
        color: '#2f7df6',
        emissive: '#2f7df6',
        emissiveIntensity: 0.22,
        roughness: 0.4
      })
    );
    beacon.position.y = 2.25;
    beacon.castShadow = true;
    this.scene.add(beacon);

    for (const project of projects) {
      const station = createStation(project);
      station.group.lookAt(0, station.group.position.y, 0);
      this.stations.push(station);
      this.scene.add(station.group);
    }

    for (let i = 0; i < 18; i += 1) {
      const angle = (i / 18) * Math.PI * 2;
      const radius = 19 + (i % 3) * 1.6;
      const height = 0.45 + (i % 4) * 0.18;
      const marker = new THREE.Mesh(
        new THREE.BoxGeometry(0.22, height, 0.22),
        new THREE.MeshStandardMaterial({ color: i % 2 ? '#9ca8a3' : '#707b80', roughness: 0.85 })
      );
      marker.position.set(Math.cos(angle) * radius, height / 2, Math.sin(angle) * radius);
      marker.castShadow = true;
      this.scene.add(marker);
    }
  }

  private readonly tick = (): void => {
    const delta = Math.min(this.clock.getDelta(), 0.033);
    const elapsed = this.clock.elapsedTime;

    this.updateCameraIntent(delta);
    this.updatePlayer(delta);
    this.updateStations(elapsed);
    this.updateCamera(delta);
    this.renderer.render(this.scene, this.camera);
  };

  private updateCameraIntent(delta: number): void {
    const pointer = this.input.consumePointerDelta();
    this.cameraYaw -= pointer.x * 0.003;
    this.cameraPitch = THREE.MathUtils.clamp(this.cameraPitch - pointer.y * 0.002, 0.18, 0.92);

    if (this.input.isDown('KeyQ')) {
      this.cameraYaw += 1.8 * delta;
    }
    if (this.input.isDown('KeyE')) {
      this.cameraYaw -= 1.8 * delta;
    }
  }

  private updatePlayer(delta: number): void {
    const move = new THREE.Vector3();
    if (this.input.isDown('KeyW', 'ArrowUp')) move.z -= 1;
    if (this.input.isDown('KeyS', 'ArrowDown')) move.z += 1;
    if (this.input.isDown('KeyA', 'ArrowLeft')) move.x -= 1;
    if (this.input.isDown('KeyD', 'ArrowRight')) move.x += 1;

    if (move.lengthSq() > 0) {
      move.normalize();
      const yawMatrix = new THREE.Matrix4().makeRotationY(this.cameraYaw);
      move.applyMatrix4(yawMatrix);
      const speed = this.player.speed * (this.input.isDown('ShiftLeft', 'ShiftRight') ? this.player.sprintMultiplier : 1);
      this.player.velocity.copy(move.multiplyScalar(speed));
      this.player.yaw = Math.atan2(this.player.velocity.x, this.player.velocity.z);
    } else {
      this.player.velocity.multiplyScalar(Math.pow(0.0008, delta));
    }

    const next = this.player.position.clone().addScaledVector(this.player.velocity, delta);
    const distanceFromCenter = Math.hypot(next.x, next.z);
    if (distanceFromCenter > 25.5) {
      next.multiplyScalar(25.5 / distanceFromCenter);
    }

    this.player.position.copy(next);
    this.playerObject.position.copy(this.player.position);
    this.playerObject.rotation.y = this.player.yaw;

    const bob = Math.sin(this.clock.elapsedTime * 10) * Math.min(this.player.velocity.length() / 6, 1) * 0.035;
    this.playerObject.position.y = this.player.position.y + bob;

    this.updateNearestProject();
  }

  private updateNearestProject(): void {
    let nearest: Project | null = null;
    let nearestDistance = Infinity;

    for (const station of this.stations) {
      const distance = station.position.distanceTo(this.player.position);
      if (distance < nearestDistance) {
        nearest = station.project;
        nearestDistance = distance;
      }
    }

    this.nearestProject = nearestDistance < 3.2 ? nearest : null;

    if (this.nearestProject) {
      this.ui.prompt.textContent = `Press F to inspect ${this.nearestProject.name}`;
      this.ui.prompt.classList.add('is-visible');
    } else {
      this.ui.prompt.classList.remove('is-visible');
    }
  }

  private updateStations(elapsed: number): void {
    for (const station of this.stations) {
      const isActive = this.player.activeProjectId === station.project.id || this.nearestProject?.id === station.project.id;
      station.ring.rotation.z = elapsed * (isActive ? 1.6 : 0.55);
      station.ring.scale.setScalar(isActive ? 1.08 + Math.sin(elapsed * 5) * 0.025 : 1);
      station.ring.visible = true;
    }
  }

  private updateCamera(delta: number): void {
    const distance = 8.2;
    const height = 4.7;
    const offset = new THREE.Vector3(
      Math.sin(this.cameraYaw) * Math.cos(this.cameraPitch) * distance,
      height + Math.sin(this.cameraPitch) * 1.3,
      Math.cos(this.cameraYaw) * Math.cos(this.cameraPitch) * distance
    );
    const desired = this.player.position.clone().add(offset);
    this.camera.position.lerp(desired, 1 - Math.pow(0.001, delta));
    const lookTarget = this.player.position.clone().add(new THREE.Vector3(0, 1.0, 0));
    this.camera.lookAt(lookTarget);
  }

  private createUi(): UiRefs {
    this.overlay.className = 'overlay';
    this.overlay.innerHTML = `
      <header class="hero-panel">
        <p class="eyebrow">Interactive Game Developer Portfolio</p>
        <h1>${profile.name}</h1>
        <p class="title">${profile.title}</p>
        <p class="summary">${profile.summary}</p>
        <div class="hero-actions">
          <a href="${profile.cvPath}" target="_blank" rel="noreferrer">Download CV</a>
          <a href="${profile.linkedIn}" target="_blank" rel="noreferrer">LinkedIn</a>
          <a href="mailto:${profile.email}">Email</a>
        </div>
      </header>

      <aside class="quick-panel">
        <div>
          <span class="panel-label">Controls</span>
          <p>WASD move · Mouse/QE camera · Shift sprint · F inspect</p>
        </div>
        <div>
          <span class="panel-label">Skills</span>
          <div class="skill-list">${skills.map((skill) => `<span>${skill}</span>`).join('')}</div>
        </div>
      </aside>

      <section class="experience-strip">
        ${experience
          .map(
            (item) => `
              <article>
                <strong>${item.company}</strong>
                <span>${item.role}</span>
                <small>${item.period}</small>
              </article>
            `
          )
          .join('')}
      </section>

      <div class="prompt"></div>

      <article class="project-panel" aria-live="polite">
        <button class="close-button" type="button" aria-label="Close project panel">×</button>
        <p class="eyebrow">Selected Project</p>
        <h2></h2>
        <p class="project-meta"></p>
        <div class="project-tech"></div>
        <ul></ul>
      </article>
    `;

    const projectPanel = this.overlay.querySelector<HTMLDivElement>('.project-panel');
    const projectTitle = this.overlay.querySelector<HTMLHeadingElement>('.project-panel h2');
    const projectMeta = this.overlay.querySelector<HTMLParagraphElement>('.project-meta');
    const projectTech = this.overlay.querySelector<HTMLDivElement>('.project-tech');
    const projectBullets = this.overlay.querySelector<HTMLUListElement>('.project-panel ul');
    const prompt = this.overlay.querySelector<HTMLDivElement>('.prompt');
    const quickPanel = this.overlay.querySelector<HTMLDivElement>('.quick-panel');
    const closeButton = this.overlay.querySelector<HTMLButtonElement>('.close-button');

    if (!projectPanel || !projectTitle || !projectMeta || !projectTech || !projectBullets || !prompt || !quickPanel || !closeButton) {
      throw new Error('Failed to create UI overlay.');
    }

    closeButton.addEventListener('click', () => this.closeProjectPanel());

    return { projectPanel, projectTitle, projectMeta, projectTech, projectBullets, prompt, quickPanel };
  }

  private openProjectPanel(project: Project): void {
    this.player.activeProjectId = project.id;
    this.ui.projectTitle.textContent = project.name;
    this.ui.projectMeta.textContent = `${project.platform} · ${project.role} · Team size: ${project.teamSize}`;
    this.ui.projectTech.innerHTML = project.tech.map((tech) => `<span>${tech}</span>`).join('');
    this.ui.projectBullets.innerHTML = project.bullets.map((bullet) => `<li>${bullet}</li>`).join('');
    this.ui.projectPanel.classList.add('is-open');
  }

  private closeProjectPanel(): void {
    this.player.activeProjectId = null;
    this.ui.projectPanel.classList.remove('is-open');
  }

  private readonly handleCanvasClick = (): void => {
    this.input.requestPointerLock();
  };

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (event.code === 'KeyF' && this.nearestProject) {
      this.openProjectPanel(this.nearestProject);
    }

    if (event.code === 'Escape') {
      this.closeProjectPanel();
    }
  };

  private readonly resize = (): void => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  };
}
