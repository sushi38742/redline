// Thin client for the Redline scan engine.

async function post(path, body) {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  let data
  try {
    data = await res.json()
  } catch {
    throw new Error(`Unexpected response from scan engine (${res.status})`)
  }
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
