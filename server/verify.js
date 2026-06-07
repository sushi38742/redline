import crypto from 'node:crypto'
import dns from 'node:dns/promises'
import { safeFetch, createBudget } from './lib/http.js'

// Tokens are deterministic per domain (HMAC) so the engine can re-derive and
// re-check ownership without a database. Set REDLINE_SECRET in production.
const SECRET = process.env.REDLINE_SECRET || 'redline-dev-secret-change-me'

export function tokenFor(domain) {
  return (
    'rl_' +
    crypto.createHmac('sha256', SECRET).update(domain).digest('hex').slice(0, 40)
  )
}

export async function verifyOwnership(domain, method) {
  const token = tokenFor(domain)
  const budget = createBudget(4)

  if (method === 'meta') {
    const res = await safeFetch(`https://${domain}/`, { budget })
    if (!res.ok) return { verified: false, detail: `Could not load homepage (${res.error}).` }
    const re = new RegExp(
      `<meta[^>]+name=["']redline-site-verification["'][^>]+content=["']${token}["']`,
      'i',
    )
    const re2 = new RegExp(
      `<meta[^>]+content=["']${token}["'][^>]+name=["']redline-site-verification["']`,
      'i',
    )
    return { verified: re.test(res.body) || re2.test(res.body) }
  }

  if (method === 'wellknown') {
    const res = await safeFetch(
      `https://${domain}/.well-known/redline-verification.txt`,
      { budget },
    )
    if (!res.ok) return { verified: false, detail: `Could not load well-known file (${res.error}).` }
    if (res.status !== 200) return { verified: false, detail: `Well-known file returned ${res.status}.` }
    return { verified: res.body.trim().includes(token) }
  }

  if (method === 'dns') {
    try {
      const records = await dns.resolveTxt(`_redline.${domain}`)
      const flat = records.flat().join(' ')
      return { verified: flat.includes(`redline-verification=${token}`) }
    } catch (err) {
      return { verified: false, detail: `DNS lookup failed (${err.code || err.message}).` }
    }
  }

  return { verified: false, detail: 'Unknown verification method.' }
}
