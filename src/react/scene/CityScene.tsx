import { useFrame, useLoader, useThree } from '@react-three/fiber';
import { Center, ContactShadows, Text3D, useGLTF } from '@react-three/drei';
import { CuboidCollider, Physics, RigidBody, type RapierRigidBody } from '@react-three/rapier';
import { forwardRef, useEffect, useMemo, useRef, useState, type MutableRefObject, type Ref } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

const ASSET_BASE = './assets/vendor/kaykit/city-builder-bits';
const SKYBOX_BASE = './assets/vendor/sky/sky_89_2k/sky_89_cubemap_2k';
const TEXT_3D_FONT = './assets/vendor/fonts/helvetiker_bold.typeface.json';
const TILE = 2.15;
const SIDE_VIEW_DISTANCE = 4.15;
const SIDE_VIEW_HEIGHT = 5.35;
const CAR_SPEED = 2.8;
const CAR_CORNER_COMMIT_SPEED = 2.2;
const CAR_RIDE_HEIGHT = 0.16;
const CAR_ACCEL_TIME = 0.85;
const CAR_TURN_SMOOTHNESS = 10;
const CAR_DRIFT_RESPONSE = 14;
const CAR_DRIFT_SPEED_RESPONSE = 2.6;
const CAR_DRIFT_DECAY = 7;
const CAR_DRIFT_DISTANCE = 0.28;
const CAR_FRONT_DRIFT_DISTANCE = 0.1;
const CAR_PRETURN_SLIDE_DISTANCE = 0.24;
const CAR_ROLL_MAX = 0.16;
const CAR_DRIFT_WINDOW = 0.5;
const CAR_STEERING_LOOKAHEAD = 3.2;
const CAR_STEERING_SMOOTHNESS = 7.2;
const CAR_VISUAL_POSITION_SMOOTHNESS = 22;
const CAR_SLIP_MAX = 0.16;
const CAR_COUNTER_STEER = 0.12;
const CAR_LATERAL_GRIP = 0.42;
const CAR_REAR_GRIP = 0.32;
const CAR_WHEELBASE = 1.55;
const CAR_TRACK_WIDTH = 0.26;
const CAR_REAR_TRACK_OFFSET = -0.32;
const TIRE_TRACK_HEIGHT = 0.085;
const CAR_ROLL_SPEED_THRESHOLD = 0.72;
const CAR_REVERSE_DRIFT_FACTOR = 0.2;
const CORNER_COMMIT_DRIFT_THRESHOLD = 0.08;
const TURN_COMMIT_YAW_THRESHOLD = 0.08;
const TURN_STABLE_YAW_THRESHOLD = 0.035;
const UTURN_DURATION = 0.72;
const TIRE_TRACK_POINTS = 160;
const SMOKE_PARTICLES = 20;
const VEHICLE_DUST_PARTICLES = 140;
const BUMPABLE_HIT_RADIUS = 0.8;
const BUMPABLE_GROUND_Y = 0.12;
const TRAFFIC_BUMP_IMPULSE = 7.8;
const TRAFFIC_RETURN_SPEED = 3.8;
const TRAFFIC_YAW_RETURN_SPEED = 4.5;
const TRAFFIC_HIT_RADIUS = 1.05;
const CORNER_ARC_SEGMENTS = 24;
const CORNER_ARC_RADIUS_SCALE = 0.28;
const CAMERA_HEADING_SMOOTHNESS = 7;
const CAMERA_LOOK_SMOOTHNESS = 8;
const BLOOM_STRENGTH = 0.26;
const BLOOM_RADIUS = 0.58;
const BLOOM_THRESHOLD = 0.78;

type DriftFxState = {
  leftRear: THREE.Vector3;
  rightRear: THREE.Vector3;
  drift: number;
  sparkLeft: boolean;
  sparkRight: boolean;
};

type SmokeParticle = {
  position: THREE.Vector3;
  age: number;
  size: number;
};

type DustSource = {
  position: THREE.Vector3;
  yaw: number;
  intensity: number;
};

type DustParticle = {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  age: number;
  size: number;
};

export type CvPoi = {
  id: string;
  title: string;
  meta: string;
  tech: string[];
  bullets: string[];
};

type CvPoiMarker = CvPoi & {
  position: THREE.Vector3;
};

type BumpableSpec = {
  id: string;
  kind: 'text' | 'box' | 'block';
  label?: string;
  model?: Extract<ModelName, 'box_A' | 'box_B' | 'dumpster' | 'trash_A' | 'trash_B'>;
  position: THREE.Vector3;
  rotation?: number;
  color?: string;
  scale?: number;
  size?: [number, number, number];
  radius: number;
};

type TrafficBumpState = {
  offset: THREE.Vector3;
  velocity: THREE.Vector3;
  yawKick: number;
  yawVelocity: number;
  cooldown: number;
};

type CollisionBounds = {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
};

type CarRigRef = {
  root: THREE.Group | null;
  body: THREE.Group | null;
};

type ModelName =
  | 'base'
  | 'bench'
  | 'box_A'
  | 'box_B'
  | 'building_A'
  | 'building_B'
  | 'building_C'
  | 'building_D'
  | 'building_E'
  | 'building_F'
  | 'building_G'
  | 'building_H'
  | 'bush'
  | 'car_hatchback'
  | 'car_police'
  | 'car_sedan'
  | 'car_stationwagon'
  | 'car_taxi'
  | 'dumpster'
  | 'firehydrant'
  | 'road_corner'
  | 'road_corner_curved'
  | 'road_junction'
  | 'road_straight'
  | 'road_straight_crossing'
  | 'road_tsplit'
  | 'streetlight'
  | 'trafficlight_A'
  | 'trafficlight_B'
  | 'trafficlight_C'
  | 'trash_A'
  | 'trash_B'
  | 'watertower';

type Placement = {
  model: ModelName;
  position: [number, number, number];
  rotation?: number;
  scale?: number;
};

type BuildingPlacement = Placement & {
  radius: number;
};

type BuildingLayoutModel = {
  model: Extract<ModelName, 'building_A' | 'building_B' | 'building_C' | 'building_D' | 'building_E' | 'building_F' | 'building_G' | 'building_H'>;
  rotation: number;
};

type LaneConfig = {
  offset: number;
  cornerRadiusScale: number;
  steeringLookahead: number;
  steeringSmoothness: number;
  slideScale: number;
  preTurnSlideDistance: number;
  frontDriftDistance: number;
  rearDriftDistance: number;
  driftWindow: number;
};

const LANE_CONFIGS: [LaneConfig, LaneConfig] = [
  {
    offset: 0.16,
    cornerRadiusScale: 0.22,
    steeringLookahead: 2.55,
    steeringSmoothness: 8.6,
    slideScale: 0.18,
    preTurnSlideDistance: 0.14,
    frontDriftDistance: 0.04,
    rearDriftDistance: 0.14,
    driftWindow: 0.42
  },
  {
    offset: -0.22,
    cornerRadiusScale: CORNER_ARC_RADIUS_SCALE,
    steeringLookahead: CAR_STEERING_LOOKAHEAD,
    steeringSmoothness: CAR_STEERING_SMOOTHNESS,
    slideScale: 1,
    preTurnSlideDistance: CAR_PRETURN_SLIDE_DISTANCE,
    frontDriftDistance: CAR_FRONT_DRIFT_DISTANCE,
    rearDriftDistance: CAR_DRIFT_DISTANCE,
    driftWindow: CAR_DRIFT_WINDOW
  }
];

const centerBuildingModels: BuildingLayoutModel[] = [
  { model: 'building_A', rotation: Math.PI },
  { model: 'building_B', rotation: Math.PI },
  { model: 'building_C', rotation: Math.PI },
  { model: 'building_D', rotation: Math.PI },
  { model: 'building_E', rotation: -Math.PI / 2 },
  { model: 'building_F', rotation: Math.PI },
  { model: 'building_G', rotation: Math.PI },
  { model: 'building_H', rotation: Math.PI / 2 },
  { model: 'building_B', rotation: Math.PI },
  { model: 'building_E', rotation: Math.PI },
  { model: 'building_H', rotation: Math.PI },
  { model: 'building_C', rotation: Math.PI },
  { model: 'building_F', rotation: Math.PI },
  { model: 'building_G', rotation: Math.PI },
  { model: 'building_A', rotation: Math.PI },
  { model: 'building_D', rotation: Math.PI }
];

const trafficCars: Array<Placement & { offset: number; speed: number }> = [
  { model: 'car_taxi', position: [0, 0, 0], offset: 0.2, speed: 0.85 },
  { model: 'car_police', position: [0, 0, 0], offset: 0.52, speed: 1.05 },
  { model: 'car_stationwagon', position: [0, 0, 0], offset: 0.76, speed: 0.72 }
];

