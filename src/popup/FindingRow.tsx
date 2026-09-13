import type { Finding, Severity } from '../shared/types';

const DOT: Record<Severity, string> = {
  critical: 'text-danger', high: 'text-danger', medium: 'text-warning',
  low: 'text-gray-500', info: 'text-info', pass: 'text-green',
};

export function FindingRow({ finding: f, index, expanded, onTap }: {
  finding: Finding; index: number; expanded: boolean; onTap: () => void;
}) {
  return (
    <li className="animate-rise" style={{ animationDelay: `${Math.min(index, 12) * 30}ms` }}>
      <button
        type="button"
        onClick={onTap}
        aria-expanded={expanded}
        className="flex w-full items-start gap-2.5 px-4 py-2 text-left hover:bg-gray-50"
      >
        <span className={`mt-[5px] text-[9px] leading-none ${DOT[f.severity]}`} aria-hidden>●</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-medium leading-snug">{f.title}</span>
          <span className="block text-[11px] text-gray-500">
            <span className="capitalize">{f.severity}</span> · {f.category}
          </span>
        </span>
        <span className="shrink-0 font-mono text-[12px] text-gray-500">
          {f.status === 'fail' && f.score_impact > 0 ? `−${f.score_impact}` : f.status === 'pass' ? '✓' : ''}
        </span>
      </button>
      {expanded && (
        <div className="mx-4 mb-2.5 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-[12px] leading-relaxed shadow-card">
          <p>{f.description}</p>
          {f.recommendation && (
            <p className="mt-1.5">
              <span className="font-semibold">Fix: </span>{f.recommendation}
            </p>
          )}
          {f.evidence && (
            <pre className="mt-1.5 overflow-x-auto whitespace-pre-wrap break-all rounded border border-gray-200 bg-white px-2 py-1 font-mono text-[11px] text-gray-700">
              {f.evidence}
            </pre>
          )}
        </div>
      )}
    </li>
  );
}
