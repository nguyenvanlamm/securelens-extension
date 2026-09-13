import type { Finding } from './types';

// Client for the SecureLens API (backend/app/api/scans.py). The popup is a
// short-lived page, so we poll GET /api/scans/{id} instead of holding SSE.

export interface DeepScanSummary {
  scan_id: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  score?: number | null;
  grade?: string | null;
  progress: { percent?: number; current?: string | null };
  error?: string | null;
}

async function req<T>(base: string, path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${base}${path}`, { headers: { 'Content-Type': 'application/json' }, ...init });
  } catch {
    throw new Error(`Cannot reach SecureLens at ${base}. Start the backend or change the URL in Settings.`);
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { detail?: string }).detail || `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export const deepScanApi = {
  create: (base: string, url: string) =>
    req<{ scan_id: string; status: string; normalized_url: string }>(base, '/api/scans', {
      method: 'POST', body: JSON.stringify({ url }),
    }),
  status: (base: string, id: string) => req<DeepScanSummary>(base, `/api/scans/${id}`),
  findings: (base: string, id: string) => req<{ scan_id: string; findings: Finding[] }>(base, `/api/scans/${id}/findings`),
  reportUrl: (webBase: string, id: string) => `${webBase}/scanner/${id}`,
};

export async function runDeepScan(
  base: string, url: string, onProgress: (s: DeepScanSummary) => void, signal?: AbortSignal,
): Promise<{ summary: DeepScanSummary; findings: Finding[] }> {
  const { scan_id } = await deepScanApi.create(base, url);
  for (;;) {
    if (signal?.aborted) throw new Error('Cancelled');
    const s = await deepScanApi.status(base, scan_id);
    onProgress(s);
    if (s.status === 'completed') {
      const { findings } = await deepScanApi.findings(base, scan_id);
      return { summary: s, findings };
    }
    if (s.status === 'failed') throw new Error(s.error || 'Scan failed');
    await new Promise((r) => setTimeout(r, 1500));
  }
}
