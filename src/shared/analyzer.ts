import type { CookieInfo, Finding, PageSnapshot, Severity } from './types';

// Local, in-browser subset of SecureLens' scanner modules. Deductions mirror
// backend/app/scanners/* so the popup score tracks the deep-scan score.

type Meta = { title: string; severity: Severity; desc: string; rec: string; impact: number };

export const HEADER_META: Record<string, Meta> = {
  'content-security-policy': {
    title: 'Content-Security-Policy is missing', severity: 'high', impact: 10,
    desc: 'A CSP reduces the impact of content-injection and XSS attacks.',
    rec: 'Define a restrictive CSP. Avoid wildcards and unsafe-inline where practical.',
  },
  'strict-transport-security': {
    title: 'HSTS is missing', severity: 'medium', impact: 8,
    desc: 'HSTS tells browsers to only use HTTPS, blocking downgrade attacks.',
    rec: 'Send `Strict-Transport-Security: max-age=31536000; includeSubDomains`.',
  },
  'x-content-type-options': {
    title: 'X-Content-Type-Options is missing', severity: 'low', impact: 3,
    desc: 'Without nosniff, browsers may MIME-sniff responses and run them as scripts.',
    rec: 'Send `X-Content-Type-Options: nosniff`.',
  },
  'x-frame-options': {
    title: 'X-Frame-Options is missing', severity: 'low', impact: 3,
    desc: 'Missing framing controls make clickjacking easier.',
    rec: 'Send `X-Frame-Options: SAMEORIGIN` or CSP `frame-ancestors`.',
  },
  'referrer-policy': {
    title: 'Referrer-Policy is missing', severity: 'low', impact: 2,
    desc: 'Full URLs may leak to third parties via the Referer header.',
    rec: 'Send `Referrer-Policy: strict-origin-when-cross-origin`.',
  },
  'permissions-policy': {
    title: 'Permissions-Policy is missing', severity: 'info', impact: 0,
    desc: 'Restricts powerful browser features (camera, mic, geolocation).',
    rec: 'Send a restrictive Permissions-Policy for unused features.',
  },
  'cross-origin-opener-policy': {
    title: 'Cross-Origin-Opener-Policy is missing', severity: 'info', impact: 0,
    desc: 'COOP isolates browsing contexts against cross-origin attacks.',
    rec: 'Consider `Cross-Origin-Opener-Policy: same-origin`.',
  },
};

const fail = (
  id: string, category: string, meta: Meta, evidence: string,
): Finding => ({
  id, category, title: meta.title, severity: meta.severity, description: meta.desc,
  recommendation: meta.rec, evidence, score_impact: meta.impact,
  status: meta.severity === 'info' ? 'warning' : 'fail',
});

const pass = (id: string, category: string, title: string, evidence: string, description = ''): Finding => ({
  id, category, title, severity: 'pass', description, evidence, score_impact: 0, status: 'pass',
  recommendation: 'No action needed.',
});

export function analyzeScheme(url: string): Finding[] {
  const u = new URL(url);
  if (u.protocol === 'https:') {
    return [pass('https-enabled', 'https', 'Served over HTTPS', `${u.protocol}//${u.host}`, 'Traffic is encrypted in transit.')];
  }
  return [{
    id: 'https-missing', category: 'https', title: 'Page is served over plain HTTP', severity: 'critical',
    description: 'Everything you see and type here can be read or altered by anyone on the network path.',
    recommendation: 'Serve the site over HTTPS and redirect HTTP → HTTPS.',
    evidence: `${u.protocol}//${u.host}`, score_impact: 30, status: 'fail',
  }];
}

export function analyzeHeaders(headers: Record<string, string> | null): Finding[] {
  if (!headers) return [];
  const out: Finding[] = [];
  for (const [name, meta] of Object.entries(HEADER_META)) {
    const value = headers[name];
    if (value !== undefined) {
      out.push(pass(`header-${name}-present`, 'headers', `${name} is present`, `${name}: ${value.slice(0, 200)}`));
    } else {
      out.push(fail(`missing-${name}`, 'headers', meta, `No \`${name}\` header in response.`));
    }
  }
  return out;
}

