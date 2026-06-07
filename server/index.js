import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'
import { tokenFor, verifyOwnership } from './verify.js'
import { scan } from './scanner.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
app.use(express.json({ limit: '64kb' }))

// --- tiny per-IP rate limiter to keep the engine controlled ---
const hits = new Map()
function rateLimit(req, res, next) {
  const ip = req.ip
  const now = Date.now()
  const rec = hits.get(ip) || { n: 0, reset: now + 60_000 }
  if (now > rec.reset) {
    rec.n = 0
    rec.reset = now + 60_000
  }
  rec.n++
  hits.set(ip, rec)
  if (rec.n > 20) {
    return res.status(429).json({ error: 'Rate limit reached. Try again shortly.' })
  }
  next()
}

const DOMAIN_RE =
  /^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/

function cleanDomain(input) {
  return String(input || '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/:\d+$/, '')
}

app.post('/api/verify/start', rateLimit, (req, res) => {
  const domain = cleanDomain(req.body?.domain)
  if (!DOMAIN_RE.test(domain)) return res.status(400).json({ error: 'Invalid domain.' })
  res.json({ domain, token: tokenFor(domain) })
})

app.post('/api/verify/check', rateLimit, async (req, res) => {
  const domain = cleanDomain(req.body?.domain)
  const method = req.body?.method
  if (!DOMAIN_RE.test(domain)) return res.status(400).json({ error: 'Invalid domain.' })
  if (!['meta', 'wellknown', 'dns'].includes(method))
    return res.status(400).json({ error: 'Invalid verification method.' })
  try {
    const result = await verifyOwnership(domain, method)
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: 'Verification failed: ' + err.message })
  }
})

app.post('/api/scan', rateLimit, async (req, res) => {
  const domain = cleanDomain(req.body?.domain)
  if (!DOMAIN_RE.test(domain)) return res.status(400).json({ error: 'Invalid domain.' })

  // Re-check ownership immediately before scanning. Any verified method passes.
  const methods = ['meta', 'wellknown', 'dns']
  let verified = false
  for (const m of methods) {
    try {
      const r = await verifyOwnership(domain, m)
      if (r.verified) {
        verified = true
        break
      }
    } catch { /* try next method */ }
  }
  if (!verified && process.env.REDLINE_ALLOW_UNVERIFIED !== '1') {
    return res.status(403).json({
      error:
        'Domain ownership is not verified. Complete meta tag, well-known file, or DNS TXT verification first.',
    })
  }

  try {
    const result = await scan(domain)
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: 'Scan failed: ' + err.message })
  }
})

app.get('/api/health', (_req, res) => res.json({ ok: true }))

// --- serve the built SPA in production ---
const dist = path.join(__dirname, '..', 'dist')
if (fs.existsSync(dist)) {
  app.use(express.static(dist))
  app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')))
}

const PORT = process.env.PORT || 8787
app.listen(PORT, () => {
  console.log(`Redline scan engine listening on http://localhost:${PORT}`)
})