export function CityScene({
  onNearbyPoiChange,
  onOpenPoi
}: {
  onNearbyPoiChange?: (poi: CvPoi | null) => void;
  onOpenPoi?: (poi: CvPoi) => void;
}) {
  const { camera } = useThree();
  const targetCar = useRef<CarRigRef>({ root: null, body: null });
  const buildingRefs = useRef<Array<{ group: THREE.Group; position: THREE.Vector3; radius: number }>>([]);
  const travel = useRef(0.02);
  const velocity = useRef(0);
  const driftVisual = useRef(0);
  const slipAngle = useRef(0);
  const frontAxle = useRef(new THREE.Vector3());
  const rearAxle = useRef(new THREE.Vector3());
  const visualCarPosition = useRef(new THREE.Vector3());
  const steeringYaw = useRef(0);
  const cameraOutsideDirection = useRef(new THREE.Vector3(0, 0, 1));
  const lookTarget = useRef(new THREE.Vector3());
  const laneIndex = useRef(0);
  const desiredLaneIndex = useRef(0);
  const laneTravel = useRef(0.02);
  const cornerCommit = useRef(false);
  const turnCommit = useRef(false);
  const uTurnProgress = useRef(1);
  const uTurnStart = useRef(new THREE.Vector3());
  const uTurnEnd = useRef(new THREE.Vector3());
  const uTurnControl = useRef(new THREE.Vector3());
  const uTurnEndTravel = useRef(0.02);
  const dustSources = useRef<DustSource[]>([]);
  const playerVelocity = useRef(new THREE.Vector3());
  const playerYaw = useRef(0);
  const trafficBumps = useRef<TrafficBumpState[]>(
    trafficCars.map(() => ({
      offset: new THREE.Vector3(),
      velocity: new THREE.Vector3(),
      yawKick: 0,
      yawVelocity: 0,
      cooldown: 0
    }))
  );
  const nearbyPoi = useRef<CvPoiMarker | null>(null);
  const [checkpointTrigger, setCheckpointTrigger] = useState({ id: '', nonce: 0 });
  const driftFx = useRef<DriftFxState>({
    leftRear: new THREE.Vector3(),
    rightRear: new THREE.Vector3(),
    drift: 0,
    sparkLeft: false,
    sparkRight: false
  });
  const keyState = useRef({ left: false, right: false });
  const roadScenes = useRoadScenes();
  const roadLayout = useMemo(() => makeRoadLayout(roadScenes), [roadScenes]);
  const cvPois = useMemo(() => makeCvPois(roadLayout), [roadLayout]);
  const bumpables = useMemo(() => makeBumpables(roadLayout), [roadLayout]);
  const centralBounds = useMemo(() => makeCentralCollisionBounds(roadLayout), [roadLayout]);
  const path = useMemo(() => makePathSampler(roadLayout.lanes[0]), [roadLayout]);
  const oppositePath = useMemo(() => makePathSampler(roadLayout.lanes[1]), [roadLayout]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') {
        keyState.current.left = true;
        desiredLaneIndex.current = 0;
      }
      if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') {
        keyState.current.right = true;
        desiredLaneIndex.current = 1;
      }
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') keyState.current.left = false;
      if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') keyState.current.right = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  useEffect(() => {
    const initialSample = path.sample(laneTravel.current);
    steeringYaw.current = initialSample.yaw;
    cameraOutsideDirection.current.copy(getOutsideCameraDirection(initialSample.position));
    lookTarget.current.copy(initialSample.position).add(new THREE.Vector3(0, 1.25, 0));
    const initialForward = new THREE.Vector3(Math.sin(initialSample.yaw), 0, Math.cos(initialSample.yaw));
    frontAxle.current.copy(initialSample.position).addScaledVector(initialForward, CAR_WHEELBASE * 0.5);
    rearAxle.current.copy(initialSample.position).addScaledVector(initialForward, -CAR_WHEELBASE * 0.5);
    visualCarPosition.current.copy(initialSample.position);
  }, [path]);

  useFrame(({ clock }, delta) => {
    const input = keyState.current;
    const forwardPressed = input.left;
    const reversePressed = input.right;
    dustSources.current = [];

    const activePath = laneIndex.current === 0 ? path : oppositePath;
    const inactivePath = laneIndex.current === 0 ? oppositePath : path;
    const car = targetCar.current.root;
    const carBody = targetCar.current.body;
    const laneSample = activePath.sample(laneTravel.current);
    if (desiredLaneIndex.current !== laneIndex.current && uTurnProgress.current >= 1) {
      const nearestTarget = inactivePath.nearest(laneSample.position);
      uTurnProgress.current = 0;
      uTurnStart.current.copy(laneSample.position);
      uTurnEnd.current.copy(nearestTarget.sample.position);
      uTurnEndTravel.current = nearestTarget.t;
      const middle = laneSample.position.clone().add(nearestTarget.sample.position).multiplyScalar(0.5);
      const tangent = new THREE.Vector3(Math.sin(laneSample.yaw), 0, Math.cos(laneSample.yaw));
      const laneChangeDirection = nearestTarget.sample.position.clone().sub(laneSample.position).normalize();
      uTurnControl.current
        .copy(middle)
        .addScaledVector(tangent, CAR_WHEELBASE * 0.65)
        .addScaledVector(laneChangeDirection, roadLayout.houseTileWidth * 0.08);
    }

    if (uTurnProgress.current < 1) {
      turnCommit.current = true;
      uTurnProgress.current = Math.min(1, uTurnProgress.current + delta / UTURN_DURATION);
      if (uTurnProgress.current >= 1) {
        laneIndex.current = desiredLaneIndex.current;
        laneTravel.current = uTurnEndTravel.current;
      }
    }

    const currentPath = laneIndex.current === 0 ? path : oppositePath;
    const laneConfig = LANE_CONFIGS[laneIndex.current];
    const commitProbe = currentPath.sample(laneTravel.current);
    const commitDrift = uTurnProgress.current < 1 ? 0 : getCornerDrift(commitProbe, currentPath, Math.max(Math.abs(velocity.current), CAR_CORNER_COMMIT_SPEED), laneConfig.driftWindow);
    const commitTargetYaw = uTurnProgress.current < 1 ? commitProbe.yaw : getPursuitYaw(commitProbe, currentPath, laneConfig.steeringLookahead);
    const commitYawDelta = Math.abs(normalizeAngleNear(steeringYaw.current, commitTargetYaw) - steeringYaw.current);
    if (uTurnProgress.current < 1 || Math.abs(commitDrift) < CORNER_COMMIT_DRIFT_THRESHOLD) {
      cornerCommit.current = false;
    } else if (forwardPressed || reversePressed) {
      cornerCommit.current = true;
    }
    if (uTurnProgress.current < 1 || commitYawDelta > TURN_COMMIT_YAW_THRESHOLD) {
      turnCommit.current = true;
    } else if (commitYawDelta < TURN_STABLE_YAW_THRESHOLD && Math.abs(commitDrift) < CORNER_COMMIT_DRIFT_THRESHOLD) {
      turnCommit.current = false;
    }
    const committedThroughCorner = cornerCommit.current && Math.abs(commitDrift) >= CORNER_COMMIT_DRIFT_THRESHOLD;
    const committedThroughTurn = turnCommit.current && (uTurnProgress.current < 1 || commitYawDelta >= TURN_STABLE_YAW_THRESHOLD || Math.abs(commitDrift) >= CORNER_COMMIT_DRIFT_THRESHOLD);
    const targetVelocity = forwardPressed || reversePressed ? CAR_SPEED : committedThroughCorner || committedThroughTurn ? CAR_CORNER_COMMIT_SPEED : 0;
    const acceleration = CAR_SPEED / CAR_ACCEL_TIME;
    velocity.current = moveTowards(velocity.current, targetVelocity, acceleration * delta);
    if (uTurnProgress.current >= 1) {
      laneTravel.current = wrap01(laneTravel.current + (velocity.current * delta) / currentPath.length);
    }

    const currentLaneSample = currentPath.sample(laneTravel.current);
    const sample =
      uTurnProgress.current < 1
        ? sampleQuadraticTurn(uTurnStart.current, uTurnControl.current, uTurnEnd.current, uTurnProgress.current)
        : currentLaneSample;
    const targetSteeringYaw = uTurnProgress.current < 1 ? sample.yaw : getPursuitYaw(sample, currentPath, laneConfig.steeringLookahead);
    steeringYaw.current = THREE.MathUtils.lerp(
      steeringYaw.current,
      normalizeAngleNear(steeringYaw.current, targetSteeringYaw),
      1 - Math.exp(-laneConfig.steeringSmoothness * delta)
    );
    const speedRatio = Math.min(Math.abs(velocity.current) / CAR_SPEED, 1);
    const cornerDrift = uTurnProgress.current < 1 ? 0 : getCornerDrift(sample, currentPath, velocity.current, laneConfig.driftWindow);
    const steerAssist = 1;
    const driftTarget = cornerDrift * steerAssist;
    const driftRise = CAR_DRIFT_RESPONSE * THREE.MathUtils.lerp(1, CAR_DRIFT_SPEED_RESPONSE, speedRatio);
    const driftBlend = 1 - Math.exp(-(driftTarget === 0 ? CAR_DRIFT_DECAY : driftRise) * delta);
    driftVisual.current = THREE.MathUtils.lerp(driftVisual.current, driftTarget, driftBlend);
    const lateralGrip = THREE.MathUtils.lerp(1, CAR_LATERAL_GRIP, Math.abs(driftVisual.current) * speedRatio);
    const rearGrip = THREE.MathUtils.lerp(1, CAR_REAR_GRIP, Math.abs(driftVisual.current) * speedRatio);
    const preTurnSlide = getPreTurnSlide(sample, currentPath, steeringYaw.current, laneConfig.steeringLookahead) * speedRatio * laneConfig.slideScale;
    slipAngle.current = THREE.MathUtils.lerp(
      slipAngle.current,
      driftVisual.current * CAR_SLIP_MAX * speedRatio * rearGrip,
      1 - Math.exp(-8 * delta)
    );
    const guideForward = new THREE.Vector3(Math.sin(steeringYaw.current), 0, Math.cos(steeringYaw.current));
    const guideLateral = new THREE.Vector3(Math.cos(steeringYaw.current), 0, -Math.sin(steeringYaw.current));
    const frontTarget = sample.position
      .clone()
      .addScaledVector(guideForward, CAR_WHEELBASE * 0.5)
      .addScaledVector(guideLateral, -preTurnSlide * laneConfig.preTurnSlideDistance * 0.45)
      .addScaledVector(guideLateral, -driftVisual.current * laneConfig.frontDriftDistance * speedRatio * laneConfig.slideScale);
    frontAxle.current.copy(frontTarget);

    const rearTarget = frontAxle.current
      .clone()
      .addScaledVector(guideForward, -CAR_WHEELBASE)
      .addScaledVector(guideLateral, -preTurnSlide * laneConfig.preTurnSlideDistance)
      .addScaledVector(guideLateral, -driftVisual.current * laneConfig.rearDriftDistance * speedRatio * laneConfig.slideScale * (1.1 - lateralGrip * 0.35));
    rearAxle.current.lerp(rearTarget, 1 - Math.exp(-(8.5 * rearGrip) * delta));

    const vehicleDirection = frontAxle.current.clone().sub(rearAxle.current).normalize();
    const vehicleCenter = frontAxle.current.clone().add(rearAxle.current).multiplyScalar(0.5);
    const nearestPoi = findNearestPoi(cvPois, vehicleCenter, 1.45);
    if (nearestPoi?.id !== nearbyPoi.current?.id) {
      nearbyPoi.current = nearestPoi;
      onNearbyPoiChange?.(nearestPoi ?? null);
      if (nearestPoi) {
        setCheckpointTrigger((current) => ({ id: nearestPoi.id, nonce: current.nonce + 1 }));
        onOpenPoi?.(nearestPoi);
      }
    }
    const vehicleYaw = Math.atan2(vehicleDirection.x, vehicleDirection.z);
    playerYaw.current = vehicleYaw;
    visualCarPosition.current.lerp(vehicleCenter, 1 - Math.exp(-CAR_VISUAL_POSITION_SMOOTHNESS * delta));
    playerVelocity.current.set(Math.sin(vehicleYaw) * velocity.current, 0, Math.cos(vehicleYaw) * velocity.current);
    if (car) {
      car.position.copy(visualCarPosition.current).add(new THREE.Vector3(0, CAR_RIDE_HEIGHT, 0));
      car.rotation.y = THREE.MathUtils.lerp(car.rotation.y, normalizeAngleNear(car.rotation.y, vehicleYaw), 1 - Math.exp(-CAR_TURN_SMOOTHNESS * delta));
      if (carBody) carBody.rotation.x = THREE.MathUtils.lerp(carBody.rotation.x, 0, 1 - Math.exp(-8 * delta));

      const trackTransform = new THREE.Matrix4().makeRotationY(car.rotation.y).setPosition(visualCarPosition.current);
      const rearOffset = new THREE.Vector3(0, TIRE_TRACK_HEIGHT, CAR_REAR_TRACK_OFFSET);
      const leftOffset = new THREE.Vector3(-CAR_TRACK_WIDTH * 0.5, 0, 0);
      const rightOffset = new THREE.Vector3(CAR_TRACK_WIDTH * 0.5, 0, 0);
      driftFx.current.leftRear.copy(leftOffset.clone().add(rearOffset).applyMatrix4(trackTransform));
      driftFx.current.rightRear.copy(rightOffset.clone().add(rearOffset).applyMatrix4(trackTransform));
      const uTurnTrackDrift = uTurnProgress.current < 1 ? 0.7 : 0;
      driftFx.current.drift =
        Math.abs(driftVisual.current * speedRatio) > uTurnTrackDrift ? driftVisual.current * speedRatio : uTurnTrackDrift;
      driftFx.current.sparkLeft = Math.abs(driftVisual.current) > 0.55 && car.position.x < -roadLayout.houseTileWidth * 2.05;
      driftFx.current.sparkRight = Math.abs(driftVisual.current) > 0.55 && car.position.x > roadLayout.houseTileWidth * 2.05;
      if (Math.abs(velocity.current) > 0.05) {
        dustSources.current.push({
          position: car.position.clone(),
          yaw: car.rotation.y,
          intensity: THREE.MathUtils.clamp(Math.abs(velocity.current) / CAR_SPEED, 0.35, 1)
        });
      }
    }

    trafficCars.forEach((traffic, index) => {
      const rig = trafficRefs[index]?.current;
      const group = rig?.root;
      const body = rig?.body;
      if (!group) return;
      const bump = trafficBumps.current[index];
      const trafficPath = index % 2 === 0 ? path : oppositePath;
      const trafficLaneConfig = LANE_CONFIGS[index % 2 === 0 ? 0 : 1];
      const trafficSample = trafficPath.sample(wrap01(clock.elapsedTime * traffic.speed * 0.018 + traffic.offset));
      const trafficVelocity = traffic.speed * CAR_SPEED * 0.55;
      const trafficDrift = getCornerDrift(trafficSample, trafficPath, trafficVelocity, trafficLaneConfig.driftWindow) * 0.75;
      const trafficLateralDirection = new THREE.Vector3(Math.cos(trafficSample.yaw), 0, -Math.sin(trafficSample.yaw));
      group.position
        .copy(trafficSample.position)
        .add(trafficLateralDirection.multiplyScalar(-trafficDrift * CAR_DRIFT_DISTANCE * 0.55))
        .add(bump.offset)
        .add(new THREE.Vector3(0, CAR_RIDE_HEIGHT, 0));
      const toTraffic = group.position.clone().sub(visualCarPosition.current);
      toTraffic.y = 0;
      if (bump.cooldown <= 0 && toTraffic.lengthSq() < TRAFFIC_HIT_RADIUS * TRAFFIC_HIT_RADIUS) {
        const impulseDirection = toTraffic.lengthSq() > 0.001 ? toTraffic.normalize() : trafficLateralDirection.clone();
        bump.velocity.addScaledVector(impulseDirection, TRAFFIC_BUMP_IMPULSE);
        bump.velocity.y += 3.7;
        bump.yawVelocity += (Math.random() > 0.5 ? 1 : -1) * 6.4;
        bump.cooldown = 0.85;
      }
      bump.cooldown = Math.max(0, bump.cooldown - delta);
      bump.velocity.y -= 9.5 * delta;
      bump.offset.addScaledVector(bump.velocity, delta);
      if (bump.offset.y < 0) {
        bump.offset.y = 0;
        bump.velocity.y = Math.abs(bump.velocity.y) * 0.22;
        if (Math.abs(bump.velocity.y) < 0.08) bump.velocity.y = 0;
      }
      resolveBoundsCollision(bump.offset, bump.velocity, trafficSample.position, centralBounds, 0.62);
      const returnStrength = bump.cooldown > 0 ? 1.15 : TRAFFIC_RETURN_SPEED;
      bump.velocity.x *= 1 - Math.min(delta * 2.1, 0.88);
      bump.velocity.z *= 1 - Math.min(delta * 2.1, 0.88);
      bump.velocity.y *= 1 - Math.min(delta * 0.55, 0.4);
      bump.offset.lerp(new THREE.Vector3(0, 0, 0), 1 - Math.exp(-returnStrength * delta));
      bump.yawKick += bump.yawVelocity * delta;
      bump.yawVelocity *= 1 - Math.min(delta * 4.4, 0.92);
      bump.yawKick = THREE.MathUtils.lerp(bump.yawKick, 0, 1 - Math.exp(-TRAFFIC_YAW_RETURN_SPEED * delta));
      group.rotation.y = THREE.MathUtils.lerp(
        group.rotation.y,
        normalizeAngleNear(group.rotation.y, trafficSample.yaw + bump.yawKick),
        1 - Math.exp(-CAR_TURN_SMOOTHNESS * delta)
      );
      if (body) body.rotation.x = THREE.MathUtils.lerp(body.rotation.x, 0, 1 - Math.exp(-6 * delta));
      dustSources.current.push({
        position: group.position.clone(),
        yaw: group.rotation.y,
        intensity: THREE.MathUtils.clamp(traffic.speed, 0.35, 1)
      });
    });

    cameraOutsideDirection.current.lerp(getOutsideCameraDirection(vehicleCenter), 1 - Math.exp(-CAMERA_HEADING_SMOOTHNESS * delta));
    cameraOutsideDirection.current.normalize();
    const smoothedLookTarget = vehicleCenter.clone().add(new THREE.Vector3(0, 1.25, 0));
    lookTarget.current.lerp(smoothedLookTarget, 1 - Math.exp(-CAMERA_LOOK_SMOOTHNESS * delta));

    const desiredCamera = lookTarget.current
      .clone()
      .addScaledVector(cameraOutsideDirection.current, SIDE_VIEW_DISTANCE)
      .add(new THREE.Vector3(0, SIDE_VIEW_HEIGHT - 1.25, 0));
    camera.position.lerp(desiredCamera, 1 - Math.pow(0.001, delta));
    camera.lookAt(lookTarget.current);

  });

  buildingRefs.current = [];

  return (
    <>
      <Skybox />
      <SceneLighting />
      <PostProcessing />
      <fog attach="fog" args={['#d4e0e2', 46, 82]} />
      <ContactShadows position={[0, 0.035, 0]} opacity={0.3} scale={34} blur={2.1} far={8} resolution={1024} color="#2c3a40" />
      <Physics gravity={[0, -13.5, 0]} colliders={false} timeStep="vary">
        <RapierGround />
        <PlayerCarCollider position={visualCarPosition} yaw={playerYaw} />
        <BumpableObjects specs={bumpables} />
        <ModelInstances placements={roadLayout.placements} />
        <TouchingBuildingBlock models={centerBuildingModels} refsStore={buildingRefs} roadLayout={roadLayout} />
        <OuterBuildingRing refsStore={buildingRefs} roadLayout={roadLayout} />
        <CityGround />
        <CvMarkers pois={cvPois} checkpointTrigger={checkpointTrigger} />
      </Physics>
      <FollowCar ref={targetCar} />
      <TireTracks driftFx={driftFx} />
      <DriftSmoke driftFx={driftFx} />
      <VehicleDust sources={dustSources} />
      <DriftSparks driftFx={driftFx} />
      {trafficCars.map((traffic, index) => (
        <MovingCar key={`${traffic.model}:${index}`} ref={trafficRefs[index]} model={traffic.model} />
      ))}
    </>
  );
}

