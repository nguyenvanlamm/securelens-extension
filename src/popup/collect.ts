import type { CapturedResponse, CookieInfo, PageSnapshot } from '../shared/types';

export async function getActiveTab(): Promise<chrome.tabs.Tab | null> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab ?? null;
}

export const isScannable = (url?: string) => !!url && /^https?:\/\//i.test(url);

/** Headers captured by the background worker for this tab, if any. */
export async function getCapturedHeaders(tabId: number, url: string): Promise<CapturedResponse | null> {
  const captured = (await chrome.runtime.sendMessage({ type: 'GET_CAPTURED', tabId })) as CapturedResponse | null;
  if (!captured) return null;
  // Only trust the capture when it is for the same origin as the current tab —
  // SPAs can navigate client-side without a new main_frame request.
  try {
    return new URL(captured.url).origin === new URL(url).origin ? captured : null;
  } catch {
    return null;
  }
}

/** Fallback: re-request the document (no cookies) and read response headers. */
export async function fetchHeaders(url: string): Promise<Record<string, string> | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(url, { method: 'GET', credentials: 'omit', cache: 'no-store', redirect: 'follow', signal: ctrl.signal });
    clearTimeout(t);
    const headers: Record<string, string> = {};
    res.headers.forEach((v, k) => { headers[k.toLowerCase()] = v; });
    return headers;
  } catch {
    return null;
  }
}

export async function getCookies(url: string): Promise<CookieInfo[]> {
  try {
    const cookies = await chrome.cookies.getAll({ url });
    return cookies.map((c) => ({
      name: c.name, secure: c.secure, httpOnly: c.httpOnly, sameSite: c.sameSite, session: c.session,
    }));
  } catch {
    return [];
  }
}

// Runs inside the page. Must be self-contained (serialized by executeScript).
function snapshotPage(): PageSnapshot {
  const isHttp = (u: string | null) => !!u && /^http:\/\//i.test(u);
  const mixed: string[] = [];
  const sel = 'script[src], link[rel="stylesheet"][href], img[src], iframe[src], video[src], audio[src], source[src]';
  document.querySelectorAll<HTMLElement>(sel).forEach((el) => {
    const u = el.getAttribute('src') || el.getAttribute('href');
    if (isHttp(u) && mixed.length < 50) mixed.push(u!);
  });
  const forms = Array.from(document.querySelectorAll('form'));
  const insecure = forms.filter((f) => {
    const action = f.getAttribute('action');
    const target = action ? new URL(action, location.href).protocol : location.protocol;
    return target === 'http:';
  });
  const passwordForms = insecure.filter((f) => f.querySelector('input[type="password"]')).length;
  const scripts = Array.from(document.querySelectorAll<HTMLScriptElement>('script[src]'));
  const external = scripts.filter((s) => { try { return new URL(s.src, location.href).host !== location.host; } catch { return false; } });
  const hosts = Array.from(new Set(external.map((s) => new URL(s.src, location.href).host)));
  return {
    protocol: location.protocol,
    mixedContent: { count: mixed.length, samples: mixed.slice(0, 5) },
    insecureForms: {
      count: insecure.length, passwordForms,
      samples: insecure.slice(0, 3).map((f) => f.getAttribute('action') || location.href),
    },
    externalScriptHosts: hosts,
    hasSri: { total: external.length, withIntegrity: external.filter((s) => s.integrity).length },
  };
}

export async function getPageSnapshot(tabId: number): Promise<PageSnapshot | null> {
  try {
    const [res] = await chrome.scripting.executeScript({ target: { tabId }, func: snapshotPage });
    return (res?.result as PageSnapshot) ?? null;
  } catch {
    return null; // chrome:// pages, PDF viewer, restricted origins
  }
}
