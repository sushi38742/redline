// Thin client for the Redline scan engine.

// Raised when the backend scan engine isn't reachable (e.g. the site is hosted
// as a static build with no API). Callers can fall back to a client-side scan.
export class EngineUnavailableError extends Error {}

async function post(path, body) {
  let res
  try {
    res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch {
    throw new EngineUnavailableError('Scan engine is not reachable.')
  }
  // A static host answers /api/* with an HTML 404 — not JSON.
  const ct = res.headers.get('content-type') || ''
  if (!ct.includes('application/json')) {
    throw new EngineUnavailableError(
      `Scan engine not running (HTTP ${res.status}).`,
    )
  }
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data?.error || `Request failed (${res.status})`)
  }
  return data
}

export function startVerification(domain) {
  return post('/api/verify/start', { domain })
}

export function checkVerification(domain, method) {
  return post('/api/verify/check', { domain, method })
}

export function runScan(domain) {
  return post('/api/scan', { domain })
}

// Normalize whatever the user typed into a bare hostname.
export function normalizeDomain(input) {
  let v = (input || '').trim().toLowerCase()
  v = v.replace(/^https?:\/\//, '')
  v = v.replace(/\/.*$/, '')
  v = v.replace(/:\d+$/, '')
  return v
}

export function isValidDomain(d) {
  return /^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/.test(
    d,
  )
}
