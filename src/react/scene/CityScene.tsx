import { useFrame, useLoader, useThree } from '@react-three/fiber';
import { Center, Text3D, useGLTF } from '@react-three/drei';
import { forwardRef, useEffect, useMemo, useRef, type MutableRefObject, type Ref } from 'react';
import * as THREE from 'three';

const ASSET_BASE = './assets/vendor/kaykit/city-builder-bits';
const SKYBOX_BASE = './assets/vendor/sky/sky_89_2k/sky_89_cubemap_2k';
const TEXT_3D_FONT = './assets/vendor/fonts/helvetiker_bold.typeface.json';
const TILE = 2.15;
const SIDE_VIEW_DISTANCE = 3.1;
const SIDE_VIEW_HEIGHT = 2.1;
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
const BUMPABLE_IMPULSE = 9.2;
const BUMPABLE_GROUND_Y = 0.12;
const TRAFFIC_BUMP_IMPULSE = 7.8;
const TRAFFIC_RETURN_SPEED = 3.8;
const TRAFFIC_YAW_RETURN_SPEED = 4.5;
const TRAFFIC_HIT_RADIUS = 1.05;
const CORNER_ARC_SEGMENTS = 24;
const CORNER_ARC_RADIUS_SCALE = 0.28;
const CAMERA_HEADING_SMOOTHNESS = 7;
const CAMERA_LOOK_SMOOTHNESS = 8;

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
  kind: 'text' | 'box';
  label?: string;
  model?: Extract<ModelName, 'box_A' | 'box_B' | 'dumpster' | 'trash_A' | 'trash_B'>;
  position: THREE.Vector3;
  rotation?: number;
  color?: string;
  scale?: number;
  radius: number;
};

type BumpableState = {
  offset: THREE.Vector3;
  velocity: THREE.Vector3;
  rotation: THREE.Euler;
  angularVelocity: THREE.Vector3;
  cooldown: number;
  grounded: boolean;
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
      if (event.key.toLowerCase() === 'e' && nearbyPoi.current) onOpenPoi?.(nearbyPoi.current);
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
    }
    const vehicleYaw = Math.atan2(vehicleDirection.x, vehicleDirection.z);
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
      <fog attach="fog" args={['#d4e0e2', 46, 82]} />
      <CityGround />
      <ModelInstances placements={roadLayout.placements} />
      <TouchingBuildingBlock models={centerBuildingModels} refsStore={buildingRefs} roadLayout={roadLayout} />
      <OuterBuildingRing refsStore={buildingRefs} roadLayout={roadLayout} />
      <CentralCollisionBlock bounds={centralBounds} />
      <CvMarkers pois={cvPois} />
      <BumpableObjects specs={bumpables} playerPosition={visualCarPosition} playerVelocity={playerVelocity} centralBounds={centralBounds} />
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

function CvMarkers({ pois }: { pois: CvPoiMarker[] }) {
  return (
    <>
      {pois.map((poi) => (
        <CvMarker key={poi.id} position={poi.position} />
      ))}
    </>
  );
}

function CvMarker({ position }: { position: THREE.Vector3 }) {
  const floating = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    const marker = floating.current;
    if (!marker) return;
    marker.position.y = position.y + Math.sin(clock.elapsedTime * 3.2) * 0.08;
    marker.rotation.y = clock.elapsedTime * 1.3;
  });

  return (
    <group position={position}>
      <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.38, 0.52, 32]} />
        <meshBasicMaterial color="#26f0a7" transparent opacity={0.72} side={THREE.DoubleSide} />
      </mesh>
      <group ref={floating}>
        <mesh position={[0, 0.58, 0]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.22, 0.48, 24]} />
          <meshBasicMaterial color="#20eaa0" />
        </mesh>
        <mesh position={[0, 0.9, 0]}>
          <sphereGeometry args={[0.13, 18, 18]} />
          <meshBasicMaterial color="#b9ffe4" />
        </mesh>
      </group>
    </group>
  );
}

function CentralCollisionBlock({ bounds }: { bounds: CollisionBounds }) {
  const width = bounds.maxX - bounds.minX;
  const depth = bounds.maxZ - bounds.minZ;
  const centerX = (bounds.minX + bounds.maxX) * 0.5;
  const centerZ = (bounds.minZ + bounds.maxZ) * 0.5;
  const wallHeight = 0.22;
  const wallThickness = 0.18;

  return (
    <group position={[centerX, wallHeight * 0.5, centerZ]}>
      <mesh position={[0, 0, -depth * 0.5]}>
        <boxGeometry args={[width, wallHeight, wallThickness]} />
        <meshBasicMaterial color="#8fa0a4" transparent opacity={0.62} />
      </mesh>
      <mesh position={[0, 0, depth * 0.5]}>
        <boxGeometry args={[width, wallHeight, wallThickness]} />
        <meshBasicMaterial color="#8fa0a4" transparent opacity={0.62} />
      </mesh>
      <mesh position={[-width * 0.5, 0, 0]}>
        <boxGeometry args={[wallThickness, wallHeight, depth]} />
        <meshBasicMaterial color="#8fa0a4" transparent opacity={0.62} />
      </mesh>
      <mesh position={[width * 0.5, 0, 0]}>
        <boxGeometry args={[wallThickness, wallHeight, depth]} />
        <meshBasicMaterial color="#8fa0a4" transparent opacity={0.62} />
      </mesh>
    </group>
  );
}

