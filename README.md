# Redline

**Preflight scanning for modern websites.** Redline checks verified websites
for exposed API keys, AI provider credentials, public environment files, risky
endpoints, weak headers, CORS issues, DNS problems and launch mistakes — before
the internet starts improvising.

- **Controlled** — strict, safe request limits.
- **Non-destructive** — no exploitation, no auth bypass, no brute force.
- **Verified domains only** — meta tag, well-known file or DNS TXT ownership.
- **No public score** — status, severity, confidence, evidence and fixes.

## Stack

- **Frontend:** Vite + React 19 + React Router (`src/`)
- **Scan engine:** Node + Express (`server/`), no browser-bound CORS limits

## Develop

```bash
npm install
npm run dev        # web (5173) + scan engine (8787) together
```

The Vite dev server proxies `/api/*` to the Express engine.

To bypass the verification gate while testing locally:

```bash
REDLINE_ALLOW_UNVERIFIED=1 npm run dev:api
```

## Build & run in production

```bash
npm run build      # outputs dist/
npm start          # Express serves the API + the built SPA on PORT (8787)
```

Set `REDLINE_SECRET` in production so verification tokens are not the dev
default.

## How it works

1. **Verify ownership** — `/api/verify/start` issues a deterministic per-domain
   token; `/api/verify/check` confirms it via meta tag, `/.well-known/` file or
   `_redline.<domain>` DNS TXT record.
2. **Scan** — `/api/scan` re-checks ownership, then runs the published baseline
   (`server/scanner.js`): HTTPS/TLS, security headers, CORS, secret & API-key
   exposure, source maps, env/public files, API surface, DNS & email posture,
   CMS fingerprinting, WordPress, AI app risk, privacy/trackers, performance and
   safe rate-limit sampling.
3. **Report** — every finding carries severity, confidence, redacted evidence
   and a concrete fix. Secrets are redacted and never validated against any
   provider.

## Limitations

A passing result means the domain passed Redline's published baseline checks at
scan time. It is **not** a complete security assessment.
