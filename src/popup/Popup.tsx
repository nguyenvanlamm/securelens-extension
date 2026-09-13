import { useCallback, useEffect, useMemo, useState } from 'react';
import { Companion } from '../companion/Companion';
import { REACTION_DURATION, reactionForFinding, stateForGrade } from '../companion/poses';
import { infoFor } from '../companion/states';
import { deepScanApi } from '../shared/deepScan';
import { sortFindings, verdictFor } from '../shared/scoring';
import type { CompanionState, Finding } from '../shared/types';
import { DeepProgress, Details, gradeText } from './Details';
import { Logo } from './Logo';
import { StatesSheet } from './StatesSheet';
import { useSiteScan } from './useSiteScan';

type View = 'home' | 'details';

// ?view=details / ?states=1 let the dev-server preview open a sub-screen directly.
const devParam = (k: string) => (import.meta.env.DEV ? new URLSearchParams(location.search).get(k) : null);

export function Popup() {
  const { phase, tab, local, settings, deep, error, rerun, startDeep } = useSiteScan();
  const [reaction, setReaction] = useState<CompanionState | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [source, setSource] = useState<'local' | 'deep'>('local');
  const [view, setView] = useState<View>(() => (devParam('view') === 'details' ? 'details' : 'home'));
  const [showStates, setShowStates] = useState(() => devParam('states') === '1');

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

  const onTapFinding = (f: Finding) => {
    setExpanded((e) => (e === f.id ? null : f.id));
    setReaction(reactionForFinding(f));
  };
  const closeStates = useCallback(() => setShowStates(false), []);

  return (
    <div className="relative flex h-[560px] flex-col">
      {/* header */}
      <header className="flex items-center justify-between border-b border-gray-200 px-4 py-2.5">
        <div className="flex items-center gap-2">
          {view === 'details' ? (
            <button
              type="button"
              onClick={() => setView('home')}
              className="-ml-1 rounded-md px-1.5 py-1 text-xs font-medium text-gray-500 hover:bg-gray-100 hover:text-black"
              aria-label="Back to companion"
            >
              ← Back
            </button>
          ) : (
            <Logo className="h-5 w-5" />
          )}
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

      {view === 'home' ? (
        <>
          {/* stage: the puppy fills the popup */}
          <section className="hero-grid relative flex min-h-0 flex-1 flex-col">
            <Companion
              state={companionState}
              className="min-h-0 flex-1 focus-visible:outline-none"
              distance={7.6} lookY={1.4}
              interactive
              onTap={() => setReaction((r) => r ?? 'cheer')}
            />
            <div className="flex items-end justify-between gap-3 px-4 pb-3">
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold" title={infoFor(companionState)?.meaning}>
                  {infoFor(companionState)?.title ?? '…'}
                </p>
                <p className="truncate font-mono text-[11px] text-gray-500" title={local?.url}>
                  {phase === 'loading' ? 'Checking this page…'
                    : phase === 'unsupported' ? 'Not a scannable page'
                      : phase === 'error' ? (error ?? 'Check failed')
                        : local?.hostname}
                </p>
              </div>
              {phase === 'ready' && verdict && (
                <div className="flex shrink-0 items-baseline gap-1.5 animate-rise" key={`${source}-${verdict.score}`}>
                  <span className={`font-display text-[40px] font-bold leading-none tracking-tighter ${gradeText(verdict.grade)}`}>{verdict.letter}</span>
                  <span className="font-mono text-[11px] text-gray-500">{verdict.score}</span>
                </div>
              )}
            </div>
          </section>

          {/* controls */}
          <footer className="border-t border-gray-200 px-4 py-3">
            {deep.status === 'running' ? (
              <DeepProgress deep={deep} />
            ) : deep.status === 'done' && deep.scanId && settings ? (
              <a
                href={deepScanApi.reportUrl(settings.webBaseUrl, deep.scanId)}
                target="_blank"
                rel="noreferrer"
                className="block w-full rounded-md border border-black py-2.5 text-center text-sm font-medium hover:bg-black hover:text-white"
              >
                Open full report
              </a>
            ) : (
              <button
                type="button"
                disabled={phase !== 'ready' || !tab}
                onClick={startDeep}
                className="w-full rounded-md bg-black py-2.5 text-sm font-medium text-white hover:bg-gray-700 disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                Deep scan
              </button>
            )}
            {deep.status === 'error' && (
              <p className="mt-1.5 truncate text-[11px] text-danger" title={deep.error}>{deep.error}</p>
            )}
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setShowStates(true)}
                className="flex-1 rounded-md border border-gray-200 py-2 text-xs font-medium text-gray-700 hover:border-black hover:text-black"
              >
                What does this mean?
              </button>
              <button
                type="button"
                onClick={() => setView('details')}
                className="flex-1 rounded-md border border-gray-200 py-2 text-xs font-medium text-gray-700 hover:border-black hover:text-black"
              >
                Details
              </button>
            </div>
          </footer>
        </>
      ) : (
        <Details
          phase={phase} tab={tab} local={local} settings={settings} deep={deep} error={error}
          verdict={verdict} findings={findings} source={source} setSource={setSource}
          companionState={companionState} expanded={expanded} onTapFinding={onTapFinding}
          rerun={rerun} startDeep={startDeep}
        />
      )}

      {showStates && <StatesSheet current={companionState} onClose={closeStates} />}
    </div>
  );
}
