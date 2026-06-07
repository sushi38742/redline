// Shared request handlers used by BOTH the Express server (server/index.js) and
// the serverless functions (api/*.js). Each returns { status, body } so the two
// runtimes can adapt it to their own response objects.

import { tokenFor, verifyOwnership } from './verify.js'
import { scan } from './scanner.js'
import { summarizeFindings, aiEnabled } from './lib/ai.js'

export const EXEMPT_DOMAINS = ['collegeconnekt.com', 'dailyfracture.com']

const DOMAIN_RE =
  /^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/

export function cleanDomain(input) {
  return String(input || '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/:\d+$/, '')
}

export function health() {
  return { status: 200, body: { ok: true, aiEnabled: aiEnabled() } }
}

export function verifyStart(body) {
  const domain = cleanDomain(body?.domain)
  if (!DOMAIN_RE.test(domain)) return { status: 400, body: { error: 'Invalid domain.' } }
  return { status: 200, body: { domain, token: tokenFor(domain) } }
}

export async function verifyCheck(body) {
  const domain = cleanDomain(body?.domain)
  const method = body?.method
  if (!DOMAIN_RE.test(domain)) return { status: 400, body: { error: 'Invalid domain.' } }
  if (!['meta', 'wellknown', 'dns'].includes(method))
    return { status: 400, body: { error: 'Invalid verification method.' } }
  try {
    return { status: 200, body: await verifyOwnership(domain, method) }
  } catch (err) {
    return { status: 500, body: { error: 'Verification failed: ' + err.message } }
  }
}

export async function runScan(body, { allowUnverified = false } = {}) {
  const domain = cleanDomain(body?.domain)
  if (!DOMAIN_RE.test(domain)) return { status: 400, body: { error: 'Invalid domain.' } }

  const exempt = EXEMPT_DOMAINS.includes(domain)
  if (!exempt && !allowUnverified) {
    // Re-check ownership immediately before scanning. Any method passing is enough.
    let verified = false
    for (const m of ['meta', 'wellknown', 'dns']) {
      try {
        const r = await verifyOwnership(domain, m)
        if (r.verified) {
          verified = true
          break
        }
      } catch { /* try next */ }
    }
    if (!verified) {
      return {
        status: 403,
        body: {
          error:
            'Domain ownership is not verified. Complete meta tag, well-known file, or DNS TXT verification first.',
        },
      }
    }
  }

  try {
    const result = await scan(domain)
    result.aiSummary = await summarizeFindings(domain, result.findings)
    return { status: 200, body: result }
  } catch (err) {
    return { status: 500, body: { error: 'Scan failed: ' + err.message } }
  }
}
