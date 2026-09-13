import type { CompanionState } from '../shared/types';

// Human-readable legend for every animation state. Shown in the popup's
// "States" sheet; keep in sync with `computePose` in ./poses.ts.
export interface StateInfo {
  state: CompanionState;
  title: string;
  /** what the puppy is physically doing */
  pose: string;
  /** what it means for the site you are on */
  meaning: string;
}

export interface StateGroup {
  label: string;
  hint?: string;
  items: StateInfo[];
}

export const STATE_GROUPS: StateGroup[] = [
  {
    label: 'Verdict',
    hint: 'After the quick check (or deep scan) finishes.',
    items: [
      { state: 'excellent', title: 'Bouncing', pose: 'Jumps with paws up, ears perked, tail going wild, stars around.', meaning: 'Grade A. Strong protections, nothing obvious to worry about.' },
      { state: 'good', title: 'Thumbs up', pose: 'Nods happily, one paw raised, tail wagging.', meaning: 'Grade B. Solid, with a few gaps worth closing.' },
      { state: 'fair', title: 'Head scratch', pose: 'Scratches its head, ears half down, a sweat drop appears.', meaning: 'Grade C. Mixed — several protections are missing.' },
      { state: 'poor', title: 'Shivering', pose: 'Hugs itself and trembles, ears drooped, tail still.', meaning: 'Grade D. Weak — be careful what you type here.' },
      { state: 'critical', title: 'Crying', pose: 'Flails its paws and sobs, ears flat.', meaning: 'Grade F. Dangerous — avoid entering credentials.' },
    ],
  },
  {
    label: 'Working',
    items: [
      { state: 'scanning', title: 'Sniffing around', pose: 'Holds up the lens and looks left and right.', meaning: 'Checking the page, or a deep scan is running.' },
      { state: 'offline', title: 'Napping', pose: 'Head tilted, eyes closed, Zzz floating up.', meaning: 'Nothing to check: not a regular http(s) page, or the check failed.' },
    ],
  },
  {
    label: 'Reactions',
    hint: 'Short reactions when you tap a finding in Details.',
    items: [
      { state: 'cheer', title: 'Cheer', pose: 'Paws up, big grin, stars.', meaning: 'That check passed.' },
      { state: 'startled', title: 'Startled', pose: 'Jumps back with a "!" bubble.', meaning: 'A cookie problem — e.g. missing Secure or HttpOnly.' },
      { state: 'coverEyes', title: 'Covering eyes', pose: 'Paws over the face, peeking through.', meaning: 'Critical issue, or HTTPS / mixed-content / insecure form.' },
      { state: 'facepalm', title: 'Facepalm', pose: 'Paw on forehead, looking down.', meaning: 'A missing CSP or HSTS header.' },
      { state: 'peek', title: 'Peeking', pose: 'Turns sideways and shades its eyes.', meaning: 'Info disclosure or third-party script concern.' },
      { state: 'shrug', title: 'Shrug', pose: 'Paws out, head tilted, "?" bubble.', meaning: 'Some other finding.' },
    ],
  },
];

export function infoFor(state: CompanionState): StateInfo | undefined {
  for (const g of STATE_GROUPS) for (const i of g.items) if (i.state === state) return i;
  return undefined;
}
