import { Canvas, useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { CompanionState } from '../shared/types';
import { computePose, REST, type Pose } from './poses';

// Procedural robot-cat built from primitives (no model files) so the whole
// extension stays self-contained and reviewable. Toon shading keeps it cute
// and cheap enough for a popup.
const BLUE = '#1E9BD7';
const BLUE_DARK = '#1272A8';
const WHITE = '#FFFFFF';
const RED = '#E23A2E';
const YELLOW = '#F5C518';
const INK = '#111111';

const damp = THREE.MathUtils.damp;

function useToon(color: string) {
  return useMemo(() => new THREE.MeshToonMaterial({ color }), [color]);
}

function Whiskers() {
  const mat = useToon(INK);
  const geo = useMemo(() => new THREE.CylinderGeometry(0.012, 0.012, 0.6, 6), []);
  const rows = [1.98, 1.82, 1.66];
  return (
    <group>
      {rows.map((y, i) =>
        [-1, 1].map((side) => (
          <mesh
            key={`${i}${side}`}
            geometry={geo}
            material={mat}
            position={[side * 0.62, y, 0.92]}
            rotation={[0, side * 0.4, Math.PI / 2 + side * (i - 1) * 0.14]}
          />
        )),
      )}
    </group>
  );
}

function Star({ i, get }: { i: number; get: Get }) {
  const ref = useRef<THREE.Mesh>(null);
  const mat = useMemo(() => new THREE.MeshToonMaterial({ color: YELLOW, transparent: true, opacity: 0 }), []);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const amount = get();
    const t = clock.elapsedTime * 1.4 + (i * Math.PI * 2) / 5;
    ref.current.position.set(Math.cos(t) * 1.7, 2.4 + Math.sin(t * 2) * 0.35, Math.sin(t) * 1.2);
    ref.current.rotation.z += 0.05;
    mat.opacity = damp(mat.opacity, amount, 6, 1 / 60);
    const s = 0.12 + amount * 0.06;
    ref.current.scale.setScalar(s);
  });
  return (
    <mesh ref={ref} material={mat}>
      <octahedronGeometry args={[1, 0]} />
    </mesh>
  );
}

function Tear({ side, get }: { side: number; get: Get }) {
  const ref = useRef<THREE.Mesh>(null);
  const mat = useMemo(() => new THREE.MeshToonMaterial({ color: '#7CC7FF', transparent: true, opacity: 0 }), []);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const amount = get();
    const cycle = (clock.elapsedTime * 1.6 + (side > 0 ? 0.5 : 0)) % 1;
    ref.current.position.set(side * 0.32, 2.05 - cycle * 0.9, 1.1);
    mat.opacity = damp(mat.opacity, amount * (1 - cycle), 8, 1 / 60);
  });
  return (
    <mesh ref={ref} material={mat} scale={[0.08, 0.13, 0.08]}>
      <sphereGeometry args={[1, 10, 10]} />
    </mesh>
  );
}

function Zzz({ get }: { get: Get }) {
  const group = useRef<THREE.Group>(null);
  const mats = useMemo(() => [0, 1, 2].map(() => new THREE.MeshToonMaterial({ color: INK, transparent: true, opacity: 0 })), []);
  useFrame(({ clock }) => {
    if (!group.current) return;
    const amount = get();
    group.current.children.forEach((c, i) => {
      const cycle = (clock.elapsedTime * 0.5 + i * 0.33) % 1;
      c.position.set(1.1 + cycle * 0.6, 2.6 + cycle * 1.0, 0.4);
      c.scale.setScalar(0.08 + cycle * 0.12);
      mats[i].opacity = damp(mats[i].opacity, amount * Math.sin(cycle * Math.PI), 8, 1 / 60);
    });
  });
  return (
    <group ref={group}>
      {mats.map((m, i) => (
        <mesh key={i} material={m}>
          <torusGeometry args={[1, 0.28, 6, 4]} />
        </mesh>
      ))}
    </group>
  );
}