const trafficRefs = trafficCars.map(() => ({ current: { root: null, body: null } as CarRigRef }));

function CvMarkers({ pois, checkpointTrigger }: { pois: CvPoiMarker[]; checkpointTrigger: { id: string; nonce: number } }) {
  return (
    <>
      {pois.map((poi, index) => (
        <CvMarker
          key={poi.id}
          position={poi.position}
          index={index + 1}
          title={poi.title}
          shouldSpin={checkpointTrigger.id === poi.id}
          spinNonce={checkpointTrigger.nonce}
        />
      ))}
    </>
  );
}

function SceneLighting() {
  return (
    <>
      <ambientLight intensity={0.92} color="#f3fbff" />
      <hemisphereLight args={['#e5fbff', '#aeb8b5', 1.5]} />
      <directionalLight
        castShadow
        position={[-7.5, 11.5, 6.5]}
        intensity={1.95}
        color="#fff3dc"
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-18}
        shadow-camera-right={18}
        shadow-camera-top={18}
        shadow-camera-bottom={-18}
        shadow-camera-near={1}
        shadow-camera-far={34}
        shadow-bias={-0.00018}
        shadow-normalBias={0.045}
      />
    </>
  );
}

function PostProcessing() {
  const { gl, scene, camera, size } = useThree();
  const pipeline = useMemo(() => {
    const composer = new EffectComposer(gl);
    const renderPass = new RenderPass(scene, camera);
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(size.width, size.height), BLOOM_STRENGTH, BLOOM_RADIUS, BLOOM_THRESHOLD);
    const lutPass = new ShaderPass(portfolioLutShader);
    const outputPass = new OutputPass();
    composer.addPass(renderPass);
    composer.addPass(bloomPass);
    composer.addPass(lutPass);
    composer.addPass(outputPass);
    return { composer, bloomPass };
  }, [camera, gl, scene]);

  useEffect(() => {
    pipeline.composer.setSize(size.width, size.height);
    pipeline.bloomPass.setSize(size.width, size.height);
  }, [pipeline, size.height, size.width]);

  useEffect(
    () => () => {
      pipeline.composer.dispose();
    },
    [pipeline]
  );

  useFrame(() => {
    pipeline.composer.render();
  }, 1);

  return null;
}

const portfolioLutShader = {
  uniforms: {
    tDiffuse: { value: null },
    saturation: { value: 1.07 },
    contrast: { value: 1.03 },
    warmth: { value: 0.026 },
    lift: { value: 0.036 },
    vignette: { value: 0.12 }
  },
  vertexShader: `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`,
  fragmentShader: `
uniform sampler2D tDiffuse;
uniform float saturation;
uniform float contrast;
uniform float warmth;
uniform float lift;
uniform float vignette;
varying vec2 vUv;

void main() {
  vec4 base = texture2D(tDiffuse, vUv);
  vec3 color = base.rgb;
  color += vec3(warmth, warmth * 0.42, -warmth * 0.28);
  float luma = dot(color, vec3(0.299, 0.587, 0.114));
  color = mix(vec3(luma), color, saturation);
  color = (color - 0.5) * contrast + 0.5 + lift;
  float dist = distance(vUv, vec2(0.5));
  color *= 1.0 - smoothstep(0.42, 0.82, dist) * vignette;
  gl_FragColor = vec4(color, base.a);
}
`
};

