// Lets `vite dev` render popup.html in a normal tab (no chrome.* APIs) with a
// fake tab whose headers come from ?demo=strong|weak|http. Never used inside
// the real extension because chrome.tabs exists there.
export function installDevMock() {
  const g = globalThis as unknown as { chrome?: Partial<typeof chrome> };
  if (g.chrome?.tabs) return;
  const params = new URLSearchParams(location.search);
  const demo = params.get('demo') ?? 'weak';
  const url = demo === 'http' ? 'http://demo.example.com/login' : 'https://demo.example.com/';
  const headers: Record<string, Record<string, string>> = {
    strong: {
      'content-security-policy': "default-src 'self'; script-src 'self' 'nonce-x'",
      'strict-transport-security': 'max-age=63072000; includeSubDomains; preload',
      'x-content-type-options': 'nosniff', 'x-frame-options': 'DENY',
      'referrer-policy': 'strict-origin-when-cross-origin', 'permissions-policy': 'camera=()',
      'cross-origin-opener-policy': 'same-origin', server: 'nginx',
    },
    weak: { 'x-content-type-options': 'nosniff', server: 'Apache/2.4.29', 'x-powered-by': 'PHP/7.2' },
    http: { server: 'Apache/2.4.29' },
  };
  const fakeHeaders = headers[demo] ?? headers.weak;
  const originalFetch = globalThis.fetch.bind(globalThis);
  globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    if (String(input).startsWith(url)) return Promise.resolve(new Response('', { headers: fakeHeaders }));
    return originalFetch(input, init);
  }) as typeof fetch;

  g.chrome = {
    tabs: { query: async () => [{ id: 1, url, active: true } as chrome.tabs.Tab] } as unknown as typeof chrome.tabs,
    runtime: { sendMessage: async () => null, openOptionsPage: () => alert('options') } as unknown as typeof chrome.runtime,
    cookies: {
      getAll: async () => (demo === 'strong' ? [] : [
        { name: 'sid', secure: false, httpOnly: false, sameSite: 'unspecified', session: true },
        { name: 'pref', secure: true, httpOnly: true, sameSite: 'lax', session: false },
      ]) as chrome.cookies.Cookie[],
    } as unknown as typeof chrome.cookies,
    scripting: {
      executeScript: async () => [{ result: {
        protocol: new URL(url).protocol,
        mixedContent: { count: demo === 'weak' ? 2 : 0, samples: ['http://cdn.example.com/a.js', 'http://img.example.com/b.png'] },
        insecureForms: { count: demo === 'http' ? 1 : 0, passwordForms: demo === 'http' ? 1 : 0, samples: [url] },
        externalScriptHosts: ['cdn.example.com'], hasSri: { total: 1, withIntegrity: 0 },
      } }],
    } as unknown as typeof chrome.scripting,
    storage: { sync: { get: async () => ({}), set: async () => {} } } as unknown as typeof chrome.storage,
  };
}
