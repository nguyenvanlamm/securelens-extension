import { useEffect, useMemo, useState } from 'react';
import { Companion } from '../companion/Companion';
import { REACTION_DURATION, reactionForFinding, stateForGrade } from '../companion/poses';
import { deepScanApi } from '../shared/deepScan';
import { severityCounts, sortFindings, verdictFor } from '../shared/scoring';
import type { CompanionState, Finding } from '../shared/types';
import { FindingRow } from './FindingRow';
import { Logo } from './Logo';
import { useSiteScan } from './useSiteScan';

const STATE_COPY: Record<string, string> = {
  excellent: 'Strong. Nothing obvious to worry about.',
  good: 'Solid, with a few gaps worth closing.',
  fair: 'Mixed. Several protections are missing.',
  poor: 'Weak. Be careful what you type here.',
  critical: 'Dangerous. Avoid entering credentials.',
};

export function Popup() {
  const { phase, tab, local, settings, deep, error, rerun, startDeep } = useSiteScan();
  const [reaction, setReaction] = useState<CompanionState | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [source, setSource] = useState<'local' | 'deep'>('local');

  useEffect(() => {
    if (deep.status === 'done') setSource('deep');
  }, [deep.status]);

  useEffect(() => {
    if (!reaction) return;
    const t = setTimeout(() => setReaction(null), (REACTION_DURATION[reaction] ?? 2) * 1000);
    return () => clearTimeout(t);
  }, [reaction]);

  const findings: Finding[] = useMemo(() => {
    const list = source === 'deep' && deep.findings ? deep.findings : local?.findings ?? [];
    return sortFindings(list);
  }, [source, deep.findings, local]);

  const verdict = useMemo(() => {
    if (source === 'deep' && deep.score !== undefined) return verdictFor(deep.score);
    return local?.verdict ?? null;
  }, [source, deep.score, local]);

  const baseState: CompanionState =
    phase === 'loading' || deep.status === 'running' ? 'scanning'
      : phase !== 'ready' || !verdict ? 'offline'
        : stateForGrade(verdict.grade);
  const companionState = reaction ?? baseState;

  const counts = severityCounts(findings);
  const issues = findings.filter((f) => f.status === 'fail').length;

  const onTapFinding = (f: Finding) => {
    setExpanded((e) => (e === f.id ? null : f.id));
    setReaction(reactionForFinding(f));
  };

  return (
    <div className="flex h-[560px] flex-col">
      {/* header */}
      <header className="flex items-center justify-between border-b border-gray-200 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Logo className="h-5 w-5" />
          <span className="font-display text-[15px] font-semibold tracking-tight">SecureLens</span>
        </div>
        <button
          type="button"
          onClick={() => chrome.runtime.openOptionsPage()}
          className="rounded-md px-2 py-1 text-xs font-medium text-gray-500 hover:bg-gray-100 hover:text-black"
          aria-label="Settings"
        >
          Settings
        </button>
      </header>

      {/* hero */}
      <section className="hero-grid relative border-b border-gray-200">
        <div className="flex items-stretch">
          <Companion state={companionState} className="h-[190px] w-[200px] shrink-0" />
          <div className="flex flex-1 flex-col justify-center pr-4">
            {phase === 'ready' && verdict ? (
              <div className="animate-rise" key={`${source}-${verdict.score}`}>
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-[64px] font-bold leading-none tracking-tighter">{verdict.letter}</span>
                  <span className="font-mono text-sm text-gray-500">{verdict.score}<span className="text-gray-300">/100</span></span>
                </div>
                <p className={`mt-1 text-[13px] font-medium ${gradeText(verdict.grade)}`}>{verdict.label}</p>
                <p className="mt-1 text-xs leading-snug text-gray-500">{STATE_COPY[verdict.grade]}</p>
              </div>
            ) : phase === 'loading' ? (
              <div>
                <p className="font-display text-lg font-semibold">Checking…</p>
                <p className="mt-1 text-xs text-gray-500">Reading headers, cookies and page resources.</p>
              </div>
            ) : phase === 'unsupported' ? (
              <div>
                <p className="font-display text-lg font-semibold">Nothing to check</p>
                <p className="mt-1 text-xs text-gray-500">Open a regular http(s) website and try again.</p>
              </div>
            ) : (
              <div>
                <p className="font-display text-lg font-semibold">Couldn't check</p>
                <p className="mt-1 text-xs text-danger">{error}</p>
              </div>
            )}
          </div>
        </div>
        {local && (
          <div className="flex items-center justify-between px-4 pb-2.5 text-[11px] text-gray-500">
            <span className="truncate font-mono" title={local.url}>{local.hostname}</span>
            <span className="shrink-0">
              {source === 'deep' ? 'Deep scan' : 'Quick check'}
              {source === 'local' && local.headerSource === 'none' && ' · no headers'}
            </span>
          </div>
        )}
      </section>

      {/* summary strip */}
      {phase === 'ready' && (
        <div className="flex items-center gap-3 border-b border-gray-200 px-4 py-2 text-[11px]">
          <span className="font-medium">{issues} issue{issues === 1 ? '' : 's'}</span>
          <span className="text-gray-300">|</span>
          <Count n={counts.critical + counts.high} label="high+" cls="text-danger" />
          <Count n={counts.medium} label="med" cls="text-warning" />
          <Count n={counts.low} label="low" cls="text-gray-500" />
          <Count n={counts.pass} label="pass" cls="text-green" />
          {deep.status === 'done' && (
            <button
              type="button"
              onClick={() => setSource((s) => (s === 'deep' ? 'local' : 'deep'))}
              className="ml-auto rounded border border-gray-200 px-1.5 py-0.5 text-[10px] font-medium text-gray-500 hover:border-black hover:text-black"
            >
              {source === 'deep' ? 'Show quick' : 'Show deep'}
            </button>
          )}
        </div>
      )}

      {/* findings */}
      <main className="scroll-thin flex-1 overflow-y-auto">
        {phase === 'ready' && findings.length === 0 && (
          <p className="p-4 text-xs text-gray-500">No checks could run for this page.</p>
        )}
        <ul className="divide-y divide-gray-100">
          {findings.map((f, i) => (
            <FindingRow key={f.id} finding={f} index={i} expanded={expanded === f.id} onTap={() => onTapFinding(f)} />
          ))}
        </ul>
      </main>

      {/* footer: deep scan */}
      <footer className="border-t border-gray-200 px-4 py-3">
        {deep.status === 'running' ? (
          <div>
            <div className="flex justify-between text-[11px] text-gray-500">
              <span>Deep scan · {deep.progress?.progress.current ?? 'queued'}</span>
              <span className="font-mono">{deep.progress?.progress.percent ?? 0}%</span>
            </div>
            <div className="mt-1.5 h-1 overflow-hidden rounded bg-gray-100">
              <div className="h-full bg-black transition-[width] duration-500" style={{ width: `${deep.progress?.progress.percent ?? 3}%` }} />
            </div>
          </div>
        ) : deep.status === 'done' && deep.scanId && settings ? (
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-green">Deep scan complete · 11 modules</span>
            <a
              href={deepScanApi.reportUrl(settings.webBaseUrl, deep.scanId)}
              target="_blank"
              rel="noreferrer"
              className="rounded-md border border-black px-3 py-1.5 text-xs font-medium hover:bg-black hover:text-white"
            >
              Open full report
            </a>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              {deep.status === 'error' ? (
                <p className="truncate text-[11px] text-danger" title={deep.error}>{deep.error}</p>
              ) : (
                <p className="text-[11px] text-gray-500">TLS, DNS, CORS, redirects and more via SecureLens.</p>
              )}
            </div>
            <div className="flex shrink-0 gap-1.5">
              <button
                type="button"
                onClick={rerun}
                className="rounded-md border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:border-black hover:text-black"
              >
                Re-check
              </button>
              <button
                type="button"
                disabled={phase !== 'ready' || !tab}
                onClick={startDeep}
                className="rounded-md bg-black px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-700 disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                Deep scan
              </button>
            </div>
          </div>
        )}
      </footer>
    </div>
  );
}

function Count({ n, label, cls }: { n: number; label: string; cls: string }) {
  return (
    <span className={`font-mono ${n ? cls : 'text-gray-300'}`}>
      {n} <span className="font-sans">{label}</span>
    </span>
  );
}

function gradeText(grade: string) {
  switch (grade) {
    case 'excellent': return 'text-green';
    case 'good': return 'text-green';
    case 'fair': return 'text-warning';
    default: return 'text-danger';
  }
}