function CvMarker({
  position,
  index,
  title,
  shouldSpin,
  spinNonce
}: {
  position: THREE.Vector3;
  index: number;
  title: string;
  shouldSpin: boolean;
  spinNonce: number;
}) {
  const board = useRef<THREE.Group>(null);
  const spinProgress = useRef(1);
  const yaw = useMemo(() => getCheckpointFacingYaw(position), [position]);
  const shortTitle = useMemo(() => title.replace('Unity ', '').replace(' & ', ' + '), [title]);
  const labelTexture = useMemo(() => createCheckpointLabelTexture(index, shortTitle), [index, shortTitle]);

  useEffect(
    () => () => {
      labelTexture.dispose();
    },
    [labelTexture]
  );

  useEffect(() => {
    if (shouldSpin) spinProgress.current = 0;
  }, [shouldSpin, spinNonce]);

  useFrame(({ clock }, delta) => {
    const marker = board.current;
    if (marker) {
      const idle = Math.sin(clock.elapsedTime * 2.4 + index) * 0.035;
      if (spinProgress.current < 1) spinProgress.current = Math.min(1, spinProgress.current + delta * 1.45);
      const eased = 1 - Math.pow(1 - spinProgress.current, 3);
      marker.position.y = position.y + 0.72 + idle;
      marker.rotation.y = yaw + Math.PI * 2 * 3 * eased;
    }
  });

  return (
    <group position={position}>
      <group ref={board} rotation={[0, yaw, 0]}>
        <mesh castShadow>
          <boxGeometry args={[1.08, 0.5, 0.08]} />
          <meshStandardMaterial color="#101820" roughness={0.68} metalness={0} emissive="#071017" emissiveIntensity={0.18} />
        </mesh>
        <mesh position={[0, 0, 0.045]}>
          <planeGeometry args={[1.08, 0.5]} />
          <meshBasicMaterial map={labelTexture} transparent toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, 0, -0.045]} rotation={[0, Math.PI, 0]}>
          <planeGeometry args={[1.08, 0.5]} />
          <meshBasicMaterial map={labelTexture} transparent toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
      </group>
    </group>
  );
}

function getCheckpointFacingYaw(position: THREE.Vector3) {
  if (Math.abs(position.x) > Math.abs(position.z)) return position.x > 0 ? -Math.PI / 2 : Math.PI / 2;
  return position.z > 0 ? Math.PI : 0;
}

function createCheckpointLabelTexture(index: number, title: string) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 224;
  const context = canvas.getContext('2d');
  if (context) {
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = '#101820';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = '#49ffb2';
    context.beginPath();
    context.arc(92, 112, 56, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#101820';
    context.font = '900 58px Inter, Arial, sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(String(index).padStart(2, '0'), 92, 112);
    context.textAlign = 'left';
    context.fillStyle = '#9fe9d2';
    context.font = '900 24px Inter, Arial, sans-serif';
    context.fillText('CHECKPOINT', 170, 82);
    context.fillStyle = '#f4fff9';
    context.font = '900 34px Inter, Arial, sans-serif';
    context.fillText(title.slice(0, 22), 170, 126);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

function RapierGround() {
  return (
    <RigidBody type="fixed" colliders={false}>
      <CuboidCollider args={[30, 0.08, 30]} position={[0, -0.12, 0]} friction={1.05} restitution={0.05} />
    </RigidBody>
  );
}

function PlayerCarCollider({ position, yaw }: { position: MutableRefObject<THREE.Vector3>; yaw: MutableRefObject<number> }) {
  const body = useRef<RapierRigidBody>(null);
  const rotation = useMemo(() => new THREE.Quaternion(), []);

  useFrame(() => {
    body.current?.setNextKinematicTranslation({
      x: position.current.x,
      y: CAR_RIDE_HEIGHT + 0.28,
      z: position.current.z
    });
    rotation.setFromEuler(new THREE.Euler(0, yaw.current, 0));
    body.current?.setNextKinematicRotation({ x: rotation.x, y: rotation.y, z: rotation.z, w: rotation.w });
  });

  return (
    <RigidBody ref={body} type="kinematicPosition" colliders={false} position={[0, CAR_RIDE_HEIGHT + 0.28, 0]}>
      <CuboidCollider args={[0.48, 0.26, 0.82]} friction={0.85} restitution={0.18} />
    </RigidBody>
  );
}

function BumpableObjects({ specs }: { specs: BumpableSpec[] }) {
  return (
    <>
      {specs.map((spec) => (
        <BumpableObject key={spec.id} spec={spec} />
      ))}
    </>
  );
}

function BumpableObject({ spec }: { spec: BumpableSpec }) {
  const size = spec.size ?? [0.56, 0.56, 0.56];
  const collider = getBumpableCollider(spec, size);

  return (
    <RigidBody
      type="dynamic"
      colliders={false}
      position={spec.position}
      rotation={[0, spec.rotation ?? 0, 0]}
      linearDamping={1.75}
      angularDamping={1.15}
      friction={1.05}
      restitution={0.22}
      canSleep
      ccd
    >
      <CuboidCollider args={collider.args} position={collider.position} friction={1.05} restitution={0.22} density={spec.kind === 'text' ? 0.32 : 0.56} />
      <group scale={spec.scale ?? 1}>
      {spec.kind === 'text' ? (
        <Center position={[0, 0.38, 0]} rotation={[0, 0, 0]}>
          <Text3D font={TEXT_3D_FONT} size={0.48} height={0.1} curveSegments={6} bevelEnabled bevelSize={0.014} bevelThickness={0.014}>
            {spec.label}
            <meshStandardMaterial
              color={spec.color ?? '#4dffb8'}
              emissive={spec.color ?? '#4dffb8'}
              emissiveIntensity={0.32}
              roughness={0.68}
              metalness={0}
            />
          </Text3D>
        </Center>
      ) : spec.kind === 'block' ? (
        <CrashBlock size={spec.size ?? [0.56, 0.56, 0.56]} color={spec.color ?? '#f2c55c'} />
      ) : (
        <DynamicCityModel model={spec.model ?? 'box_A'} />
      )}
      </group>
    </RigidBody>
  );
}

function getBumpableCollider(spec: BumpableSpec, size: [number, number, number]) {
  if (spec.kind === 'text') return { args: [0.28, 0.38, 0.14] as [number, number, number], position: [0, 0.42, 0.05] as [number, number, number] };
  if (spec.kind === 'block') {
    return {
      args: [size[0] * 0.5, size[1] * 0.5, size[2] * 0.5] as [number, number, number],
      position: [0, size[1] * 0.5 + 0.04, 0] as [number, number, number]
    };
  }
  return { args: [0.4, 0.35, 0.4] as [number, number, number], position: [0, 0.36, 0] as [number, number, number] };
}

function CrashBlock({ size, color }: { size: [number, number, number]; color: string }) {
  return (
    <mesh position={[0, size[1] * 0.5 + 0.04, 0]} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={0.72} metalness={0} emissive={color} emissiveIntensity={0.035} />
    </mesh>
  );
}

function DynamicCityModel({ model }: { model: Extract<ModelName, 'box_A' | 'box_B' | 'dumpster' | 'trash_A' | 'trash_B'> }) {
  const gltf = useGLTF(`${ASSET_BASE}/${model}.gltf`);
  const scene = useMemo(() => cloneFlatScene(gltf.scene), [gltf.scene]);
  return <primitive object={scene} />;
}

function Skybox() {
  const [texture] = useLoader(THREE.CubeTextureLoader, [
    [
      `${SKYBOX_BASE}/px.png`,
      `${SKYBOX_BASE}/nx.png`,
      `${SKYBOX_BASE}/py.png`,
      `${SKYBOX_BASE}/ny.png`,
      `${SKYBOX_BASE}/pz.png`,
      `${SKYBOX_BASE}/nz.png`
    ]
  ] as unknown as string[]) as unknown as THREE.CubeTexture[];
  texture.colorSpace = THREE.SRGBColorSpace;
  return <primitive attach="background" object={texture} />;
}

function CityGround() {
  return (
    <mesh position={[0, -0.08, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[58, 58]} />
      <meshStandardMaterial color="#aebcc0" roughness={0.94} metalness={0} />
    </mesh>
  );
}

function BuildingGroup({
  buildings,
  refsStore
}: {
  buildings: BuildingPlacement[];
  refsStore: MutableRefObject<Array<{ group: THREE.Group; position: THREE.Vector3; radius: number }>>;
}) {
  return (
    <>
      {buildings.map((building, index) => (
        <PlacedCityModel
          key={`${building.model}:${building.position.join(':')}:${index}`}
          placement={building}
          onGroup={(group) => {
            refsStore.current.push({ group, position: new THREE.Vector3(...building.position), radius: building.radius });
          }}
        />
      ))}
    </>
  );
}

function TouchingBuildingBlock({
  models,
  refsStore,
  roadLayout
}: {
  models: BuildingLayoutModel[];
  refsStore: MutableRefObject<Array<{ group: THREE.Group; position: THREE.Vector3; radius: number }>>;
  roadLayout: { houseTileWidth: number; houseTileDepth: number };
}) {
  const scenes = useCenterBuildingScenes();
  const placements = useMemo(() => {
    const rows = [models.slice(0, 4), models.slice(4, 8), models.slice(8, 12), models.slice(12, 16)];
    const rowOffset = (rows.length - 1) / 2;

    return rows.flatMap((row, rowIndex) => {
      const z = (rowIndex - rowOffset) * roadLayout.houseTileDepth;

      return row.map((building, index) => {
        const rotation = index === 0 ? -Math.PI / 2 : index === row.length - 1 ? Math.PI / 2 : rowIndex < rows.length / 2 ? Math.PI : 0;
        const footprint = measureRotatedFootprint(scenes[building.model], rotation);
        const x = (index - 1.5) * roadLayout.houseTileWidth;
        return {
          model: building.model,
          position: [x, 0, z] as [number, number, number],
          rotation,
          radius: Math.max(footprint.width, footprint.depth) / 2
        } satisfies BuildingPlacement;
      });
    });
  }, [models, roadLayout, scenes]);

  return <BuildingGroup buildings={placements} refsStore={refsStore} />;
}

function OuterBuildingRing({
  refsStore,
  roadLayout
}: {
  refsStore: MutableRefObject<Array<{ group: THREE.Group; position: THREE.Vector3; radius: number }>>;
  roadLayout: { houseTileWidth: number; houseTileDepth: number };
}) {
  const scenes = useCenterBuildingScenes();
  const placements = useMemo(() => {
    const sideX = roadLayout.houseTileWidth * 4.65;
    const nearZ = roadLayout.houseTileDepth * 4.55;
    const farZ = roadLayout.houseTileDepth * -4.55;
    const rowX = [-2.55, -0.85, 0.85, 2.55].map((value) => value * roadLayout.houseTileWidth);
    const sideZ = [-1.95, -0.65, 0.65, 1.95].map((value) => value * roadLayout.houseTileDepth);
    const base: BuildingPlacement[] = [
      ...rowX.map((x, index) => ({
        model: (['building_F', 'building_G', 'building_H', 'building_E'] as const)[index],
        position: [x, 0, farZ] as [number, number, number],
        rotation: 0,
        scale: 1.12,
        radius: 1
      })),
      ...rowX.map((x, index) => ({
        model: (['building_H', 'building_F', 'building_G', 'building_E'] as const)[index],
        position: [x, 0, nearZ] as [number, number, number],
        rotation: Math.PI,
        scale: 1.12,
        radius: 1
      })),
      ...sideZ.map((z, index) => ({
        model: (['building_G', 'building_H', 'building_F', 'building_E'] as const)[index],
        position: [-sideX, 0, z] as [number, number, number],
        rotation: Math.PI / 2,
        scale: 1.18,
        radius: 1
      })),
      ...sideZ.map((z, index) => ({
        model: (['building_F', 'building_G', 'building_H', 'building_E'] as const)[index],
        position: [sideX, 0, z] as [number, number, number],
        rotation: -Math.PI / 2,
        scale: 1.18,
        radius: 1
      }))
    ];

    return base.map((building) => {
      const footprint = measureRotatedFootprint(scenes[building.model as keyof typeof scenes], building.rotation ?? 0);
      return {
        ...building,
        radius: (Math.max(footprint.width, footprint.depth) * (building.scale ?? 1)) / 2
      };
    });
  }, [roadLayout, scenes]);

  return <BuildingGroup buildings={placements} refsStore={refsStore} />;
}

function ModelInstances({ placements }: { placements: Placement[] }) {
  const groups = useMemo(() => groupPlacements(placements), [placements]);
  return (
    <>
      {Array.from(groups.entries()).map(([model, modelPlacements]) => (
        <InstancedModel key={model} model={model} placements={modelPlacements} />
      ))}
    </>
  );
}

function InstancedModel({ model, placements }: { model: ModelName; placements: Placement[] }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const { geometry, material } = useCityMesh(model);

  useEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const matrix = new THREE.Matrix4();
    placements.forEach((placement, index) => {
      matrix.compose(
        new THREE.Vector3(...placement.position),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(0, placement.rotation ?? 0, 0)),
        new THREE.Vector3(placement.scale ?? 1, placement.scale ?? 1, placement.scale ?? 1)
      );
      mesh.setMatrixAt(index, matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [placements]);

  return <instancedMesh ref={ref} args={[geometry, material, placements.length]} castShadow receiveShadow />;
}

function PlacedCityModel({ placement, onGroup }: { placement: BuildingPlacement; onGroup?: (group: THREE.Group) => void }) {
  const ref = useRef<THREE.Group>(null);
  const gltf = useGLTF(`${ASSET_BASE}/${placement.model}.gltf`);
  const scene = useMemo(() => cloneFlatScene(gltf.scene), [gltf.scene]);
  const scale = placement.scale ?? 1;
  const colliderHalfExtent = Math.max(0.48, placement.radius * 0.74);
  const colliderHalfHeight = Math.max(0.92, 1.18 * scale);

  useEffect(() => {
    if (ref.current && onGroup) onGroup(ref.current);
  }, [onGroup]);

  return (
    <RigidBody
      type="fixed"
      colliders={false}
      position={placement.position}
      rotation={[0, placement.rotation ?? 0, 0]}
      friction={0.98}
      restitution={0.08}
    >
      <CuboidCollider
        args={[colliderHalfExtent, colliderHalfHeight, colliderHalfExtent]}
        position={[0, colliderHalfHeight, 0]}
        friction={0.98}
        restitution={0.08}
      />
      <group ref={ref} scale={scale}>
        <primitive object={scene} />
      </group>
    </RigidBody>
  );
}

const FollowCar = forwardRef<CarRigRef>(function FollowCar(_, ref) {
  return <ReferencedCityModel refObject={ref} model="car_sedan" />;
});

const MovingCar = forwardRef<CarRigRef, { model: ModelName }>(function MovingCar({ model }, ref) {
  return <ReferencedCityModel refObject={ref} model={model} />;
});

function ReferencedCityModel({
  model,
  refObject
}: {
  model: ModelName;
  refObject: Ref<CarRigRef>;
}) {
  const rootRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Group>(null);
  const gltf = useGLTF(`${ASSET_BASE}/${model}.gltf`);
  const scene = useMemo(() => cloneFlatScene(gltf.scene), [gltf.scene]);

  useEffect(() => {
    if (typeof refObject === 'function') {
      refObject({ root: rootRef.current, body: bodyRef.current });
      return;
    }
    if (refObject) refObject.current = { root: rootRef.current, body: bodyRef.current };
  }, [refObject]);

  return (
    <group ref={rootRef}>
      <group ref={bodyRef}>
        <primitive object={scene} />
      </group>
    </group>
  );
}

function DebugPath({ points, color }: { points: THREE.Vector3[]; color: string }) {
  const line = useMemo(
    () =>
      new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([...points, points[0]]),
        new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.9 })
      ),
    [color, points]
  );

  return <primitive object={line} position={[0, 0.04, 0]} />;
}

function AxleDebugPaths({
  frontAxle,
  rearAxle
}: {
  frontAxle: MutableRefObject<THREE.Vector3>;
  rearAxle: MutableRefObject<THREE.Vector3>;
}) {
  const front = useRef<Array<THREE.Vector3 | null>>(Array(120).fill(null));
  const rear = useRef<Array<THREE.Vector3 | null>>(Array(120).fill(null));
  const frontLine = useMemo(
    () => new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: '#40a9ff', transparent: true, opacity: 0.9 })),
    []
  );
  const rearLine = useMemo(
    () => new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: '#fa8c16', transparent: true, opacity: 0.9 })),
    []
  );
  const lastStamp = useRef(0);

  useFrame((_, delta) => {
    lastStamp.current += delta;
    if (lastStamp.current < 0.03) return;
    lastStamp.current = 0;
    front.current = [...front.current.slice(1), frontAxle.current.clone()];
    rear.current = [...rear.current.slice(1), rearAxle.current.clone()];
    updateTrackGeometry(frontLine, front.current);
    updateTrackGeometry(rearLine, rear.current);
  });

  return (
    <>
      <primitive object={frontLine} position={[0, 0.06, 0]} />
      <primitive object={rearLine} position={[0, 0.06, 0]} />
    </>
  );
}

