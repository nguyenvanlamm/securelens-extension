import type { CompanionState } from '../shared/types';

// One numeric pose per frame. Every animation state is a pure function of
// (state, time since state began). The renderer damps toward these values,
// so switching states produces a smooth blend for free.
export interface Pose {
  bodyX: number; bodyY: number; bodyRotY: number; bodyRotZ: number;
  headRotX: number; headRotY: number; headRotZ: number;
  armLRotX: number; armLRotZ: number; armRRotX: number; armRRotZ: number;
  eyeOpen: number; pupilX: number; pupilY: number;
  mouthOpen: number; mouthSmile: number;
  tears: number; zzz: number; stars: number; sweat: number; exclaim: number; question: number;
}

export const REST: Pose = {
  bodyX: 0, bodyY: 0, bodyRotY: 0, bodyRotZ: 0,
  headRotX: 0, headRotY: 0, headRotZ: 0,
  armLRotX: 0, armLRotZ: 0.35, armRRotX: 0, armRRotZ: -0.35,
  eyeOpen: 1, pupilX: 0, pupilY: 0,
  mouthOpen: 0, mouthSmile: 0.4,
  tears: 0, zzz: 0, stars: 0, sweat: 0, exclaim: 0, question: 0,
};

const S = Math.sin, C = Math.cos, A = Math.abs;
// eased hit at the start of a reaction: 1 at t=0, decays to 0 by ~0.6s
const hit = (t: number) => Math.max(0, 1 - t / 0.6) ** 2;

export const REACTION_DURATION: Partial<Record<CompanionState, number>> = {
  startled: 1.8, coverEyes: 2.2, facepalm: 2.2, shrug: 2.0, peek: 2.4, cheer: 2.2,
};