export function analyzeHsts(headers: Record<string, string> | null): Finding[] {
  const raw = headers?.['strict-transport-security'];
  if (!raw) return [];
  const lowered = raw.toLowerCase();
  const m = lowered.match(/max-age\s*=\s*"?(\d+)/);
  const maxAge = m ? Number(m[1]) : 0;
  const out: Finding[] = [];
  if (maxAge < 31536000) {
    out.push({
      id: 'hsts-short-max-age', category: 'hsts', title: `HSTS max-age is short (${maxAge}s)`, severity: 'low',
      description: 'A short max-age gives only brief downgrade protection.',
      recommendation: 'Use max-age of at least 31536000 (1 year).', evidence: `Strict-Transport-Security: ${raw}`,
      score_impact: 2, status: 'fail',
    });
  }
  if (!lowered.replace(/[-\s]/g, '').includes('includesubdomains')) {
    out.push({
      id: 'hsts-no-subdomains', category: 'hsts', title: 'HSTS does not include subdomains', severity: 'low',
      description: 'Subdomains remain vulnerable to SSL-stripping.',
      recommendation: 'Add `includeSubDomains` once all subdomains support HTTPS.',
      evidence: `Strict-Transport-Security: ${raw}`, score_impact: 2, status: 'fail',
    });
  }
  return out;
}

export function analyzeCsp(headers: Record<string, string> | null): Finding[] {
  const raw = headers?.['content-security-policy'];
  if (!raw) return [];
  const directives = new Map<string, string[]>();
  for (const part of raw.split(';')) {
    const [name, ...vals] = part.trim().split(/\s+/);
    if (name) directives.set(name.toLowerCase(), vals.map((v) => v.toLowerCase()));
  }
  const script = directives.get('script-src') ?? directives.get('default-src') ?? [];
  const out: Finding[] = [];
  const ev = `Content-Security-Policy: ${raw.slice(0, 200)}`;
  const add = (id: string, title: string, severity: Severity, impact: number, desc: string, rec: string) =>
    out.push({ id, category: 'csp', title, severity, description: desc, recommendation: rec, evidence: ev, score_impact: impact, status: 'fail' });

  if (!directives.has('default-src')) {
    add('csp-no-default-src', 'CSP has no default-src', 'low', 3,
      'Without default-src, unlisted resource types are unrestricted.', 'Add `default-src \'self\'` as a fallback.');
  }
  if (script.includes("'unsafe-inline'") && !script.some((v) => v.startsWith("'nonce-") || v.startsWith("'sha"))) {
    add('csp-unsafe-inline', "CSP allows 'unsafe-inline' scripts", 'medium', 6,
      'Inline scripts are allowed, which neutralises most XSS protection the CSP provides.',
      'Use nonces or hashes instead of unsafe-inline.');
  }
  if (script.includes("'unsafe-eval'")) {
    add('csp-unsafe-eval', "CSP allows 'unsafe-eval'", 'low', 4,
      'eval()-style code execution is permitted.', 'Remove unsafe-eval and refactor code that needs it.');
  }
  if (script.includes('*') || script.some((v) => /^https?:$/.test(v))) {
    add('csp-wildcard-script', 'CSP script-src uses a wildcard', 'medium', 4,
      'Scripts may load from any origin.', 'List explicit trusted origins in script-src.');
  }
  if (out.length === 0) {
    out.push(pass('csp-strong', 'csp', 'CSP has no obvious weaknesses', ev));
  }
  return out;
}

export function analyzeCookies(cookies: CookieInfo[], isHttps: boolean): Finding[] {
  if (cookies.length === 0) return [];
  const notSecure = cookies.filter((c) => !c.secure);
  const notHttpOnly = cookies.filter((c) => !c.httpOnly);
  const laxSameSite = cookies.filter((c) => !c.sameSite || c.sameSite === 'unspecified' || c.sameSite === 'no_restriction');
  const names = (list: CookieInfo[]) => list.slice(0, 5).map((c) => c.name).join(', ') + (list.length > 5 ? ` (+${list.length - 5})` : '');
  const out: Finding[] = [];
  if (isHttps && notSecure.length) {
    out.push({
      id: 'cookie-no-secure', category: 'cookies', title: `${notSecure.length} cookie(s) without Secure flag`, severity: 'medium',
      description: 'Cookies without Secure can be sent over plain HTTP and intercepted.',
      recommendation: 'Set the Secure attribute on every cookie.', evidence: names(notSecure),
      score_impact: Math.min(6, 2 * notSecure.length), status: 'fail',
    });
  }
  if (notHttpOnly.length) {
    out.push({
      id: 'cookie-no-httponly', category: 'cookies', title: `${notHttpOnly.length} cookie(s) readable by JavaScript`, severity: 'low',
      description: 'Cookies without HttpOnly can be stolen by injected scripts.',
      recommendation: 'Set HttpOnly on session and auth cookies.', evidence: names(notHttpOnly),
      score_impact: Math.min(4, notHttpOnly.length), status: 'fail',
    });
  }
  if (laxSameSite.length) {
    out.push({
      id: 'cookie-samesite', category: 'cookies', title: `${laxSameSite.length} cookie(s) without SameSite=Lax/Strict`, severity: 'low',
      description: 'Cookies are sent on cross-site requests, easing CSRF.',
      recommendation: 'Set SameSite=Lax or Strict.', evidence: names(laxSameSite),
      score_impact: Math.min(3, laxSameSite.length), status: 'fail',
    });
  }
  if (out.length === 0) {
    out.push(pass('cookies-hardened', 'cookies', `${cookies.length} cookie(s) use Secure, HttpOnly and SameSite`, names(cookies)));
  }
  return out;
}

export function analyzeInfoDisclosure(headers: Record<string, string> | null): Finding[] {
  if (!headers) return [];
  const out: Finding[] = [];
  const server = headers['server'];
  if (server && /\d/.test(server)) {
    out.push({
      id: 'server-version-disclosed', category: 'info-disclosure', title: 'Server header reveals a version', severity: 'low',
      description: 'Version strings help attackers pick known exploits.', recommendation: 'Strip the version from the Server header.',
      evidence: `Server: ${server}`, score_impact: 3, status: 'fail',
    });
  }
  const powered = headers['x-powered-by'];
  if (powered) {
    out.push({
      id: 'x-powered-by-disclosed', category: 'info-disclosure', title: 'X-Powered-By reveals the stack', severity: 'low',
      description: 'Advertises the framework/runtime in use.', recommendation: 'Remove the X-Powered-By header.',
      evidence: `X-Powered-By: ${powered}`, score_impact: 3, status: 'fail',
    });
  }
  if (out.length === 0 && (server !== undefined || Object.keys(headers).length > 0)) {
    out.push(pass('no-version-disclosure', 'info-disclosure', 'No version information disclosed', server ? `Server: ${server}` : 'No Server / X-Powered-By header'));
  }
  return out;
}

export function analyzePage(snap: PageSnapshot | null): Finding[] {
  if (!snap) return [];
  const out: Finding[] = [];
  const https = snap.protocol === 'https:';
  if (https && snap.mixedContent.count > 0) {
    out.push({
      id: 'mixed-content', category: 'mixed-content', title: `${snap.mixedContent.count} resource(s) loaded over HTTP`, severity: 'medium',
      description: 'Mixed content weakens the HTTPS guarantee; scripts/styles over HTTP can be tampered with.',
      recommendation: 'Load every subresource over HTTPS.', evidence: snap.mixedContent.samples.join('\n'),
      score_impact: 8, status: 'fail',
    });
  } else if (https) {
    out.push(pass('no-mixed-content', 'mixed-content', 'No mixed content detected', 'All scripts, styles, images and iframes use HTTPS.'));
  }
  if (snap.insecureForms.passwordForms > 0) {
    out.push({
      id: 'password-form-insecure', category: 'forms', title: 'Password form submits over HTTP', severity: 'critical',
      description: 'Credentials would travel unencrypted.', recommendation: 'Submit forms only to HTTPS endpoints.',
      evidence: snap.insecureForms.samples.join('\n'), score_impact: 15, status: 'fail',
    });
  } else if (snap.insecureForms.count > 0) {
    out.push({
      id: 'form-insecure', category: 'forms', title: `${snap.insecureForms.count} form(s) submit over HTTP`, severity: 'medium',
      description: 'Form data would travel unencrypted.', recommendation: 'Submit forms only to HTTPS endpoints.',
      evidence: snap.insecureForms.samples.join('\n'), score_impact: 6, status: 'fail',
    });
  }
  if (snap.hasSri.total > 0 && snap.hasSri.withIntegrity < snap.hasSri.total) {
    out.push({
      id: 'sri-missing', category: 'scripts', title: `${snap.hasSri.total - snap.hasSri.withIntegrity}/${snap.hasSri.total} third-party scripts lack integrity`, severity: 'info',
      description: 'Subresource Integrity pins third-party scripts to a known hash.',
      recommendation: 'Add `integrity` attributes to cross-origin <script> tags where possible.',
      evidence: snap.externalScriptHosts.slice(0, 6).join(', '), score_impact: 0, status: 'warning',
    });
  }
  return out;
}

export interface AnalyzeInput {
  url: string;
  headers: Record<string, string> | null;
  cookies: CookieInfo[];
  page: PageSnapshot | null;
}

export function analyze(input: AnalyzeInput): Finding[] {
  const isHttps = new URL(input.url).protocol === 'https:';
  return [
    ...analyzeScheme(input.url),
    ...analyzeHeaders(input.headers),
    ...analyzeHsts(input.headers),
    ...analyzeCsp(input.headers),
    ...analyzeCookies(input.cookies, isHttps),
    ...analyzeInfoDisclosure(input.headers),
    ...analyzePage(input.page),
  ];
}