function TireTracks({ driftFx }: { driftFx: MutableRefObject<DriftFxState> }) {
  const left = useRef<Array<THREE.Vector3 | null>>(Array(TIRE_TRACK_POINTS).fill(null));
  const right = useRef<Array<THREE.Vector3 | null>>(Array(TIRE_TRACK_POINTS).fill(null));
  const leftLine = useMemo(
    () => new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: '#2a2a2a', transparent: true, opacity: 0.55 })),
    []
  );
  const rightLine = useMemo(
    () => new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: '#2a2a2a', transparent: true, opacity: 0.55 })),
    []
  );
  const wasTracking = useRef(false);

  useFrame(() => {
    if (Math.abs(driftFx.current.drift) < 0.08) {
      if (wasTracking.current) {
        left.current = [...left.current.slice(1), null];
        right.current = [...right.current.slice(1), null];
        updateTrackGeometry(leftLine, left.current);
        updateTrackGeometry(rightLine, right.current);
      }
      wasTracking.current = false;
      return;
    }
    wasTracking.current = true;
    left.current = [...left.current.slice(1), driftFx.current.leftRear.clone()];
    right.current = [...right.current.slice(1), driftFx.current.rightRear.clone()];
    updateTrackGeometry(leftLine, left.current);
    updateTrackGeometry(rightLine, right.current);
  });

  return (
    <>
      <primitive object={leftLine} />
      <primitive object={rightLine} />
    </>
  );
}

function DriftSmoke({ driftFx }: { driftFx: MutableRefObject<DriftFxState> }) {
  const particles = useRef<SmokeParticle[]>(Array.from({ length: SMOKE_PARTICLES }, () => ({ position: new THREE.Vector3(0, -999, 0), age: 1, size: 0 })));
  const points = useRef<THREE.Points>(null);
  const emitToggle = useRef(false);

  useFrame((_, delta) => {
    const drift = Math.abs(driftFx.current.drift);
    particles.current.forEach((particle) => {
      if (particle.age < 1) {
        particle.age = Math.min(1, particle.age + delta * 0.85);
        particle.position.y += delta * 0.35;
        particle.size += delta * 0.18;
      }
    });

    if (drift > 0.2) {
      emitToggle.current = !emitToggle.current;
      const source = emitToggle.current ? driftFx.current.leftRear : driftFx.current.rightRear;
      const particle = particles.current.find((item) => item.age >= 1);
      if (particle) {
        particle.position.copy(source).add(new THREE.Vector3(0, 0.08, 0));
        particle.age = 0;
        particle.size = 0.18 + drift * 0.12;
      }
    }

    updateSmokeGeometry(points.current, particles.current);
  });

  return (
    <points ref={points}>
      <bufferGeometry />
      <pointsMaterial color="#c8cdd2" size={0.45} transparent opacity={0.4} depthWrite={false} />
    </points>
  );
}

