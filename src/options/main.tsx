import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../styles.css';
import { loadSettings, saveSettings } from '../shared/settings';
import { DEFAULT_SETTINGS, type Settings } from '../shared/types';

function Options() {
  const [s, setS] = useState<Settings>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);
  const [health, setHealth] = useState<'unknown' | 'ok' | 'down'>('unknown');

  useEffect(() => { void loadSettings().then(setS); }, []);

  const save = async () => {
    await saveSettings(s);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const ping = async () => {
    try {
      const r = await fetch(`${s.apiBaseUrl.replace(/\/+$/, '')}/api/health`);
      setHealth(r.ok ? 'ok' : 'down');
    } catch {
      setHealth('down');
    }
  };

  return (
    <div className="mx-auto w-[420px] p-6">
      <h1 className="font-display text-xl font-semibold tracking-tight">SecureLens Companion</h1>
      <p className="mt-1 text-xs text-gray-500">
        Quick checks run entirely in your browser. Deep scans are sent to the SecureLens API below.
      </p>

      <label className="mt-5 block text-xs font-medium">
        API base URL
        <input
          value={s.apiBaseUrl}
          onChange={(e) => setS({ ...s, apiBaseUrl: e.target.value })}
          className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 font-mono text-sm focus:border-black"
          placeholder="https://securelens-yz6r.onrender.com"
          spellCheck={false}
        />
      </label>
      <label className="mt-3 block text-xs font-medium">
        Web app URL (for "Open full report")
        <input
          value={s.webBaseUrl}
          onChange={(e) => setS({ ...s, webBaseUrl: e.target.value })}
          className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 font-mono text-sm focus:border-black"
          placeholder="https://securelen.lamnv.com"
          spellCheck={false}
        />
      </label>

      <div className="mt-5 flex items-center gap-2">
        <button type="button" onClick={save} className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-700">
          Save
        </button>
        <button type="button" onClick={ping} className="rounded-md border border-gray-200 px-4 py-2 text-sm font-medium hover:border-black">
          Test connection
        </button>
        <span className="ml-auto text-xs">
          {saved && <span className="text-green">Saved</span>}
          {!saved && health === 'ok' && <span className="text-green">API reachable</span>}
          {!saved && health === 'down' && <span className="text-danger">API unreachable</span>}
        </span>
      </div>

      <p className="mt-6 border-t border-gray-200 pt-4 text-[11px] leading-relaxed text-gray-500">
        Only response headers, cookie flags (never values) and resource URLs of the active tab are read.
        Nothing leaves your browser unless you press <span className="font-medium text-black">Deep scan</span>,
        which sends the page URL to the configured API.
      </p>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Options />
  </React.StrictMode>,
);