function Bubble({ get, color, shape }: { get: Get; color: string; shape: '!' | '?' }) {
  const ref = useRef<THREE.Group>(null);
  const mat = useMemo(() => new THREE.MeshToonMaterial({ color, transparent: true, opacity: 0 }), [color]);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const amount = get();
    mat.opacity = damp(mat.opacity, amount, 10, 1 / 60);
    ref.current.position.y = 3.35 + Math.sin(clock.elapsedTime * 5) * 0.05 * amount;
    ref.current.scale.setScalar(0.6 + amount * 0.4);
  });
  return (
    <group ref={ref} position={[1.15, 3.35, 0.3]}>
      {shape === '!' ? (
        <>
          <mesh material={mat} position={[0, 0.2, 0]}><boxGeometry args={[0.16, 0.5, 0.16]} /></mesh>
          <mesh material={mat} position={[0, -0.25, 0]}><sphereGeometry args={[0.1, 10, 10]} /></mesh>
        </>
      ) : (
        <>
          <mesh material={mat} position={[0, 0.25, 0]} rotation={[0, 0, Math.PI * 0.15]}>
            <torusGeometry args={[0.2, 0.07, 8, 16, Math.PI * 1.3]} />
          </mesh>
          <mesh material={mat} position={[0, -0.05, 0]}><boxGeometry args={[0.14, 0.2, 0.14]} /></mesh>
          <mesh material={mat} position={[0, -0.32, 0]}><sphereGeometry args={[0.09, 10, 10]} /></mesh>
        </>
      )}
    </group>
  );
}

function Sweat({ get }: { get: Get }) {
  const ref = useRef<THREE.Mesh>(null);
  const mat = useMemo(() => new THREE.MeshToonMaterial({ color: '#7CC7FF', transparent: true, opacity: 0 }), []);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const amount = get();
    const cycle = (clock.elapsedTime * 0.9) % 1;
    ref.current.position.set(-0.95, 2.55 - cycle * 0.5, 0.6);
    mat.opacity = damp(mat.opacity, amount * (1 - cycle * 0.7), 8, 1 / 60);
  });
  return (
    <mesh ref={ref} material={mat} scale={[0.1, 0.16, 0.1]}>
      <sphereGeometry args={[1, 10, 10]} />
    </mesh>
  );
}