function BumpableObjects({
  specs,
  playerPosition,
  playerVelocity,
  centralBounds
}: {
  specs: BumpableSpec[];
  playerPosition: MutableRefObject<THREE.Vector3>;
  playerVelocity: MutableRefObject<THREE.Vector3>;
  centralBounds: CollisionBounds;
}) {
  return (
    <>
      {specs.map((spec) => (
        <BumpableObject key={spec.id} spec={spec} playerPosition={playerPosition} playerVelocity={playerVelocity} centralBounds={centralBounds} />
      ))}
    </>
  );
}

function BumpableObject({
  spec,
  playerPosition,
  playerVelocity,
  centralBounds
}: {
  spec: BumpableSpec;
  playerPosition: MutableRefObject<THREE.Vector3>;
  playerVelocity: MutableRefObject<THREE.Vector3>;
  centralBounds: CollisionBounds;
}) {
  const group = useRef<THREE.Group>(null);
  const state = useRef<BumpableState>({
    offset: new THREE.Vector3(),
    velocity: new THREE.Vector3(),
    rotation: new THREE.Euler(0, spec.rotation ?? 0, 0),
    angularVelocity: new THREE.Vector3(),
    cooldown: 0,
    grounded: true
  });

  useFrame((_, delta) => {
    const object = group.current;
    if (!object) return;
    const body = state.current;
    const hitVector = spec.position.clone().add(body.offset).sub(playerPosition.current);
    hitVector.y = 0;

    const playerSpeed = playerVelocity.current.length();
    if (body.cooldown <= 0 && playerSpeed > 0.35 && hitVector.lengthSq() < (spec.radius + BUMPABLE_HIT_RADIUS) ** 2) {
      const awayDirection = hitVector.lengthSq() > 0.001 ? hitVector.normalize() : new THREE.Vector3(1, 0, 0);
      const driveDirection = playerVelocity.current.clone().setY(0).normalize();
      const impulseDirection = awayDirection.multiplyScalar(0.42).add(driveDirection.multiplyScalar(0.58)).normalize();
      const impulse = BUMPABLE_IMPULSE * THREE.MathUtils.clamp(playerSpeed / CAR_SPEED, 0.75, 1.6) * (spec.kind === 'text' ? 1.45 : 1.1);
      body.velocity.addScaledVector(impulseDirection, impulse);
      body.velocity.y += spec.kind === 'text' ? 7.8 : 5.4;
      const contactSide = impulseDirection.x * Math.cos(spec.rotation ?? 0) - impulseDirection.z * Math.sin(spec.rotation ?? 0);
      body.angularVelocity.add(new THREE.Vector3(
        -impulseDirection.z * 8.4,
        contactSide * 13.5 + (Math.random() - 0.5) * 3.5,
        impulseDirection.x * 8.4
      ));
      body.cooldown = 0.62;
      body.grounded = false;
    }

    body.cooldown = Math.max(0, body.cooldown - delta);
    body.velocity.y -= 13.5 * delta;
    body.offset.addScaledVector(body.velocity, delta);
    body.rotation.x += body.angularVelocity.x * delta;
    body.rotation.y += body.angularVelocity.y * delta;
    body.rotation.z += body.angularVelocity.z * delta;

    if (body.offset.y < 0) {
      body.offset.y = 0;
      if (!body.grounded && Math.abs(body.velocity.y) > 0.5) {
        body.velocity.y = Math.abs(body.velocity.y) * (spec.kind === 'text' ? 0.46 : 0.36);
        body.angularVelocity.multiplyScalar(0.82);
      } else {
        body.velocity.y = 0;
        body.grounded = true;
      }
      body.velocity.x *= 0.72;
      body.velocity.z *= 0.72;
    }
    resolveBoundsCollision(body.offset, body.velocity, spec.position, centralBounds, spec.radius);

    const airDrag = body.grounded ? 2.2 : 0.45;
    body.velocity.x *= 1 - Math.min(delta * airDrag, 0.85);
    body.velocity.z *= 1 - Math.min(delta * airDrag, 0.85);
    body.angularVelocity.multiplyScalar(1 - Math.min(delta * (body.grounded ? 2.4 : 0.7), 0.9));
    object.position.copy(spec.position).add(body.offset);
    if (object.position.y < BUMPABLE_GROUND_Y) object.position.y = BUMPABLE_GROUND_Y;
    object.rotation.copy(body.rotation);
  });

  return (
    <group ref={group} position={spec.position} rotation={[0, spec.rotation ?? 0, 0]} scale={spec.scale ?? 1}>
      {spec.kind === 'text' ? (
        <Center position={[0, 0.38, 0]} rotation={[0, 0, 0]}>
          <Text3D font={TEXT_3D_FONT} size={0.48} height={0.1} curveSegments={6} bevelEnabled bevelSize={0.014} bevelThickness={0.014}>
            {spec.label}
            <meshBasicMaterial color={spec.color ?? '#4dffb8'} />
          </Text3D>
        </Center>
      ) : (
        <DynamicCityModel model={spec.model ?? 'box_A'} />
      )}
    </group>
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
    <mesh position={[0, -0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[58, 58]} />
      <meshBasicMaterial color="#aebcc0" />
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

  return <instancedMesh ref={ref} args={[geometry, material, placements.length]} />;
}

function PlacedCityModel({ placement, onGroup }: { placement: Placement; onGroup?: (group: THREE.Group) => void }) {
  const ref = useRef<THREE.Group>(null);
  const gltf = useGLTF(`${ASSET_BASE}/${placement.model}.gltf`);
  const scene = useMemo(() => cloneFlatScene(gltf.scene), [gltf.scene]);

  useEffect(() => {
    if (ref.current && onGroup) onGroup(ref.current);
  }, [onGroup]);

  return (
    <group
      ref={ref}
      position={placement.position}
      rotation={[0, placement.rotation ?? 0, 0]}
      scale={placement.scale ?? 1}
    >
      <primitive object={scene} />
    </group>
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
      child.castShadow = false;
      child.receiveShadow = false;
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
  return new THREE.MeshBasicMaterial({ map: texture, side: THREE.FrontSide });
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
      title: 'Game Developer Profile',
      meta: 'Gameplay, tools, and interactive web portfolio',
      tech: ['Unity', 'C#', 'TypeScript', 'R3F'],
      bullets: [
        'Builds playable prototypes with clear controls, feedback, and iteration loops.',
        'Comfortable turning technical CV content into interactive experiences.',
        'Focuses on gameplay feel, asset integration, and browser delivery.'
      ],
      position: new THREE.Vector3(-0.5 * w, 0.08, 2.12 * d)
    },
    {
      id: 'gameplay',
      title: 'Gameplay Projects',
      meta: 'Player movement, camera, interaction, and vehicle feel',
      tech: ['Gameplay', 'Camera', 'Input', 'Physics Feel'],
      bullets: [
        'Vehicle lane switching, drift effects, particles, and world-space markers.',
        'Scene systems separated into path, handling, marker, and visual FX logic.',
        'Iterates by playtesting camera, road alignment, and moment-to-moment feel.'
      ],
      position: new THREE.Vector3(0.5 * w, 0.08, 2.12 * d)
    },
    {
      id: 'skills',
      title: 'Technical Skills',
      meta: 'Game, web, and tooling stack',
      tech: ['C#', 'Unity', 'Three.js', 'React', 'Git'],
      bullets: [
        'Game scripting and prototype architecture.',
        'React Three Fiber scenes with GLTF assets, particles, skyboxes, and controls.',
        'GitHub Pages-ready frontend builds with Vite.'
      ],
      position: new THREE.Vector3(-2.14 * w, 0.08, -0.5 * d)
    },
    {
      id: 'experience',
      title: 'Experience',
      meta: 'Small-team production mindset',
      tech: ['Debugging', 'Iteration', 'Optimization'],
      bullets: [
        'Breaks visual/gameplay problems into testable scene changes.',
        'Balances asset constraints with simple runtime systems.',
        'Keeps changes scoped and validates with local browser builds.'
      ],
      position: new THREE.Vector3(2.14 * w, 0.08, 0.5 * d)
    },
    {
      id: 'education',
      title: 'Education & Direction',
      meta: 'Candidate positioning for game development roles',
      tech: ['Portfolio', 'CV', 'Game Dev'],
      bullets: [
        'Portfolio direction favors game development over generic web presentation.',
        'Interactive scenes demonstrate implementation, taste, and technical curiosity.',
        'CV sections can be expanded into playable stations around the city.'
      ],
      position: new THREE.Vector3(-0.5 * w, 0.08, -2.12 * d)
    }
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
    {
      id: 'box-left-a',
      kind: 'box',
      model: 'box_A',
      position: new THREE.Vector3(-2.62 * w, BUMPABLE_GROUND_Y, -1.55 * d),
      rotation: Math.PI / 5,
      scale: 1.15,
      radius: 0.65
    },
    {
      id: 'box-right-b',
      kind: 'box',
      model: 'box_B',
      position: new THREE.Vector3(2.62 * w, BUMPABLE_GROUND_Y, 1.48 * d),
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

function sanitizeBumpableSpawns(specs: BumpableSpec[], bounds: CollisionBounds): BumpableSpec[] {
  return specs.map((spec) => {
    const position = spec.position.clone();
    position.y = BUMPABLE_GROUND_Y;
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
