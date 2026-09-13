import { describe, expect, it } from 'vitest';
import { analyze, analyzeCookies, analyzeCsp, analyzeHsts, analyzeScheme } from './analyzer';
import { computeScore, verdictFor } from './scoring';

const strongHeaders = {
  'content-security-policy': "default-src 'self'; script-src 'self' 'nonce-abc'",
  'strict-transport-security': 'max-age=63072000; includeSubDomains; preload',
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'permissions-policy': 'camera=()',
  'cross-origin-opener-policy': 'same-origin',
  server: 'nginx',
};

describe('analyzeScheme', () => {
  it('flags plain http as critical -30', () => {
    const [f] = analyzeScheme('http://example.com/');
    expect(f.severity).toBe('critical');
    expect(f.score_impact).toBe(30);
  });
  it('passes https', () => {
    expect(analyzeScheme('https://example.com/')[0].status).toBe('pass');
  });
});

describe('analyzeHsts', () => {
  it('flags short max-age and missing includeSubDomains', () => {
    const ids = analyzeHsts({ 'strict-transport-security': 'max-age=300' }).map((f) => f.id);
    expect(ids).toEqual(['hsts-short-max-age', 'hsts-no-subdomains']);
  });
  it('is clean for a strong policy', () => {
    expect(analyzeHsts(strongHeaders)).toEqual([]);
  });
});

describe('analyzeCsp', () => {
  it('detects unsafe-inline without nonce and wildcard', () => {
    const ids = analyzeCsp({ 'content-security-policy': "script-src * 'unsafe-inline'" }).map((f) => f.id);
    expect(ids).toContain('csp-unsafe-inline');
    expect(ids).toContain('csp-wildcard-script');
    expect(ids).toContain('csp-no-default-src');
  });
  it('does not flag unsafe-inline when a nonce is present', () => {
    const ids = analyzeCsp(strongHeaders).map((f) => f.id);
    expect(ids).toEqual(['csp-strong']);
  });
});

describe('analyzeCookies', () => {
  it('flags insecure cookies only on https and caps deductions', () => {
    const cookies = Array.from({ length: 10 }, (_, i) => ({
      name: `c${i}`, secure: false, httpOnly: false, sameSite: 'unspecified', session: true,
    }));
    const https = analyzeCookies(cookies, true);
    expect(https.find((f) => f.id === 'cookie-no-secure')?.score_impact).toBe(6);
    expect(analyzeCookies(cookies, false).find((f) => f.id === 'cookie-no-secure')).toBeUndefined();
  });
});

describe('analyze + scoring', () => {
  it('gives a strong site an A', () => {
    const findings = analyze({ url: 'https://good.example/', headers: strongHeaders, cookies: [], page: null });
    const score = computeScore(findings);
    expect(score).toBe(100);
    expect(verdictFor(score).grade).toBe('excellent');
  });
  it('gives a bare http site an F', () => {
    const findings = analyze({
      url: 'http://bad.example/', headers: { server: 'Apache/2.4.1', 'x-powered-by': 'PHP/7' }, cookies: [],
      page: { protocol: 'http:', mixedContent: { count: 0, samples: [] }, insecureForms: { count: 1, passwordForms: 1, samples: ['http://bad.example/login'] }, externalScriptHosts: [], hasSri: { total: 0, withIntegrity: 0 } },
    });
    const score = computeScore(findings);
    expect(score).toBeLessThan(25);
    expect(verdictFor(score).letter).toBe('F');
  });
  it('clamps and bands correctly', () => {
    expect(verdictFor(150).score).toBe(100);
    expect(verdictFor(-5).letter).toBe('F');
    expect(verdictFor(75).letter).toBe('B');
    expect(verdictFor(50).letter).toBe('C');
    expect(verdictFor(25).letter).toBe('D');
  });
});