function RobotCat({ state }: { state: CompanionState }) {
  const root = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const armL = useRef<THREE.Group>(null);
  const armR = useRef<THREE.Group>(null);
  const eyeL = useRef<THREE.Mesh>(null);
  const eyeR = useRef<THREE.Mesh>(null);
  const pupilL = useRef<THREE.Mesh>(null);
  const pupilR = useRef<THREE.Mesh>(null);
  const mouthOpen = useRef<THREE.Mesh>(null);
  const mouthSmile = useRef<THREE.Mesh>(null);

  const stateRef = useRef({ state, since: 0 });
  const cur = useRef<Pose>({ ...REST });
  const fx = useRef<Fx>({ tears: 0, zzz: 0, stars: 0, sweat: 0, exclaim: 0, question: 0 });

  const blue = useToon(BLUE), blueDark = useToon(BLUE_DARK), white = useToon(WHITE);
  const red = useToon(RED), yellow = useToon(YELLOW), ink = useToon(INK);
  const mouthRed = useMemo(() => new THREE.MeshToonMaterial({ color: '#B3261E' }), []);

  useFrame(({ clock }, dt) => {
    if (stateRef.current.state !== state) stateRef.current = { state, since: clock.elapsedTime };
    const target = computePose(state, clock.elapsedTime - stateRef.current.since);
    const c = cur.current;
    const k = 12; // responsiveness of the blend
    for (const key of Object.keys(target) as (keyof Pose)[]) c[key] = damp(c[key], target[key], k, dt);

    if (root.current) {
      root.current.position.set(c.bodyX, c.bodyY, 0);
      root.current.rotation.set(0, c.bodyRotY, c.bodyRotZ);
    }
    head.current?.rotation.set(c.headRotX, c.headRotY, c.headRotZ);
    armL.current?.rotation.set(c.armLRotX, 0, c.armLRotZ);
    armR.current?.rotation.set(c.armRRotX, 0, c.armRRotZ);

    const eyeY = Math.max(0.06, c.eyeOpen);
    eyeL.current?.scale.set(0.5, 0.62 * eyeY, 0.3);
    eyeR.current?.scale.set(0.5, 0.62 * eyeY, 0.3);
    const px = c.pupilX * 0.12, py = c.pupilY * 0.12 * eyeY;
    pupilL.current?.position.set(0.14 + px, py, 0.27);
    pupilR.current?.position.set(-0.14 + px, py, 0.27);

    if (mouthOpen.current) mouthOpen.current.scale.set(0.28 + c.mouthOpen * 0.1, Math.max(0.001, c.mouthOpen * 0.32), 0.08);
    if (mouthSmile.current) {
      const s = c.mouthSmile;
      // arc geometry spans the top half (∩); flip to U for a smile
      mouthSmile.current.scale.set(1, Math.max(0.15, Math.abs(s)), 1);
      mouthSmile.current.rotation.set(0, 0, s >= 0 ? Math.PI : 0);
      mouthSmile.current.position.y = s >= 0 ? 1.72 : 1.3;
    }
    fx.current = { tears: c.tears, zzz: c.zzz, stars: c.stars, sweat: c.sweat, exclaim: c.exclaim, question: c.question };
  });

  const armGeo = useMemo(() => new THREE.CylinderGeometry(0.15, 0.17, 0.55, 14), []);

  return (
    <>
      <group ref={root}>
        {/* body */}
        <mesh material={blue} position={[0, 0.55, 0]} scale={[1, 0.95, 0.9]}>
          <sphereGeometry args={[0.86, 32, 24]} />
        </mesh>
        <mesh material={white} position={[0, 0.5, 0.56]} scale={[1, 1, 0.35]}>
          <sphereGeometry args={[0.66, 32, 24]} />
        </mesh>
        {/* pocket */}
        <mesh material={ink} position={[0, 0.34, 0.82]} rotation={[0, 0, Math.PI]}>
          <torusGeometry args={[0.36, 0.018, 8, 32, Math.PI]} />
        </mesh>
        <mesh material={ink} position={[0, 0.34, 0.82]}>
          <boxGeometry args={[0.72, 0.03, 0.03]} />
        </mesh>
        {/* collar + bell */}
        <mesh material={red} position={[0, 1.12, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.74, 0.07, 12, 40]} />
        </mesh>
        <mesh material={yellow} position={[0, 0.93, 0.72]}>
          <sphereGeometry args={[0.17, 20, 16]} />
        </mesh>
        <mesh material={ink} position={[0, 0.93, 0.72]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.17, 0.014, 6, 24]} />
        </mesh>
        {/* tail */}
        <mesh material={red} position={[0, 0.45, -0.86]}>
          <sphereGeometry args={[0.13, 16, 12]} />
        </mesh>
        {/* legs + feet */}
        {[-1, 1].map((s) => (
          <group key={s}>
            <mesh material={blue} position={[s * 0.32, -0.15, 0]}>
              <cylinderGeometry args={[0.22, 0.24, 0.3, 16]} />
            </mesh>
            <mesh material={white} position={[s * 0.34, -0.36, 0.12]} scale={[1, 0.45, 1.35]}>
              <sphereGeometry args={[0.3, 20, 16]} />
            </mesh>
          </group>
        ))}
        {/* arms (pivot at shoulder, hang down along -y) */}
        <group ref={armL} position={[0.8, 0.85, 0]}>
          <mesh material={blue} geometry={armGeo} position={[0, -0.3, 0]} />
          <mesh material={white} position={[0, -0.62, 0]}>
            <sphereGeometry args={[0.21, 20, 16]} />
          </mesh>
        </group>
        <group ref={armR} position={[-0.8, 0.85, 0]}>
          <mesh material={blue} geometry={armGeo} position={[0, -0.3, 0]} />
          <mesh material={white} position={[0, -0.62, 0]}>
            <sphereGeometry args={[0.21, 20, 16]} />
          </mesh>
        </group>

        {/* head (pivot at neck) */}
        <group ref={head} position={[0, 1.25, 0]}>
          <group position={[0, -1.25, 0]}>
            <mesh material={blue} position={[0, 1.95, 0]}>
              <sphereGeometry args={[1.02, 40, 32]} />
            </mesh>
            <mesh material={white} position={[0, 1.83, 0.33]} scale={[1, 1.02, 0.85]}>
              <sphereGeometry args={[0.84, 40, 32]} />
            </mesh>
            {/* eyes */}
            <group position={[0.27, 2.3, 0.88]} rotation={[0, 0.25, 0]}>
              <mesh ref={eyeL} material={white} scale={[0.5, 0.62, 0.3]}>
                <sphereGeometry args={[1, 24, 20]} />
              </mesh>
              <mesh ref={pupilL} material={ink} position={[0.14, 0, 0.27]}>
                <sphereGeometry args={[0.1, 14, 12]} />
              </mesh>
            </group>
            <group position={[-0.27, 2.3, 0.88]} rotation={[0, -0.25, 0]}>
              <mesh ref={eyeR} material={white} scale={[0.5, 0.62, 0.3]}>
                <sphereGeometry args={[1, 24, 20]} />
              </mesh>
              <mesh ref={pupilR} material={ink} position={[-0.14, 0, 0.27]}>
                <sphereGeometry args={[0.1, 14, 12]} />
              </mesh>
            </group>
            {/* nose + philtrum */}
            <mesh material={red} position={[0, 2.0, 1.12]}>
              <sphereGeometry args={[0.17, 20, 16]} />
            </mesh>
            <mesh material={ink} position={[0, 1.7, 1.1]}>
              <boxGeometry args={[0.025, 0.42, 0.02]} />
            </mesh>
            <Whiskers />
            {/* mouth: smile arc (flips to frown) + open mouth */}
            <mesh ref={mouthSmile} material={ink} position={[0, 1.72, 1.03]} rotation={[0, 0, Math.PI]}>
              <torusGeometry args={[0.42, 0.024, 8, 32, Math.PI]} />
            </mesh>
            <mesh ref={mouthOpen} material={mouthRed} position={[0, 1.42, 1.02]} scale={[0.28, 0.001, 0.08]}>
              <sphereGeometry args={[1, 20, 16]} />
            </mesh>
            {/* shading ring where head meets face */}
            <mesh material={blueDark} position={[0, 1.95, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 1, 0.5]}>
              <torusGeometry args={[1.0, 0.01, 4, 40]} />
            </mesh>
          </group>
        </group>
      </group>

      <Effects fx={fx} />
    </>
  );
}