export function computePose(state: CompanionState, t: number): Pose {
  const p: Pose = { ...REST };
  // shared idle breathing
  p.bodyY = S(t * 2) * 0.03;

  switch (state) {
    case 'scanning': {
      p.headRotY = S(t * 1.6) * 0.55;
      p.headRotX = S(t * 3.2) * 0.06;
      p.pupilX = S(t * 1.6) * 0.5;
      p.armRRotX = -1.5; p.armRRotZ = -0.2 + S(t * 4) * 0.08; // holding the lens up
      p.armLRotZ = 0.5;
      p.mouthSmile = 0.15; p.mouthOpen = 0.08;
      break;
    }
    case 'excellent': {
      const j = A(S(t * 4.2));
      p.bodyY = j * 0.55;
      p.bodyRotZ = S(t * 4.2) * 0.12;
      p.armLRotZ = 2.6 + S(t * 8) * 0.2; p.armRRotZ = -2.6 - S(t * 8 + 1) * 0.2;
      p.headRotZ = S(t * 4.2) * 0.15;
      p.mouthOpen = 0.55; p.mouthSmile = 1; p.eyeOpen = 0.85;
      p.stars = 1;
      break;
    }
    case 'good': {
      p.armRRotX = -1.65; p.armRRotZ = -0.15; // thumbs up, forward
      p.armLRotZ = 0.4;
      p.headRotX = S(t * 3) * 0.12 - 0.05; // nodding
      p.headRotZ = 0.08;
      p.mouthSmile = 0.9; p.mouthOpen = 0.15;
      p.stars = 0.4;
      break;
    }
    case 'fair': {
      p.armRRotZ = -2.75 + S(t * 9) * 0.12; p.armRRotX = -0.55; // scratching head
      p.armLRotZ = 0.45;
      p.headRotZ = 0.25; p.headRotX = -0.1;
      p.pupilX = 0.4; p.pupilY = 0.5;
      p.mouthSmile = -0.2; p.mouthOpen = 0.05;
      p.sweat = 1;
      break;
    }
    case 'poor': {
      p.bodyX = S(t * 34) * 0.03;
      p.headRotX = 0.2; p.headRotY = S(t * 34) * 0.03;
      p.armLRotX = -1.25; p.armLRotZ = 0.75; p.armRRotX = -1.25; p.armRRotZ = -0.75; // hugging self
      p.eyeOpen = 0.55; p.pupilY = -0.2;
      p.mouthSmile = -0.7; p.mouthOpen = 0.12 + A(S(t * 20)) * 0.06;
      p.sweat = 0.6;
      break;
    }
    case 'critical': {
      p.bodyY = A(S(t * 7)) * 0.15;
      p.headRotX = -0.25 + S(t * 7) * 0.05;
      p.armLRotZ = 2.2 + S(t * 11) * 0.45; p.armRRotZ = -2.2 - S(t * 11 + 1.5) * 0.45; // flailing
      p.eyeOpen = 0.12;
      p.mouthOpen = 1; p.mouthSmile = -1;
      p.tears = 1;
      break;
    }
    case 'offline': {
      p.bodyY = S(t * 1.1) * 0.04;
      p.headRotZ = 0.42; p.headRotX = 0.28;
      p.armLRotZ = 0.3; p.armRRotZ = -0.3;
      p.eyeOpen = 0.08;
      p.mouthOpen = 0.2 + S(t * 1.1) * 0.08; p.mouthSmile = 0.1;
      p.zzz = 1;
      break;
    }
    case 'startled': {
      const h = hit(t);
      p.bodyY = h * 0.7; p.bodyRotZ = -h * 0.2;
      p.headRotX = -0.35 * h - 0.1;
      p.armLRotZ = 2.4; p.armRRotZ = -2.4;
      p.eyeOpen = 1.35; p.pupilY = 0.1;
      p.mouthOpen = 0.9; p.mouthSmile = 0;
      p.exclaim = 1;
      break;
    }
    case 'coverEyes': {
      p.armLRotX = -1.35; p.armLRotZ = 2.35; p.armRRotX = -1.35; p.armRRotZ = -2.35; // hands on face
      p.headRotX = 0.18;
      p.eyeOpen = 0.35 + A(S(t * 2.5)) * 0.4; // peeking
      p.pupilX = S(t * 2.5) * 0.4;
      p.mouthSmile = -0.5; p.mouthOpen = 0.1;
      p.sweat = 0.6;
      break;
    }
    case 'facepalm': {
      p.armRRotX = -1.4; p.armRRotZ = -2.6;
      p.armLRotZ = 0.35;
      p.headRotX = 0.45; p.headRotZ = -0.1;
      p.eyeOpen = 0.2; p.pupilY = -0.4;
      p.mouthSmile = -0.6; p.mouthOpen = 0.04;
      break;
    }
    case 'shrug': {
      p.armLRotZ = 1.45 + S(t * 3) * 0.08; p.armRRotZ = -1.45 - S(t * 3) * 0.08;
      p.armLRotX = -0.4; p.armRRotX = -0.4;
      p.headRotZ = 0.3;
      p.eyeOpen = 0.75; p.pupilX = -0.3; p.pupilY = 0.25;
      p.mouthSmile = -0.15; p.mouthOpen = 0.05;
      p.question = 1;
      break;
    }
    case 'peek': {
      p.bodyRotY = 0.6; p.headRotY = -0.95;
      p.armRRotX = -1.1; p.armRRotZ = -1.9; // hand shading eyes
      p.armLRotZ = 0.45;
      p.eyeOpen = 0.55; p.pupilX = -0.8;
      p.mouthSmile = -0.1; p.mouthOpen = 0.02;
      break;
    }
    case 'cheer': {
      const j = A(S(t * 6));
      p.bodyY = j * 0.4;
      p.armLRotZ = 2.7; p.armRRotZ = -2.7;
      p.headRotZ = S(t * 6) * 0.1;
      p.eyeOpen = 0.8; p.mouthOpen = 0.6; p.mouthSmile = 1;
      p.stars = 1;
      break;
    }
  }
  // tiny life: occasional blink for open-eyed states
  if (p.eyeOpen > 0.5) {
    const blink = ((t + 1.3) % 3.7);
    if (blink < 0.12) p.eyeOpen *= 0.15;
  }
  void C;
  return p;
}

export function stateForGrade(grade: string): CompanionState {
  switch (grade) {
    case 'excellent': return 'excellent';
    case 'good': return 'good';
    case 'fair': return 'fair';
    case 'poor': return 'poor';
    default: return 'critical';
  }
}

/** Which reaction a tapped finding provokes. */
export function reactionForFinding(f: { category: string; severity: string; status: string }): CompanionState {
  if (f.status === 'pass') return 'cheer';
  if (f.severity === 'critical') return 'coverEyes';
  switch (f.category) {
    case 'https': case 'mixed-content': case 'forms': return 'coverEyes';
    case 'cookies': return 'startled';
    case 'csp': case 'hsts': return 'facepalm';
    case 'info-disclosure': case 'scripts': return 'peek';
    default: return 'shrug';
  }
}
