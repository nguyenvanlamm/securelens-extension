import type { Finding, GradeKey, Verdict } from './types';

// Same bands as SecureLens backend/app/services/scoring.py.
const BANDS: { min: number; grade: GradeKey; label: string; letter: Verdict['letter'] }[] = [
  { min: 90, grade: 'excellent', label: 'Excellent', letter: 'A' },
  { min: 75, grade: 'good', label: 'Good', letter: 'B' },
  { min: 50, grade: 'fair', label: 'Needs improvement', letter: 'C' },
  { min: 25, grade: 'poor', label: 'Poor', letter: 'D' },
  { min: 0, grade: 'critical', label: 'Critical', letter: 'F' },
];

export function verdictFor(score: number): Verdict {
  const s = Math.max(0, Math.min(100, Math.round(score)));
  const band = BANDS.find((b) => s >= b.min) ?? BANDS[BANDS.length - 1];
  return { score: s, grade: band.grade, label: band.label, letter: band.letter };
}

/** Base 100 minus score_impact of every failing finding, clamped 0..100. */
export function computeScore(findings: Finding[]): number {
  const total = findings.reduce((sum, f) => (f.status === 'fail' && f.score_impact > 0 ? sum + f.score_impact : sum), 0);
  return Math.max(0, Math.min(100, 100 - total));
}

export function severityCounts(findings: Finding[]): Record<string, number> {
  const counts: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0, info: 0, pass: 0 };
  for (const f of findings) counts[f.severity] = (counts[f.severity] ?? 0) + 1;
  return counts;
}

export const SEVERITY_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4, pass: 5 };

export function sortFindings(findings: Finding[]): Finding[] {
  return [...findings].sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || b.score_impact - a.score_impact,
  );
}