type Fx = { tears: number; zzz: number; stars: number; sweat: number; exclaim: number; question: number };
type Get = () => number;

// Effects read the damped pose ref each frame so they fade with the state blend.
function Effects({ fx }: { fx: React.MutableRefObject<Fx> }) {
  const g = (k: keyof Fx): Get => () => fx.current[k];
  return (
    <>
      {[0, 1, 2, 3, 4].map((i) => <Star key={i} i={i} get={g('stars')} />)}
      <Tear side={1} get={g('tears')} />
      <Tear side={-1} get={g('tears')} />
      <Zzz get={g('zzz')} />
      <Sweat get={g('sweat')} />
      <Bubble get={g('exclaim')} color={RED} shape="!" />
      <Bubble get={g('question')} color={INK} shape="?" />
    </>
  );
}

export function Companion({ state, className }: { state: CompanionState; className?: string }) {
  return (
    <div className={className} aria-hidden>
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [0, 1.35, 6.4], fov: 36, near: 0.1, far: 50 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
        onCreated={({ camera }) => camera.lookAt(0, 1.15, 0)}
      >
        <hemisphereLight args={['#ffffff', '#c9d2dc', 0.9]} />
        <directionalLight position={[3, 5, 4]} intensity={1.1} />
        <directionalLight position={[-3, 2, -2]} intensity={0.35} />
        <RobotCat state={state} />
        {/* ground shadow disc */}
        <mesh position={[0, -0.52, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[1.05, 40]} />
          <meshBasicMaterial color="#000000" transparent opacity={0.08} />
        </mesh>
      </Canvas>
    </div>
  );
}
