import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'
import { health, verifyStart, verifyCheck, runScan } from './core.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Load .env (git-ignored) without a dependency, if present.
const envPath = path.join(__dirname, '..', '.env')
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i)
    if (m && !(m[1] in process.env)) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
  }
}

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

const send = (res, r) => res.status(r.status).json(r.body)
const allowUnverified = process.env.REDLINE_ALLOW_UNVERIFIED === '1'

app.get('/api/health', (_req, res) => send(res, health()))
app.post('/api/verify/start', rateLimit, (req, res) => send(res, verifyStart(req.body)))
app.post('/api/verify/check', rateLimit, async (req, res) =>
  send(res, await verifyCheck(req.body)),
)
app.post('/api/scan', rateLimit, async (req, res) =>
  send(res, await runScan(req.body, { allowUnverified })),
)

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
