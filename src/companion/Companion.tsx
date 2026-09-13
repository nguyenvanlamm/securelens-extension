import { Canvas, useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { CompanionState } from '../shared/types';
import { computePose, REST, type Pose } from './poses';

// Procedural robot puppy built from primitives (no model files) so the whole
// extension stays self-contained and reviewable. Toon shading keeps it cute
// and cheap enough for a popup.
const FUR = '#F4B860';
const FUR_DARK = '#C9772A';
const CREAM = '#FFE9C4';
const WHITE = '#FFFFFF';
const INK = '#1B1B1F';
const PINK = '#F59CA9';
const COLLAR = '#2FBF71';
const TAG = '#FFD84D';
const STEEL = '#B7C0CC';
const GLOW = '#5DDCFF';
const RED = '#E23A2E';
const YELLOW = '#F5C518';

const damp = THREE.MathUtils.damp;

function useToon(color: string) {
  return useMemo(() => new THREE.MeshToonMaterial({ color }), [color]);
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

function RobotPup({ state }: { state: CompanionState }) {
  const root = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const armL = useRef<THREE.Group>(null);
  const armR = useRef<THREE.Group>(null);
  const earL = useRef<THREE.Group>(null);
  const earR = useRef<THREE.Group>(null);
  const tail = useRef<THREE.Group>(null);
  const eyeL = useRef<THREE.Mesh>(null);
  const eyeR = useRef<THREE.Mesh>(null);
  const pupilL = useRef<THREE.Group>(null);
  const pupilR = useRef<THREE.Group>(null);
  const mouthOpen = useRef<THREE.Mesh>(null);
  const mouthSmile = useRef<THREE.Mesh>(null);
  const glowMat = useMemo(() => new THREE.MeshBasicMaterial({ color: GLOW }), []);

  const stateRef = useRef({ state, since: 0 });
  const cur = useRef<Pose>({ ...REST });
  const fx = useRef<Fx>({ tears: 0, zzz: 0, stars: 0, sweat: 0, exclaim: 0, question: 0 });

  const fur = useToon(FUR), furDark = useToon(FUR_DARK), cream = useToon(CREAM), white = useToon(WHITE);
  const ink = useToon(INK), pink = useToon(PINK), collar = useToon(COLLAR), tag = useToon(TAG), steel = useToon(STEEL);
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

    // ears pivot at the top of the head; 0 rad hangs down, ~2.4 rad points up
    const flop = Math.sin(clock.elapsedTime * 3) * 0.05 * (1 - c.earDroop);
    const ear = 2.45 - c.earDroop * 2.1 + flop;
    earL.current?.rotation.set(0, 0, ear);
    earR.current?.rotation.set(0, 0, -ear);
    if (tail.current) {
      tail.current.rotation.set(-c.tail * 0.35, Math.sin(clock.elapsedTime * 16) * 0.7 * c.tail, 0);
    }

    const eyeY = Math.max(0.06, c.eyeOpen);
    eyeL.current?.scale.set(0.5, 0.6 * eyeY, 0.3);
    eyeR.current?.scale.set(0.5, 0.6 * eyeY, 0.3);
    const px = c.pupilX * 0.12, py = c.pupilY * 0.12 * eyeY;
    pupilL.current?.position.set(0.1 + px, py, 0.26);
    pupilR.current?.position.set(-0.1 + px, py, 0.26);

    if (mouthOpen.current) mouthOpen.current.scale.set(0.18 + c.mouthOpen * 0.08, Math.max(0.001, c.mouthOpen * 0.22), 0.08);
    if (mouthSmile.current) {
      const s = c.mouthSmile;
      // arc geometry spans the top half (∩); flip to U for a smile
      mouthSmile.current.scale.set(1, Math.max(0.15, Math.abs(s)), 1);
      mouthSmile.current.rotation.set(0, 0, s >= 0 ? Math.PI : 0);
      mouthSmile.current.position.y = s >= 0 ? 1.66 : 1.38;
    }
    fx.current = { tears: c.tears, zzz: c.zzz, stars: c.stars, sweat: c.sweat, exclaim: c.exclaim, question: c.question };
  });

  const armGeo = useMemo(() => new THREE.CylinderGeometry(0.15, 0.17, 0.55, 14), []);
  const earGeo = useMemo(() => new THREE.SphereGeometry(1, 20, 16), []);

  return (
    <>
      <group ref={root}>
        {/* body */}
        <mesh material={fur} position={[0, 0.55, 0]} scale={[1, 0.95, 0.9]}>
          <sphereGeometry args={[0.84, 32, 24]} />
        </mesh>
        <mesh material={cream} position={[0, 0.45, 0.52]} scale={[1, 1, 0.38]}>
          <sphereGeometry args={[0.62, 32, 24]} />
        </mesh>
        {/* robot seam */}
        <mesh material={steel} position={[0, 0.5, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 0.9, 1]}>
          <torusGeometry args={[0.84, 0.012, 6, 48]} />
        </mesh>
        {/* collar + shield tag */}
        <mesh material={collar} position={[0, 1.12, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.72, 0.07, 12, 40]} />
        </mesh>
        <mesh material={tag} position={[0, 0.9, 0.72]} rotation={[0, 0, Math.PI / 4]}>
          <boxGeometry args={[0.2, 0.2, 0.06]} />
        </mesh>
        <mesh material={ink} position={[0, 0.9, 0.76]}>
          <boxGeometry args={[0.03, 0.12, 0.02]} />
        </mesh>
        {/* tail (pivot at the rump, wags around y) */}
        <group ref={tail} position={[0, 0.75, -0.78]}>
          <mesh material={fur} position={[0, 0.2, -0.2]} rotation={[-0.7, 0, 0]}>
            <cylinderGeometry args={[0.06, 0.12, 0.6, 12]} />
          </mesh>
          <mesh material={cream} position={[0, 0.44, -0.4]}>
            <sphereGeometry args={[0.1, 14, 12]} />
          </mesh>
        </group>
        {/* legs + paws */}
        {[-1, 1].map((s) => (
          <group key={s}>
            <mesh material={fur} position={[s * 0.32, -0.15, 0]}>
              <cylinderGeometry args={[0.22, 0.24, 0.3, 16]} />
            </mesh>
            <mesh material={cream} position={[s * 0.34, -0.36, 0.12]} scale={[1, 0.45, 1.35]}>
              <sphereGeometry args={[0.3, 20, 16]} />
            </mesh>
          </group>
        ))}
        {/* arms (pivot at shoulder, hang down along -y) */}
        <group ref={armL} position={[0.78, 0.85, 0]}>
          <mesh material={fur} geometry={armGeo} position={[0, -0.3, 0]} />
          <mesh material={cream} position={[0, -0.62, 0]}>
            <sphereGeometry args={[0.21, 20, 16]} />
          </mesh>
        </group>
        <group ref={armR} position={[-0.78, 0.85, 0]}>
          <mesh material={fur} geometry={armGeo} position={[0, -0.3, 0]} />
          <mesh material={cream} position={[0, -0.62, 0]}>
            <sphereGeometry args={[0.21, 20, 16]} />
          </mesh>
        </group>

        {/* head (pivot at neck) */}
        <group ref={head} position={[0, 1.25, 0]}>
          <group position={[0, -1.25, 0]}>
            <mesh material={fur} position={[0, 1.95, 0]}>
              <sphereGeometry args={[0.98, 40, 32]} />
            </mesh>
            {/* eye patch */}
            <mesh material={furDark} position={[-0.36, 2.2, 0.7]} scale={[1, 1.15, 0.5]}>
              <sphereGeometry args={[0.36, 24, 20]} />
            </mesh>
            {/* muzzle + nose */}
            <mesh material={cream} position={[0, 1.7, 0.7]} scale={[1.15, 0.85, 0.8]}>
              <sphereGeometry args={[0.5, 32, 24]} />
            </mesh>
            <mesh material={ink} position={[0, 1.88, 1.12]} scale={[1.2, 0.9, 0.8]}>
              <sphereGeometry args={[0.14, 20, 16]} />
            </mesh>
            <mesh material={ink} position={[0, 1.72, 1.1]}>
              <boxGeometry args={[0.025, 0.24, 0.02]} />
            </mesh>
            {/* cheeks */}
            <mesh material={pink} position={[0.56, 1.9, 0.76]} scale={[1, 0.7, 0.5]}>
              <sphereGeometry args={[0.12, 16, 12]} />
            </mesh>
            <mesh material={pink} position={[-0.56, 1.9, 0.76]} scale={[1, 0.7, 0.5]}>
              <sphereGeometry args={[0.12, 16, 12]} />
            </mesh>
            {/* eyes */}
            <group position={[0.34, 2.22, 0.82]} rotation={[0, 0.25, 0]}>
              <mesh ref={eyeL} material={white} scale={[0.5, 0.6, 0.3]}>
                <sphereGeometry args={[1, 24, 20]} />
              </mesh>
              <group ref={pupilL} position={[0.1, 0, 0.26]}>
                <mesh material={ink}><sphereGeometry args={[0.13, 14, 12]} /></mesh>
                <mesh material={white} position={[0.04, 0.05, 0.1]}><sphereGeometry args={[0.04, 8, 8]} /></mesh>
              </group>
            </group>
            <group position={[-0.34, 2.22, 0.82]} rotation={[0, -0.25, 0]}>
              <mesh ref={eyeR} material={white} scale={[0.5, 0.6, 0.3]}>
                <sphereGeometry args={[1, 24, 20]} />
              </mesh>
              <group ref={pupilR} position={[-0.1, 0, 0.26]}>
                <mesh material={ink}><sphereGeometry args={[0.13, 14, 12]} /></mesh>
                <mesh material={white} position={[0.04, 0.05, 0.1]}><sphereGeometry args={[0.04, 8, 8]} /></mesh>
              </group>
            </group>
            {/* mouth: smile arc (flips to frown) + open mouth */}
            <mesh ref={mouthSmile} material={ink} position={[0, 1.66, 1.08]} rotation={[0, 0, Math.PI]}>
              <torusGeometry args={[0.24, 0.022, 8, 32, Math.PI]} />
            </mesh>
            <mesh ref={mouthOpen} material={mouthRed} position={[0, 1.5, 1.04]} scale={[0.22, 0.001, 0.08]}>
              <sphereGeometry args={[1, 20, 16]} />
            </mesh>
            {/* floppy ears (pivot at top of head) */}
            <group ref={earL} position={[0.74, 2.6, -0.05]}>
              <mesh material={furDark} geometry={earGeo} position={[0, -0.5, 0]} scale={[0.24, 0.52, 0.14]} />
              <mesh material={cream} geometry={earGeo} position={[0, -0.5, 0.08]} scale={[0.14, 0.36, 0.08]} />
            </group>
            <group ref={earR} position={[-0.74, 2.6, -0.05]}>
              <mesh material={furDark} geometry={earGeo} position={[0, -0.5, 0]} scale={[0.24, 0.52, 0.14]} />
              <mesh material={cream} geometry={earGeo} position={[0, -0.5, 0.08]} scale={[0.14, 0.36, 0.08]} />
            </group>
            {/* antenna */}
            <mesh material={steel} position={[0.3, 3.05, 0]}>
              <cylinderGeometry args={[0.025, 0.035, 0.3, 8]} />
            </mesh>
            <mesh material={glowMat} position={[0.3, 3.24, 0]}>
              <sphereGeometry args={[0.08, 14, 12]} />
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

// Spins the puppy around y toward `yaw.current`; the value is written by the
// pointer/keyboard handlers in <Companion> and eased here so drags feel soft.
function Turntable({ yaw, children }: { yaw: React.MutableRefObject<number>; children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y = damp(ref.current.rotation.y, yaw.current, 10, dt);
  });
  return <group ref={ref}>{children}</group>;
}

const TAP_SLOP = 5; // px of movement before a press counts as a drag
const KEY_STEP = 0.35; // rad per arrow key press

export function Companion({ state, className, distance = 6.4, lookY = 1.15, interactive = false, onTap }: {
  state: CompanionState; className?: string;
  /** camera distance from the puppy; larger canvases need more room for jumps and stars */
  distance?: number; lookY?: number;
  /** drag (or ←/→) to rotate the puppy; a click without movement fires onTap */
  interactive?: boolean; onTap?: () => void;
}) {
  const yaw = useRef(0);
  const drag = useRef<{ id: number; lastX: number; moved: number } | null>(null);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!interactive) return;
    drag.current = { id: e.pointerId, lastX: e.clientX, moved: 0 };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.lastX;
    d.lastX = e.clientX;
    d.moved += Math.abs(dx);
    yaw.current += dx * 0.012;
  };
  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    if (d.moved < TAP_SLOP) onTap?.();
  };
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!interactive) return;
    if (e.key === 'ArrowLeft') yaw.current -= KEY_STEP;
    else if (e.key === 'ArrowRight') yaw.current += KEY_STEP;
    else if (e.key === 'Enter' || e.key === ' ') onTap?.();
    else return;
    e.preventDefault();
  };

  return (
    <div
      className={`${className ?? ''} ${interactive ? 'cursor-grab touch-none select-none active:cursor-grabbing' : ''}`}
      aria-hidden={!interactive}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={interactive ? 'Companion. Drag or use arrow keys to turn, press to pet' : undefined}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onKeyDown={onKeyDown}
    >
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [0, lookY + 0.2, distance], fov: 36, near: 0.1, far: 50 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
        onCreated={({ camera }) => camera.lookAt(0, lookY, 0)}
      >
        <hemisphereLight args={['#ffffff', '#c9d2dc', 0.9]} />
        <directionalLight position={[3, 5, 4]} intensity={1.1} />
        <directionalLight position={[-3, 2, -2]} intensity={0.35} />
        <Turntable yaw={yaw}>
          <RobotPup state={state} />
        </Turntable>
        {/* ground shadow disc */}
        <mesh position={[0, -0.52, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[1.05, 40]} />
          <meshBasicMaterial color="#000000" transparent opacity={0.08} />
        </mesh>
      </Canvas>
    </div>
  );
}
