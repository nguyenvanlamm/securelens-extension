import { useEffect, useRef } from 'react';
import { STATE_GROUPS } from '../companion/states';
import type { CompanionState } from '../shared/types';

export function StatesSheet({ current, onClose }: { current: CompanionState; onClose: () => void }) {
  const activeRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'center' });
  }, [current]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="absolute inset-0 z-10 flex flex-col bg-white animate-rise" role="dialog" aria-modal="true" aria-labelledby="states-title">
      <header className="flex items-center justify-between border-b border-gray-200 px-4 py-2.5">
        <h2 id="states-title" className="font-display text-[15px] font-semibold tracking-tight">What the pup is telling you</h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md px-2 py-1 text-xs font-medium text-gray-500 hover:bg-gray-100 hover:text-black"
        >
          Close
        </button>
      </header>
      <div className="scroll-thin flex-1 overflow-y-auto px-4 py-3">
        {STATE_GROUPS.map((g) => (
          <section key={g.label} className="mb-4 last:mb-0">
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{g.label}</h3>
            {g.hint && <p className="mt-0.5 text-[11px] text-gray-500">{g.hint}</p>}
            <ul className="mt-2 space-y-1.5">
              {g.items.map((s) => {
                const active = s.state === current;
                return (
                  <li
                    key={s.state}
                    ref={active ? activeRef : undefined}
                    aria-current={active || undefined}
                    className={`rounded-md border px-3 py-2 ${active ? 'border-green shadow-card' : 'border-gray-200'}`}
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className={`text-[13px] font-semibold ${active ? 'text-green' : ''}`}>{s.title}</span>
                      {active && <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-green">now</span>}
                    </div>
                    <p className="mt-0.5 text-[11px] leading-snug text-gray-500">{s.pose}</p>
                    <p className="mt-1 text-[12px] leading-snug">{s.meaning}</p>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
