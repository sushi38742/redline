// The published baseline of controlled, non-destructive checks Redline runs.
// This catalog is the single source of truth shown on the home page and the
// methodology page, and it mirrors the check IDs emitted by the scan engine.

export const CHECK_CATALOG = [
  {
    id: 'secrets',
    icon: '🔑',
    title: 'Secret & API key exposure',
    summary:
      'Public HTML, JavaScript, source maps, static assets and common config files are checked for known provider key formats. Secrets are redacted and never validated.',
  },
  {
    id: 'ai',
    icon: '🤖',
    title: 'AI app risk',
    summary:
      'Frontend provider URLs, public AI routes, prompt-template hints, permissive CORS and paid-usage endpoints are reviewed as launch risks.',
  },
  {
    id: 'env',
    icon: '📄',
    title: 'Public environment files',
    summary:
      'Safe public signals for exposed .env and config files are classified by severity and confidence with practical remediation — never exploited.',
  },
  {
    id: 'sourcemaps',
    icon: '🗺️',
    title: 'Source maps',
    summary:
      'Publicly reachable .map files that leak original source are flagged with severity, confidence and evidence.',
  },
  {
    id: 'files',
    icon: '🗂️',
    title: 'Public file exposure',
    summary:
      'Common sensitive paths (backups, dumps, VCS folders, admin artifacts) are checked as safe public signals only.',
  },
  {
    id: 'api',
    icon: '🔌',
    title: 'API surface review',
    summary:
      'Discoverable API routes, docs and schemas are reviewed for unintended exposure without sending destructive requests.',
  },
  {
    id: 'cors',
    icon: '🌐',
    title: 'CORS configuration',
    summary:
      'Access-Control headers are reviewed for overly permissive origins and credentialed wildcards.',
  },
  {
    id: 'headers',
    icon: '🛡️',
    title: 'Security headers',
    summary:
      'HSTS, CSP, X-Content-Type-Options, X-Frame-Options, Referrer-Policy and Permissions-Policy are evaluated against the baseline.',
  },
  {
    id: 'tls',
    icon: '🔒',
    title: 'HTTPS / TLS',
    summary:
      'HTTPS availability, redirects and certificate validity signals are checked. Plaintext or broken redirects are flagged.',
  },
  {
    id: 'dns',
    icon: '📬',
    title: 'DNS and email posture',
    summary:
      'SPF, DMARC, DKIM hints, CAA and dangling-record signals are reviewed for spoofing and takeover risk.',
  },
  {
    id: 'fingerprint',
    icon: '🧩',
    title: 'CMS / framework fingerprinting',
    summary:
      'Public signals identify the CMS, framework and notable libraries to contextualize other findings.',
  },
  {
    id: 'wordpress',
    icon: '📰',
    title: 'WordPress checks',
    summary:
      'When WordPress is detected, exposed REST user enumeration, readme version leaks and login surface are reviewed safely.',
  },
  {
    id: 'ratelimit',
    icon: '⏱️',
    title: 'Rate limiting & abuse resistance',
    summary:
      'Strict safe request limits record repeated-request handling only. No load testing and no DDoS claims.',
  },
  {
    id: 'performance',
    icon: '⚡',
    title: 'Performance and stability',
    summary:
      'Response timing, compression and caching signals are sampled within safe request limits.',
  },
  {
    id: 'privacy',
    icon: '👁️',
    title: 'Privacy and tracking signals',
    summary:
      'Third-party trackers, cookie flags and analytics beacons are inventoried as privacy posture signals.',
  },
  {
    id: 'badge',
    icon: '🎖️',
    title: 'Badge eligibility',
    summary:
      'A domain that passes the published baseline at scan time becomes eligible for the Redline verified badge.',
  },
]

export const PRINCIPLES = [
  {
    title: 'Controlled',
    body: 'Strict safe request limits. Redline samples public signals — it never floods, fuzzes or load-tests.',
  },
  {
    title: 'Non-destructive',
    body: 'No exploitation, no auth bypass, no brute force, no destructive testing, and no third-party validation of discovered secrets.',
  },
  {
    title: 'Verified domains only',
    body: 'A scan starts only after meta tag, well-known file, or DNS TXT ownership verification passes — re-checked immediately before scanning.',
  },
  {
    title: 'No public score',
    body: 'Redline reports status, severity, confidence, evidence and fixes. There is no public numeric score.',
  },
]

export const SEVERITY_ORDER = ['critical', 'high', 'medium', 'low', 'info', 'pass']
