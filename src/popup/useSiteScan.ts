import { useCallback, useEffect, useRef, useState } from 'react';
import { analyze } from '../shared/analyzer';
import { runDeepScan, type DeepScanSummary } from '../shared/deepScan';
import { computeScore, verdictFor } from '../shared/scoring';
import { loadSettings } from '../shared/settings';
import type { Finding, LocalScanResult, Settings } from '../shared/types';
import { fetchHeaders, getActiveTab, getCapturedHeaders, getCookies, getPageSnapshot, isScannable } from './collect';

export type Phase = 'loading' | 'ready' | 'unsupported' | 'error';

export interface DeepState {
  status: 'idle' | 'running' | 'done' | 'error';
  progress?: DeepScanSummary;
  scanId?: string;
  score?: number;
  findings?: Finding[];
  error?: string;
}

export function useSiteScan() {
  const [phase, setPhase] = useState<Phase>('loading');
  const [tab, setTab] = useState<chrome.tabs.Tab | null>(null);
  const [local, setLocal] = useState<LocalScanResult | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [deep, setDeep] = useState<DeepState>({ status: 'idle' });
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const runLocal = useCallback(async () => {
    setPhase('loading');
    setError(null);
    try {
      const t = await getActiveTab();
      setTab(t);
      if (!t?.id || !isScannable(t.url)) { setPhase('unsupported'); return; }
      const url = t.url!;
      const [captured, cookies, page] = await Promise.all([
        getCapturedHeaders(t.id, url), getCookies(url), getPageSnapshot(t.id),
      ]);
      let headers = captured?.headers ?? null;
      let headerSource: LocalScanResult['headerSource'] = captured ? 'webRequest' : 'none';
      if (!headers) {
        headers = await fetchHeaders(url);
        if (headers) headerSource = 'fetch';
      }
      const findings = analyze({ url, headers, cookies, page });
      const score = computeScore(findings);
      setLocal({ url, hostname: new URL(url).hostname, findings, verdict: verdictFor(score), headerSource, scannedAt: Date.now() });
      setPhase('ready');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Scan failed');
      setPhase('error');
    }
  }, []);

  useEffect(() => {
    void loadSettings().then(setSettings);
    void runLocal();
    return () => abortRef.current?.abort();
  }, [runLocal]);

  const startDeep = useCallback(async () => {
    if (!local || !settings) return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setDeep({ status: 'running' });
    try {
      const { summary, findings } = await runDeepScan(
        settings.apiBaseUrl, local.url,
        (p) => setDeep((d) => ({ ...d, progress: p, scanId: p.scan_id })),
        ctrl.signal,
      );
      setDeep({ status: 'done', scanId: summary.scan_id, score: summary.score ?? computeScore(findings), findings, progress: summary });
    } catch (e) {
      if (ctrl.signal.aborted) return;
      setDeep({ status: 'error', error: e instanceof Error ? e.message : 'Deep scan failed' });
    }
  }, [local, settings]);

  return { phase, tab, local, settings, deep, error, rerun: runLocal, startDeep };
}
