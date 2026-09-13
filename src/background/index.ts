import type { CapturedResponse } from '../shared/types';

// Capture main-frame response headers per tab so the popup can grade a page
// that was loaded before the popup opened. Only headers are stored — never
// bodies, and Set-Cookie values are dropped (flags come from chrome.cookies).
const KEY = (tabId: number) => `resp:${tabId}`;
const DROP = new Set(['set-cookie', 'authorization', 'proxy-authenticate', 'www-authenticate']);

chrome.webRequest.onHeadersReceived.addListener(
  (details) => {
    if (details.type !== 'main_frame' || details.tabId < 0) return undefined;
    const headers: Record<string, string> = {};
    for (const h of details.responseHeaders ?? []) {
      const name = h.name.toLowerCase();
      if (DROP.has(name) || h.value === undefined) continue;
      headers[name] = headers[name] ? `${headers[name]}, ${h.value}` : h.value;
    }
    const captured: CapturedResponse = {
      url: details.url,
      statusCode: details.statusCode,
      headers,
      capturedAt: Date.now(),
    };
    void chrome.storage.session.set({ [KEY(details.tabId)]: captured });
    return undefined;
  },
  { urls: ['http://*/*', 'https://*/*'], types: ['main_frame'] },
  ['responseHeaders'],
);

chrome.tabs.onRemoved.addListener((tabId) => {
  void chrome.storage.session.remove(KEY(tabId));
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === 'GET_CAPTURED' && typeof msg.tabId === 'number') {
    chrome.storage.session.get(KEY(msg.tabId)).then((v) => sendResponse(v[KEY(msg.tabId)] ?? null));
    return true;
  }
  return false;
});
