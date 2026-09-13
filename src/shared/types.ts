// Mirrors SecureLens' frontend/src/types so deep-scan findings and local
// findings render through the same components.
export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info' | 'pass';
export type FindingStatus = 'fail' | 'pass' | 'warning';

export interface Finding {
  id: string;
  title: string;
  severity: Severity;
  category: string;
  description: string;
  recommendation?: string;
  evidence?: string;
  score_impact: number;
  status: FindingStatus;
}

export type GradeKey = 'excellent' | 'good' | 'fair' | 'poor' | 'critical';

export interface Verdict {
  score: number;
  grade: GradeKey;
  label: string;
  letter: 'A' | 'B' | 'C' | 'D' | 'F';
}

export interface LocalScanResult {
  url: string;
  hostname: string;
  findings: Finding[];
  verdict: Verdict;
  headerSource: 'webRequest' | 'fetch' | 'none';
  scannedAt: number;
}

/** Captured by the background worker from webRequest.onHeadersReceived. */
export interface CapturedResponse {
  url: string;
  statusCode: number;
  headers: Record<string, string>;
  capturedAt: number;
}

/** Collected inside the page via chrome.scripting.executeScript. */
export interface PageSnapshot {
  protocol: string;
  mixedContent: { count: number; samples: string[] };
  insecureForms: { count: number; passwordForms: number; samples: string[] };
  externalScriptHosts: string[];
  hasSri: { total: number; withIntegrity: number };
}

export interface CookieInfo {
  name: string;
  secure: boolean;
  httpOnly: boolean;
  sameSite: string;
  session: boolean;
}

export interface Settings {
  apiBaseUrl: string;
  webBaseUrl: string;
}

export const DEFAULT_SETTINGS: Settings = {
  apiBaseUrl: 'https://securelens-yz6r.onrender.com',
  webBaseUrl: 'https://securelen.lamnv.com',
};

/** Animation states for the 3D companion. */
export type CompanionState =
  | 'scanning'
  | 'excellent'
  | 'good'
  | 'fair'
  | 'poor'
  | 'critical'
  | 'offline'
  // short reactions, triggered when a finding is tapped
  | 'startled'
  | 'coverEyes'
  | 'facepalm'
  | 'shrug'
  | 'peek'
  | 'cheer';

export const REACTION_STATES: CompanionState[] = ['startled', 'coverEyes', 'facepalm', 'shrug', 'peek', 'cheer'];
