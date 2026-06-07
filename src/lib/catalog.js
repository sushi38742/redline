// The published baseline of controlled, non-destructive checks Redline runs.
// This catalog is the single source of truth shown on the home page and the
// methodology page, and it mirrors the check IDs emitted by the scan engine.

export const CHECK_CATALOG = [
  {
    id: 'secrets',
    icon: '🔑',
    accent: '#ff3b6b',
    title: 'Secret & API key exposure',
    summary:
      'Public HTML, JavaScript, source maps, static assets and common config files are checked for known provider key formats. Secrets are redacted and never validated.',
  },
  {
    id: 'ai',
    icon: '🤖',
    accent: '#a06bff',
    title: 'AI app risk',
    summary:
      'Frontend provider URLs, public AI routes, prompt-template hints, permissive CORS and paid-usage endpoints are reviewed as launch risks.',
  },
  {
    id: 'env',
    icon: '📄',
    accent: '#ff7a45',
    title: 'Public environment files',
    summary:
      'Safe public signals for exposed .env and config files are classified by severity and confidence with practical remediation — never exploited.',
  },
  {
    id: 'sourcemaps',
    icon: '🗺️',
    accent: '#ffb020',
    title: 'Source maps',
    summary:
      'Publicly reachable .map files that leak original source are flagged with severity, confidence and evidence.',
  },
  {
    id: 'files',
    icon: '🗂️',
    accent: '#2fd4b6',
    title: 'Public file exposure',
    summary:
      'Common sensitive paths (backups, dumps, VCS folders, admin artifacts) are checked as safe public signals only.',
  },
  {
    id: 'api',
    icon: '🔌',
    accent: '#4aa3ff',
    title: 'API surface review',
    summary:
      'Discoverable API routes, docs and schemas are reviewed for unintended exposure without sending destructive requests.',
  },
  {
    id: 'cors',
    icon: '🌐',
    accent: '#34c3ff',
    title: 'CORS configuration',
    summary:
      'Access-Control headers are reviewed for overly permissive origins and credentialed wildcards.',
  },
  {
    id: 'headers',
    icon: '🛡️',
    accent: '#2fd47b',
    title: 'Security headers',
    summary:
      'HSTS, CSP, X-Content-Type-Options, X-Frame-Options, Referrer-Policy and Permissions-Policy are evaluated against the baseline.',
  },
  {
    id: 'tls',
    icon: '🔒',
    accent: '#5b8cff',
    title: 'HTTPS / TLS',
    summary:
      'HTTPS availability, redirects and certificate validity signals are checked. Plaintext or broken redirects are flagged.',
  },
  {
    id: 'dns',
    icon: '📬',
    accent: '#ff5fa2',
    title: 'DNS and email posture',
    summary:
      'SPF, DMARC, DKIM hints, CAA and dangling-record signals are reviewed for spoofing and takeover risk.',
  },
  {
    id: 'fingerprint',
    icon: '🧩',
    accent: '#9b8bff',
    title: 'CMS / framework fingerprinting',
    summary:
      'Public signals identify the CMS, framework and notable libraries to contextualize other findings.',
  },
  {
    id: 'wordpress',
    icon: '📰',
    accent: '#34c3ff',
    title: 'WordPress checks',
    summary:
      'When WordPress is detected, exposed REST user enumeration, readme version leaks and login surface are reviewed safely.',
  },
  {
    id: 'ratelimit',
    icon: '⏱️',
    accent: '#ffb020',
    title: 'Rate limiting & abuse resistance',
    summary:
      'Strict safe request limits record repeated-request handling only. No load testing and no DDoS claims.',
  },
  {
    id: 'performance',
    icon: '⚡',
    accent: '#ffd23f',
    title: 'Performance and stability',
    summary:
      'Response timing, compression and caching signals are sampled within safe request limits.',
  },
  {
    id: 'privacy',
    icon: '👁️',
    accent: '#2fd4b6',
    title: 'Privacy and tracking signals',
    summary:
      'Third-party trackers, cookie flags and analytics beacons are inventoried as privacy posture signals.',
  },
  {
    id: 'badge',
    icon: '🎖️',
    accent: '#ff3b6b',
    title: 'Badge eligibility',
    summary:
      'A domain that passes the published baseline at scan time becomes eligible for the Redline verified badge.',
  },
]

// Tests a user can pick (everything except the derived 'badge' status).
export const RUNNABLE_CHECKS = CHECK_CATALOG.filter((c) => c.id !== 'badge')

// Heavier checks that fetch multiple assets/paths — flagged in the picker.
export const INTENSIVE_CHECKS = new Set(['secrets', 'api', 'files', 'env'])

// Plain-English narration shown live while each test runs.
export const LIVE_COPY = {
  tls: 'Knocking on http:// and https:// to make sure traffic is encrypted and plaintext gets redirected away.',
  headers:
    'Reading your response headers — checking for HSTS, a Content-Security-Policy, nosniff, clickjacking protection and friends.',
  cors: 'Pretending to be a stranger’s website and asking your server if it’ll share data. Hoping it says no.',
  secrets:
    'Reading your homepage and its scripts the way anyone could, scanning for anything shaped like a live API key — OpenAI, Anthropic, Stripe, AWS. Found ones are redacted, never tested.',
  sourcemaps:
    'Looking for source maps that would hand your original, un-minified code to the public.',
  fingerprint:
    'Working out what built your site — the CMS, framework and libraries — so the other findings make sense.',
  ai: 'Hunting for AI wiring left in the frontend: provider URLs, public chat routes and prompt templates that should live on a server.',
  privacy:
    'Taking inventory of trackers and checking your cookies for the Secure and HttpOnly flags.',
  performance:
    'Timing the homepage and checking whether compression and caching are switched on.',
  env: 'Politely asking for common files like .env and .env.production — they should never answer.',
  files:
    'Checking a short list of paths that leak data when left public: .git, backups, database dumps.',
  api: 'Looking for discoverable API entry points, schemas and introspection that probably shouldn’t be open.',
  dns: 'Querying your DNS for SPF, DMARC and CAA records — the things that stop people spoofing your email and certs.',
  wordpress:
    'If this is WordPress, checking the usual soft spots: REST user enumeration and version-leaking readme files.',
  ratelimit:
    'Sending a tiny, safe handful of repeat requests just to observe how repeats are handled. No load testing, ever.',
}

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