function VehicleDust({ sources }: { sources: MutableRefObject<DustSource[]> }) {
  const particles = useRef<DustParticle[]>(
    Array.from({ length: VEHICLE_DUST_PARTICLES }, () => ({
      position: new THREE.Vector3(0, -999, 0),
      velocity: new THREE.Vector3(),
      age: 1,
      size: 0
    }))
  );
  const points = useRef<THREE.Points>(null);
  const emitCursor = useRef(0);
  const positions = useMemo(() => new Float32Array(VEHICLE_DUST_PARTICLES * 3), []);
  const sizes = useMemo(() => new Float32Array(VEHICLE_DUST_PARTICLES), []);
  const dustTexture = useMemo(() => createRoundParticleTexture(), []);

  useFrame((_, delta) => {
    particles.current.forEach((particle) => {
      if (particle.age < 1) {
        particle.age = Math.min(1, particle.age + delta * 0.75);
        particle.position.addScaledVector(particle.velocity, delta);
        particle.velocity.multiplyScalar(1 - Math.min(delta * 1.8, 0.85));
        particle.position.y += delta * 0.08;
        particle.size += delta * 1.8;
      }
    });

    sources.current.forEach((source) => {
      if (source.intensity <= 0) return;
      const yaw = source.yaw;
      const forward = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
      const lateral = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
      const burstCount = source.intensity > 0.75 ? 3 : 2;
      for (let burst = 0; burst < burstCount; burst += 1) {
        const particle = particles.current[emitCursor.current % particles.current.length];
        emitCursor.current += 1;
        particle.position
          .copy(source.position)
          .addScaledVector(forward, -0.78 - Math.random() * 0.22)
          .addScaledVector(lateral, (Math.random() - 0.5) * 0.22);
        particle.position.y = 0.22 + Math.random() * 0.05;
        particle.velocity
          .copy(forward)
          .multiplyScalar(-0.14 - Math.random() * 0.12)
          .addScaledVector(lateral, (Math.random() - 0.5) * 0.14);
        particle.age = 0;
        particle.size = 0.18 + source.intensity * 0.12 + Math.random() * 0.08;
      }
    });

    particles.current.forEach((particle, index) => {
      const offset = index * 3;
      if (particle.age >= 1) {
        positions[offset] = 0;
        positions[offset + 1] = -999;
        positions[offset + 2] = 0;
        sizes[index] = 0;
        return;
      }
      positions[offset] = particle.position.x;
      positions[offset + 1] = particle.position.y;
      positions[offset + 2] = particle.position.z;
      sizes[index] = particle.size * (0.65 + particle.age * 1.8);
    });
    const geometry = points.current?.geometry as THREE.BufferGeometry | undefined;
    if (!geometry) return;
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.size.needsUpdate = true;
  });

  return (
    <points ref={points} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-size" args={[sizes, 1]} />
      </bufferGeometry>
      <shaderMaterial
        transparent
        depthWrite={false}
        uniforms={{ pointTexture: { value: dustTexture }, color: { value: new THREE.Color('#ffffff') }, opacity: { value: 0.72 } }}
        vertexShader={dustVertexShader}
        fragmentShader={dustFragmentShader}
      />
    </points>
  );
}

const dustVertexShader = `
attribute float size;
varying float vAlpha;
void main() {
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = size * (260.0 / max(1.0, -mvPosition.z));
  gl_Position = projectionMatrix * mvPosition;
  vAlpha = clamp(size * 1.5, 0.0, 1.0);
}
`;

const dustFragmentShader = `
uniform sampler2D pointTexture;
uniform vec3 color;
uniform float opacity;
varying float vAlpha;
void main() {
  vec4 texel = texture2D(pointTexture, gl_PointCoord);
  gl_FragColor = vec4(color, texel.a * opacity * vAlpha);
}
`;

function createRoundParticleTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const context = canvas.getContext('2d');
  if (context) {
    const gradient = context.createRadialGradient(32, 32, 4, 32, 32, 30);
    gradient.addColorStop(0, 'rgba(255,255,255,0.9)');
    gradient.addColorStop(0.45, 'rgba(255,255,255,0.5)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 64, 64);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function DriftSparks({ driftFx }: { driftFx: MutableRefObject<DriftFxState> }) {
  const positions = useMemo(() => new Float32Array(18), []);
  const points = useRef<THREE.Points>(null);

  useFrame(() => {
    const anchors = [
      driftFx.current.sparkLeft ? driftFx.current.leftRear : null,
      driftFx.current.sparkRight ? driftFx.current.rightRear : null
    ];
    for (let i = 0; i < 6; i += 1) {
      const anchor = anchors[i % anchors.length] ?? null;
      const offset = i * 3;
      if (!anchor) {
        positions[offset] = 0;
        positions[offset + 1] = -999;
        positions[offset + 2] = 0;
        continue;
      }
      positions[offset] = anchor.x + (Math.random() - 0.5) * 0.18;
      positions[offset + 1] = anchor.y + 0.03 + Math.random() * 0.08;
      positions[offset + 2] = anchor.z + (Math.random() - 0.5) * 0.18;
    }
    const geometry = points.current?.geometry as THREE.BufferGeometry | undefined;
    if (!geometry) return;
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={points}>
      <bufferGeometry />
      <pointsMaterial color="#ffbf66" size={0.12} transparent opacity={0.9} depthWrite={false} />
    </points>
  );
}

function useCityMesh(model: ModelName) {
  const gltf = useGLTF(`${ASSET_BASE}/${model}.gltf`);
  return useMemo(() => {
    const source = findFirstMesh(gltf.scene);
    if (!source) throw new Error(`City model ${model} has no mesh.`);
    return {
      geometry: source.geometry,
      material: makeFlatMaterial(source)
    };
  }, [gltf.scene, model]);
}

function cloneFlatScene(scene: THREE.Group) {
  const clone = scene.clone(true);
  clone.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.material = makeFlatMaterial(child);
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
  return clone;
}

function useCenterBuildingScenes() {
  const buildingA = useGLTF(`${ASSET_BASE}/building_A.gltf`);
  const buildingB = useGLTF(`${ASSET_BASE}/building_B.gltf`);
  const buildingC = useGLTF(`${ASSET_BASE}/building_C.gltf`);
  const buildingD = useGLTF(`${ASSET_BASE}/building_D.gltf`);
  const buildingE = useGLTF(`${ASSET_BASE}/building_E.gltf`);
  const buildingF = useGLTF(`${ASSET_BASE}/building_F.gltf`);
  const buildingG = useGLTF(`${ASSET_BASE}/building_G.gltf`);
  const buildingH = useGLTF(`${ASSET_BASE}/building_H.gltf`);

  return useMemo(
    () => ({
      building_A: buildingA.scene,
      building_B: buildingB.scene,
      building_C: buildingC.scene,
      building_D: buildingD.scene,
      building_E: buildingE.scene,
      building_F: buildingF.scene,
      building_G: buildingG.scene,
      building_H: buildingH.scene
    }),
    [buildingA.scene, buildingB.scene, buildingC.scene, buildingD.scene, buildingE.scene, buildingF.scene, buildingG.scene, buildingH.scene]
  );
}

function useRoadScenes() {
  const roadStraight = useGLTF(`${ASSET_BASE}/road_straight.gltf`);
  const roadCorner = useGLTF(`${ASSET_BASE}/road_corner.gltf`);

  return useMemo(
    () => ({
      road_straight: roadStraight.scene,
      road_corner: roadCorner.scene
    }),
    [roadStraight.scene, roadCorner.scene]
  );
}

function makeFlatMaterial(mesh: THREE.Mesh) {
  const material = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
  const standard = material instanceof THREE.MeshStandardMaterial ? material : null;
  const texture = standard?.map ?? null;
  if (texture) {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestMipmapNearestFilter;
    texture.needsUpdate = true;
  }
  return new THREE.MeshStandardMaterial({
    map: texture,
    side: THREE.FrontSide,
    roughness: 0.82,
    metalness: 0,
    color: '#ffffff',
    emissive: '#151515',
    emissiveIntensity: 0.08
  });
}

function findFirstMesh(scene: THREE.Group) {
  const meshes: THREE.Mesh[] = [];
  scene.traverse((child) => {
    if (child instanceof THREE.Mesh) meshes.push(child);
  });
  return meshes[0] ?? null;
}

function measureRotatedFootprint(scene: THREE.Group, rotation: number) {
  const box = new THREE.Box3().setFromObject(scene);
  const size = box.getSize(new THREE.Vector3());
  const normalized = Math.abs(rotation % Math.PI) < 0.001 ? size : new THREE.Vector3(size.z, size.y, size.x);
  return { width: normalized.x, depth: normalized.z };
}

function makeRoadLayout(roadScenes: { road_straight: THREE.Group; road_corner: THREE.Group }) {
  const straight = measureRotatedFootprint(roadScenes.road_straight, 0);
  const houseTileWidth = straight.width;
  const houseTileDepth = straight.depth;
  const loopMinX = -2.5 * houseTileWidth;
  const loopMaxX = 2.5 * houseTileWidth;
  const loopMinZ = -2.5 * houseTileDepth;
  const loopMaxZ = 2.5 * houseTileDepth;

  return {
    houseTileWidth,
    houseTileDepth,
    lanes: [
      makeLanePath(loopMinX, loopMaxX, loopMinZ, loopMaxZ, houseTileWidth, houseTileDepth, LANE_CONFIGS[0], false),
      makeLanePath(loopMinX, loopMaxX, loopMinZ, loopMaxZ, houseTileWidth, houseTileDepth, LANE_CONFIGS[1], true)
    ],
    placements: [
      ...[-1.5, -0.5, 0.5, 1.5].map(
        (x) =>
          ({ model: 'road_straight' as const, position: [x * houseTileWidth, 0, loopMinZ] as [number, number, number], rotation: Math.PI / 2 })
      ),
      ...[-1.5, -0.5, 0.5, 1.5].map(
        (x) =>
          ({ model: 'road_straight' as const, position: [x * houseTileWidth, 0, loopMaxZ] as [number, number, number], rotation: Math.PI / 2 })
      ),
      ...[-1.5, -0.5, 0.5, 1.5].map(
        (z) => ({ model: 'road_straight' as const, position: [loopMinX, 0, z * houseTileDepth] as [number, number, number] })
      ),
      ...[-1.5, -0.5, 0.5, 1.5].map(
        (z) => ({ model: 'road_straight' as const, position: [loopMaxX, 0, z * houseTileDepth] as [number, number, number] })
      ),
      { model: 'road_corner' as const, position: [loopMinX, 0, loopMinZ] as [number, number, number], rotation: 0 },
      { model: 'road_corner' as const, position: [loopMaxX, 0, loopMinZ] as [number, number, number], rotation: -Math.PI / 2 },
      { model: 'road_corner' as const, position: [loopMaxX, 0, loopMaxZ] as [number, number, number], rotation: Math.PI },
      { model: 'road_corner' as const, position: [loopMinX, 0, loopMaxZ] as [number, number, number], rotation: Math.PI / 2 }
    ] satisfies Placement[]
  };
}

function makeCvPois(roadLayout: { houseTileWidth: number; houseTileDepth: number }): CvPoiMarker[] {
  const w = roadLayout.houseTileWidth;
  const d = roadLayout.houseTileDepth;
  return [
    {
      id: 'profile',
      title: 'Unity Game Developer',
      meta: '4+ years building mobile and WebGL games in production teams',
      tech: ['Unity', 'C#', 'Mobile', 'WebGL'],
      bullets: [
        'Ships gameplay features for Android and WebGL projects across small and mid-sized teams.',
        'Focuses on player controls, moment-to-moment feel, UI flow, optimization, and release support.',
        'Uses this portfolio scene to demonstrate interactive implementation, not only static CV content.'
      ],
      position: new THREE.Vector3(0, 0.08, 2.12 * d)
    },
    {
      id: 'gameplay',
      title: 'Gameplay Systems',
      meta: 'Controls, combat, AI behavior, missions, levels, and vehicle feel',
      tech: ['Input', 'Camera', 'AI', 'Physics Feel'],
      bullets: [
        'Implemented movement, combat, AI behavior, mission flow, and player interaction systems.',
        'Built level content and tuned progression for mobile gameplay loops.',
        'Iterates through playtesting: camera framing, road alignment, collision feel, particles, and feedback timing.'
      ],
      position: new THREE.Vector3(0, 0.08, -2.12 * d)
    },
    {
      id: 'skills',
      title: 'Optimization & Tools',
      meta: 'Mobile performance, WebGL constraints, debug workflow, and asset integration',
      tech: ['Profiling', 'Firebase', 'AdMob', 'Git'],
      bullets: [
        'Works with performance-sensitive gameplay, including physics-heavy mobile interactions.',
        'Integrates analytics, ads, assets, UI screens, and build-ready workflows for production delivery.',
        'Comfortable debugging across Unity, browser builds, Git workflow, and frontend tooling.'
      ],
      position: new THREE.Vector3(-2.14 * w, 0.08, 0)
    },
    {
      id: 'experience',
      title: 'Multiplayer & Services',
      meta: 'Client features for multiplayer/WebGL projects and live-service integrations',
      tech: ['Photon Fusion', 'Nakama', 'Firebase', 'API'],
      bullets: [
        'Supported multiplayer gameplay flows using Photon Fusion and Nakama-backed client work.',
        'Integrated Firebase analytics, AdMob monetization, API handling, and multilingual UI support.',
        'Understands the handoff between gameplay code, UI/UX, backend services, and release validation.'
      ],
      position: new THREE.Vector3(2.14 * w, 0.08, 0)
    },
  ];
}

function makeBumpables(roadLayout: { houseTileWidth: number; houseTileDepth: number }): BumpableSpec[] {
  const w = roadLayout.houseTileWidth;
  const d = roadLayout.houseTileDepth;
  const bounds = makeCentralCollisionBounds(roadLayout);
  return sanitizeBumpableSpawns(
    [
      ...makeBumpableLetters('gameplay', 'GAMEPLAY', '#49ffb2', new THREE.Vector3(0.65 * w, BUMPABLE_GROUND_Y, -2.62 * d), 0),
      ...makeBumpableLetters('unity', 'UNITY', '#8df7ff', new THREE.Vector3(-0.55 * w, BUMPABLE_GROUND_Y, 2.62 * d), Math.PI),
      ...makeBumpableLetters('r3f', 'R3F', '#ffe66d', new THREE.Vector3(-2.62 * w, BUMPABLE_GROUND_Y, 0.88 * d), -Math.PI / 2),
      ...makeBumpableLetters('cv', 'CV', '#ff9df3', new THREE.Vector3(2.62 * w, BUMPABLE_GROUND_Y, -0.9 * d), Math.PI / 2),
      ...makeCrashBlockRow('north-boxes', new THREE.Vector3(-1.65 * w, BUMPABLE_GROUND_Y, -2.62 * d), 0, 5, '#ffcf5a'),
      ...makeCrashBlockRow('south-boxes', new THREE.Vector3(1.72 * w, BUMPABLE_GROUND_Y, 2.62 * d), Math.PI, 5, '#7de3ff'),
      ...makeCrashBlockStack('west-stack', new THREE.Vector3(-2.62 * w, BUMPABLE_GROUND_Y, -1.35 * d), '#ff8f70'),
      ...makeCrashBlockStack('east-stack', new THREE.Vector3(2.62 * w, BUMPABLE_GROUND_Y, 1.38 * d), '#9ff27b'),
      ...makeCrashSlalom('corner-slalom-a', new THREE.Vector3(-2.62 * w, BUMPABLE_GROUND_Y, 1.58 * d), -Math.PI / 2, '#f7f0a5'),
      ...makeCrashSlalom('corner-slalom-b', new THREE.Vector3(2.62 * w, BUMPABLE_GROUND_Y, -1.58 * d), Math.PI / 2, '#ff9df3'),
      {
        id: 'box-left-a',
        kind: 'box',
        model: 'box_A',
        position: new THREE.Vector3(-2.62 * w, BUMPABLE_GROUND_Y, -1.85 * d),
        rotation: Math.PI / 5,
        scale: 1.15,
        radius: 0.65
      },
      {
        id: 'box-right-b',
        kind: 'box',
        model: 'box_B',
        position: new THREE.Vector3(2.62 * w, BUMPABLE_GROUND_Y, 1.78 * d),
        rotation: -Math.PI / 7,
        scale: 1.15,
        radius: 0.65
      },
      {
        id: 'trash-top',
        kind: 'box',
        model: 'trash_A',
        position: new THREE.Vector3(1.72 * w, BUMPABLE_GROUND_Y, -2.62 * d),
        rotation: Math.PI / 2,
        scale: 1,
        radius: 0.58
      },
      {
        id: 'trash-bottom',
        kind: 'box',
        model: 'trash_B',
        position: new THREE.Vector3(1.25 * w, BUMPABLE_GROUND_Y, 2.62 * d),
        rotation: -Math.PI / 2,
        scale: 1,
        radius: 0.58
      }
    ],
    bounds
  );
}

function makeBumpableLetters(id: string, label: string, color: string, center: THREE.Vector3, rotation: number): BumpableSpec[] {
  const spacing = 0.48;
  const right = new THREE.Vector3(Math.cos(rotation), 0, -Math.sin(rotation));
  const start = -(label.length - 1) * 0.5;
  return label.split('').map((char, index) => ({
    id: `${id}-${index}-${char}`,
    kind: 'text',
    label: char,
    color,
    position: center.clone().addScaledVector(right, (start + index) * spacing),
    rotation,
    scale: 1,
    radius: 0.34
  }));
}

function makeCrashBlockRow(id: string, center: THREE.Vector3, rotation: number, count: number, color: string): BumpableSpec[] {
  const right = new THREE.Vector3(Math.cos(rotation), 0, -Math.sin(rotation));
  const start = -(count - 1) * 0.5;
  return Array.from({ length: count }, (_, index) => ({
    id: `${id}-${index}`,
    kind: 'block',
    position: center.clone().addScaledVector(right, (start + index) * 0.55),
    rotation: rotation + (index % 2 === 0 ? 0.08 : -0.08),
    color,
    size: [0.36, 0.36, 0.36],
    radius: 0.34
  }));
}

function makeCrashBlockStack(id: string, center: THREE.Vector3, color: string): BumpableSpec[] {
  const offsets = [
    [-0.32, 0, -0.26],
    [0.24, 0, -0.18],
    [-0.08, 0, 0.28],
    [0.03, 0.44, 0.02]
  ];
  return offsets.map(([x, y, z], index) => ({
    id: `${id}-${index}`,
    kind: 'block',
    position: center.clone().add(new THREE.Vector3(x, y, z)),
    rotation: index * 0.38,
    color,
    size: index === 3 ? [0.34, 0.34, 0.34] : [0.4, 0.34, 0.4],
    radius: 0.36
  }));
}

function makeCrashSlalom(id: string, center: THREE.Vector3, rotation: number, color: string): BumpableSpec[] {
  const forward = new THREE.Vector3(Math.sin(rotation), 0, Math.cos(rotation));
  const lateral = new THREE.Vector3(Math.cos(rotation), 0, -Math.sin(rotation));
  return Array.from({ length: 6 }, (_, index) => ({
    id: `${id}-${index}`,
    kind: 'block',
    position: center
      .clone()
      .addScaledVector(forward, (index - 2.5) * 0.48)
      .addScaledVector(lateral, index % 2 === 0 ? 0.22 : -0.22),
    rotation: rotation + index * 0.22,
    color,
    size: [0.28, 0.46, 0.28],
    radius: 0.3
  }));
}

function sanitizeBumpableSpawns(specs: BumpableSpec[], bounds: CollisionBounds): BumpableSpec[] {
  return specs.map((spec) => {
    const position = spec.position.clone();
    position.y = Math.max(position.y, BUMPABLE_GROUND_Y);
    const radius = spec.radius + 0.08;
    const insideX = position.x > bounds.minX - radius && position.x < bounds.maxX + radius;
    const insideZ = position.z > bounds.minZ - radius && position.z < bounds.maxZ + radius;
    if (insideX && insideZ) {
      const candidates = [
        { axis: 'x' as const, value: bounds.minX - radius, distance: Math.abs(position.x - (bounds.minX - radius)) },
        { axis: 'x' as const, value: bounds.maxX + radius, distance: Math.abs((bounds.maxX + radius) - position.x) },
        { axis: 'z' as const, value: bounds.minZ - radius, distance: Math.abs(position.z - (bounds.minZ - radius)) },
        { axis: 'z' as const, value: bounds.maxZ + radius, distance: Math.abs((bounds.maxZ + radius) - position.z) }
      ].sort((a, b) => a.distance - b.distance);
      const nearest = candidates[0];
      if (nearest.axis === 'x') position.x = nearest.value;
      else position.z = nearest.value;
    }
    return { ...spec, position };
  });
}

function makeCentralCollisionBounds(roadLayout: { houseTileWidth: number; houseTileDepth: number }): CollisionBounds {
  return {
    minX: -1.68 * roadLayout.houseTileWidth,
    maxX: 1.68 * roadLayout.houseTileWidth,
    minZ: -1.68 * roadLayout.houseTileDepth,
    maxZ: 1.68 * roadLayout.houseTileDepth
  };
}

function resolveBoundsCollision(offset: THREE.Vector3, velocity: THREE.Vector3, basePosition: THREE.Vector3, bounds: CollisionBounds, radius: number) {
  const x = basePosition.x + offset.x;
  const z = basePosition.z + offset.z;
  const insideX = x > bounds.minX - radius && x < bounds.maxX + radius;
  const insideZ = z > bounds.minZ - radius && z < bounds.maxZ + radius;
  if (!insideX || !insideZ) return;

  const distances = [
    { axis: 'x' as const, sign: -1, value: Math.abs(x - (bounds.minX - radius)) },
    { axis: 'x' as const, sign: 1, value: Math.abs((bounds.maxX + radius) - x) },
    { axis: 'z' as const, sign: -1, value: Math.abs(z - (bounds.minZ - radius)) },
    { axis: 'z' as const, sign: 1, value: Math.abs((bounds.maxZ + radius) - z) }
  ].sort((a, b) => a.value - b.value);
  const nearest = distances[0];
  if (nearest.axis === 'x') {
    const targetX = nearest.sign < 0 ? bounds.minX - radius : bounds.maxX + radius;
    offset.x += targetX - x;
    velocity.x = Math.abs(velocity.x) * nearest.sign * 0.72;
  } else {
    const targetZ = nearest.sign < 0 ? bounds.minZ - radius : bounds.maxZ + radius;
    offset.z += targetZ - z;
    velocity.z = Math.abs(velocity.z) * nearest.sign * 0.72;
  }
}

function findNearestPoi(pois: CvPoiMarker[], position: THREE.Vector3, radius: number): CvPoiMarker | null {
  let nearest: CvPoiMarker | null = null;
  let nearestDistanceSq = radius * radius;
  pois.forEach((poi) => {
    const dx = poi.position.x - position.x;
    const dz = poi.position.z - position.z;
    const distanceSq = dx * dx + dz * dz;
    if (distanceSq < nearestDistanceSq) {
      nearest = poi;
      nearestDistanceSq = distanceSq;
    }
  });
  return nearest;
}

function makeLanePath(
  loopMinX: number,
  loopMaxX: number,
  loopMinZ: number,
  loopMaxZ: number,
  houseTileWidth: number,
  houseTileDepth: number,
  config: LaneConfig,
  reverse: boolean
) {
  const points = makeRoundedLoopPath(
    loopMinX + houseTileWidth * config.offset,
    loopMaxX - houseTileWidth * config.offset,
    loopMinZ + houseTileDepth * config.offset,
    loopMaxZ - houseTileDepth * config.offset,
    houseTileWidth * config.cornerRadiusScale,
    CORNER_ARC_SEGMENTS
  );
  return reverse ? points.reverse() : points;
}

function makeRoundedLoopPath(minX: number, maxX: number, minZ: number, maxZ: number, radius: number, arcSegments: number) {
  const points: THREE.Vector3[] = [];
  const clampedRadius = Math.min(radius, Math.abs(maxX - minX) * 0.5, Math.abs(maxZ - minZ) * 0.5);
  const topLeft = new THREE.Vector3(minX + clampedRadius, 0, minZ + clampedRadius);
  const topRight = new THREE.Vector3(maxX - clampedRadius, 0, minZ + clampedRadius);
  const bottomRight = new THREE.Vector3(maxX - clampedRadius, 0, maxZ - clampedRadius);
  const bottomLeft = new THREE.Vector3(minX + clampedRadius, 0, maxZ - clampedRadius);

  points.push(new THREE.Vector3(topLeft.x, 0, minZ));
  points.push(new THREE.Vector3(topRight.x, 0, minZ));
  appendArc(points, topRight, -Math.PI / 2, 0, clampedRadius, arcSegments);
  points.push(new THREE.Vector3(maxX, 0, bottomRight.z));
  appendArc(points, bottomRight, 0, Math.PI / 2, clampedRadius, arcSegments);
  points.push(new THREE.Vector3(bottomLeft.x, 0, maxZ));
  appendArc(points, bottomLeft, Math.PI / 2, Math.PI, clampedRadius, arcSegments);
  points.push(new THREE.Vector3(minX, 0, topLeft.z));
  appendArc(points, topLeft, Math.PI, (Math.PI * 3) / 2, clampedRadius, arcSegments);

  return points;
}

function appendArc(
  points: THREE.Vector3[],
  center: THREE.Vector3,
  startAngle: number,
  endAngle: number,
  radius: number,
  segments: number
) {
  for (let step = 1; step <= segments; step += 1) {
    const t = step / segments;
    const angle = THREE.MathUtils.lerp(startAngle, endAngle, t);
    points.push(new THREE.Vector3(center.x + Math.cos(angle) * radius, 0, center.z + Math.sin(angle) * radius));
  }
}

function groupPlacements(placements: Placement[]) {
  const groups = new Map<ModelName, Placement[]>();
  placements.forEach((placement) => {
    const group = groups.get(placement.model) ?? [];
    group.push(placement);
    groups.set(placement.model, group);
  });
  return groups;
}

function makePathSampler(points: THREE.Vector3[]) {
  const segments = points.map((point, index) => {
    const next = points[(index + 1) % points.length];
    return {
      from: point,
      to: next,
      length: point.distanceTo(next)
    };
  });
  const length = segments.reduce((sum, segment) => sum + segment.length, 0);

  return {
    segments,
    length,
    sample(t: number) {
      let distance = wrap01(t) * length;
      for (let index = 0; index < segments.length; index += 1) {
        const segment = segments[index];
        if (distance <= segment.length) {
          const local = distance / segment.length;
          const position = segment.from.clone().lerp(segment.to, local);
          const direction = segment.to.clone().sub(segment.from).normalize();
          return {
            position,
            yaw: Math.atan2(direction.x, direction.z),
            segmentIndex: index,
            local,
            t: wrap01(t)
          };
        }
        distance -= segment.length;
      }
      return { position: points[0].clone(), yaw: 0, segmentIndex: 0, local: 0, t: wrap01(t) };
    },
    nearest(position: THREE.Vector3) {
      let bestDistanceSq = Infinity;
      let bestDistanceAlongPath = 0;
      let accumulatedLength = 0;

      segments.forEach((segment) => {
        const segmentVector = segment.to.clone().sub(segment.from);
        const segmentLengthSq = segmentVector.lengthSq();
        const local = segmentLengthSq === 0 ? 0 : THREE.MathUtils.clamp(position.clone().sub(segment.from).dot(segmentVector) / segmentLengthSq, 0, 1);
        const projected = segment.from.clone().add(segmentVector.multiplyScalar(local));
        const distanceSq = projected.distanceToSquared(position);
        if (distanceSq < bestDistanceSq) {
          bestDistanceSq = distanceSq;
          bestDistanceAlongPath = accumulatedLength + segment.length * local;
        }
        accumulatedLength += segment.length;
      });

      const t = wrap01(bestDistanceAlongPath / length);
      return {
        t,
        sample: this.sample(t)
      };
    }
  };
}

function sampleQuadraticTurn(start: THREE.Vector3, control: THREE.Vector3, end: THREE.Vector3, t: number) {
  const invT = 1 - t;
  const position = start
    .clone()
    .multiplyScalar(invT * invT)
    .add(control.clone().multiplyScalar(2 * invT * t))
    .add(end.clone().multiplyScalar(t * t));
  const tangent = control
    .clone()
    .sub(start)
    .multiplyScalar(2 * invT)
    .add(end.clone().sub(control).multiplyScalar(2 * t))
    .normalize();
  return {
    position,
    yaw: Math.atan2(tangent.x, tangent.z),
    segmentIndex: 0,
    local: t,
    t
  };
}

function wrap01(value: number) {
  return ((value % 1) + 1) % 1;
}

function moveTowards(current: number, target: number, maxDelta: number) {
  if (Math.abs(target - current) <= maxDelta) return target;
  return current + Math.sign(target - current) * maxDelta;
}

function updateTrackGeometry(line: THREE.Line | null, samples: Array<THREE.Vector3 | null>) {
  if (!line) return;
  const points: THREE.Vector3[] = [];
  for (let index = 1; index < samples.length; index += 1) {
    const previous = samples[index - 1];
    const current = samples[index];
    if (!previous || !current) continue;
    points.push(previous, current);
  }
  line.geometry.setFromPoints(points);
}

function updateSmokeGeometry(points: THREE.Points | null, particles: SmokeParticle[]) {
  if (!points) return;
  const geometry = points.geometry as THREE.BufferGeometry;
  const positions = new Float32Array(particles.length * 3);
  particles.forEach((particle, index) => {
    const offset = index * 3;
    if (particle.age >= 1) {
      positions[offset] = 0;
      positions[offset + 1] = -999;
      positions[offset + 2] = 0;
      return;
    }
    positions[offset] = particle.position.x;
    positions[offset + 1] = particle.position.y;
    positions[offset + 2] = particle.position.z;
  });
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.attributes.position.needsUpdate = true;
}

function getOutsideCameraDirection(position: THREE.Vector3) {
  const direction = new THREE.Vector3(position.x, 0, position.z);
  if (direction.lengthSq() < 0.001) return new THREE.Vector3(0, 0, 1);
  return direction.normalize();
}

function getPursuitYaw(
  sample: { position: THREE.Vector3; yaw: number; t: number },
  path: { length: number; sample: (t: number) => { position: THREE.Vector3 } },
  steeringLookahead: number
) {
  const lookahead = steeringLookahead / path.length;
  const future = path.sample(sample.t + lookahead);
  const direction = future.position.clone().sub(sample.position);
  if (direction.lengthSq() < 0.001) return sample.yaw;
  return Math.atan2(direction.x, direction.z);
}

function getPreTurnSlide(
  sample: { position: THREE.Vector3; t: number },
  path: { length: number; sample: (t: number) => { position: THREE.Vector3 } },
  currentYaw: number,
  steeringLookahead: number
) {
  const lookahead = (steeringLookahead * 1.15) / path.length;
  const future = path.sample(sample.t + lookahead);
  const futureDirection = future.position.clone().sub(sample.position);
  if (futureDirection.lengthSq() < 0.001) return 0;

  const futureYaw = Math.atan2(futureDirection.x, futureDirection.z);
  const yawDelta = normalizeAngleNear(currentYaw, futureYaw) - currentYaw;
  const intensity = THREE.MathUtils.clamp(Math.abs(yawDelta) / (Math.PI / 4), 0, 1);
  return Math.sign(yawDelta) * intensity * intensity * (3 - 2 * intensity);
}

function getCornerDrift(
  sample: { position: THREE.Vector3; yaw: number; t: number },
  path: { length: number; sample: (t: number) => { position: THREE.Vector3; yaw: number } },
  velocity: number,
  driftWindow: number
) {
  if (velocity === 0) return 0;
  const speed = THREE.MathUtils.clamp(Math.abs(velocity), CAR_SPEED * 0.35, CAR_SPEED);
  const lookahead = (speed * driftWindow) / path.length;
  const near = path.sample(sample.t + lookahead * 0.25);
  const far = path.sample(sample.t + lookahead);
  const nearDirection = near.position.clone().sub(sample.position);
  const farDirection = far.position.clone().sub(sample.position);
  if (nearDirection.lengthSq() < 0.001 || farDirection.lengthSq() < 0.001) return 0;
  const nearYaw = Math.atan2(nearDirection.x, nearDirection.z);
  const farYaw = Math.atan2(farDirection.x, farDirection.z);
  const turnAngle = normalizeAngleNear(nearYaw, farYaw) - nearYaw;
  if (Math.abs(turnAngle) < 0.001) return 0;

  const normalized = THREE.MathUtils.clamp(Math.abs(turnAngle) / (Math.PI / 3), 0, 1);
  const cornerFactor = normalized * normalized * (3 - 2 * normalized);
  return Math.sign(turnAngle) * cornerFactor;
}

function normalizeAngleNear(current: number, target: number) {
  let delta = target - current;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  return current + delta;
}

[
  'base',
  'bench',
  'box_A',
  'box_B',
  'building_A',
  'building_B',
  'building_C',
  'building_D',
  'building_E',
  'building_F',
  'building_G',
  'building_H',
  'bush',
  'car_hatchback',
  'car_police',
  'car_sedan',
  'car_stationwagon',
  'car_taxi',
  'dumpster',
  'firehydrant',
  'road_junction',
  'road_straight',
  'road_straight_crossing',
  'streetlight',
  'trafficlight_A',
  'trafficlight_B',
  'trafficlight_C',
  'trash_A',
  'trash_B',
  'watertower'
].forEach((model) => useGLTF.preload(`${ASSET_BASE}/${model}.gltf`));
