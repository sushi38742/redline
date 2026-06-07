import dns from 'node:dns/promises'
import { safeFetch, createBudget } from './lib/http.js'
import { SECRET_PATTERNS, redact } from './lib/secrets.js'

let counter = 0
function fid() {
  return 'f' + Date.now().toString(36) + (counter++).toString(36)
}
function finding(category, title, severity, opts = {}) {
  return {
    id: fid(),
    category,
    title,
    severity,
    confidence: opts.confidence || 'medium',
    description: opts.description || '',
    evidence: opts.evidence || '',
    fix: opts.fix || '',
  }
}

// ---- Common sensitive paths (GET only, owner-verified, strictly capped) ----
const ENV_PATHS = ['.env', '.env.local', '.env.production', '.env.development']
const FILE_PATHS = ['.git/config', '.git/HEAD', 'backup.zip', 'db.sql', 'dump.sql', '.DS_Store', 'config.json', 'wp-config.php.bak']
const API_PATHS = ['robots.txt', 'sitemap.xml', 'openapi.json', 'swagger.json', 'api', 'graphql', '.well-known/security.txt']

export async function scan(domain, options = {}) {
  const started = Date.now()
  const budget = createBudget(45)
  const findings = []
  const ctx = {}

  // Which test categories to run. Empty/undefined = run them all.
  const sel = Array.isArray(options.checks) && options.checks.length
    ? new Set(options.checks)
    : null
  const want = (id) => !sel || sel.has(id)
  const requested = sel ? [...sel] : ALL_CHECK_IDS

  // Baseline homepage fetch over HTTPS (needed by any HTTP-based check).
  const needsHome = !sel || [...sel].some((id) => HTTP_CHECKS.has(id))
  const home = needsHome ? await safeFetch(`https://${domain}/`, { budget }) : { ok: false }
  ctx.home = home

  if (want('tls')) await checkTLS(domain, home, findings, budget)
  if (home.ok) {
    if (want('headers')) checkHeaders(home, findings)
    if (want('cors')) await checkCORS(domain, findings, budget)
    if (want('secrets')) await checkSecrets(domain, home, findings, budget)
    if (want('sourcemaps')) checkSourceMaps(home, findings)
    if (want('fingerprint') || want('wordpress')) checkFingerprint(home, findings, ctx)
    if (want('ai')) checkAIRisk(home, findings)
    if (want('privacy')) checkPrivacy(home, findings)
    if (want('performance')) checkPerformance(home, findings)
  } else if (needsHome) {
    findings.push(
      finding('HTTPS / TLS', 'Site did not respond over HTTPS', 'high', {
        confidence: 'high',
        description: `Redline could not fetch https://${domain}/ (${home.error}).`,
        fix: 'Ensure the site serves a valid HTTPS response on the apex/canonical host.',
      }),
    )
  }

  if (want('env')) await checkEnvFiles(domain, findings, budget)
  if (want('files')) await checkPublicFiles(domain, findings, budget)
  if (want('api')) await checkApiSurface(domain, findings, budget)
  if (want('dns')) await checkDNS(domain, findings)
  if (want('wordpress') && ctx.wordpress) await checkWordPress(domain, findings, budget)
  if (want('ratelimit')) await checkRateLimit(domain, findings, budget)

  const checksRun = requested.length
  const hasBlocker = findings.some(
    (f) => f.severity === 'critical' || f.severity === 'high',
  )

  return {
    domain,
    scannedAt: new Date().toISOString(),
    durationMs: Date.now() - started,
    requestsUsed: budget.used,
    checksRun,
    checksRequested: requested,
    partial: Boolean(sel),
    badgeEligible: home.ok && !hasBlocker && !sel,
    findings,
  }
}

// Categories that require fetching the site over HTTP(S).
const HTTP_CHECKS = new Set([
  'tls', 'headers', 'cors', 'secrets', 'sourcemaps', 'fingerprint',
  'ai', 'privacy', 'performance', 'env', 'files', 'api', 'wordpress', 'ratelimit',
])
const ALL_CHECK_IDS = [
  'tls', 'headers', 'cors', 'secrets', 'sourcemaps', 'fingerprint', 'ai',
  'privacy', 'performance', 'env', 'files', 'api', 'dns', 'wordpress', 'ratelimit',
]

// ---------------- HTTPS / TLS ----------------
async function checkTLS(domain, home, findings, budget) {
  const http = await safeFetch(`http://${domain}/`, { budget, redirect: 'manual' })
  if (http.ok) {
    const loc = http.headers?.location || ''
    if (http.status >= 300 && http.status < 400 && loc.startsWith('https://')) {
      findings.push(
        finding('HTTPS / TLS', 'HTTP redirects to HTTPS', 'pass', {
          confidence: 'high',
          evidence: `HTTP ${http.status} → ${loc}`,
        }),
      )
    } else if (http.status === 200) {
      findings.push(
        finding('HTTPS / TLS', 'Plaintext HTTP served without redirect', 'high', {
          confidence: 'high',
          description: 'The site answers on plain HTTP without forcing HTTPS.',
          evidence: `http://${domain}/ returned 200`,
          fix: 'Issue a 301 redirect from HTTP to HTTPS and enable HSTS.',
        }),
      )
    }
  }
  if (home.ok) {
    findings.push(
      finding('HTTPS / TLS', 'HTTPS endpoint reachable', 'pass', {
        confidence: 'high',
        evidence: `https://${domain}/ returned ${home.status}`,
      }),
    )
  }
}

// ---------------- Security headers ----------------
function checkHeaders(home, findings) {
  const h = home.headers
  const checks = [
    { key: 'strict-transport-security', name: 'HSTS', sev: 'medium', fix: 'Add Strict-Transport-Security: max-age=63072000; includeSubDomains; preload.' },
    { key: 'content-security-policy', name: 'Content-Security-Policy', sev: 'medium', fix: 'Define a Content-Security-Policy to limit script/style/connect sources.' },
    { key: 'x-content-type-options', name: 'X-Content-Type-Options', sev: 'low', fix: 'Add X-Content-Type-Options: nosniff.' },
    { key: 'x-frame-options', name: 'Clickjacking protection', sev: 'low', fix: 'Add X-Frame-Options: DENY or a CSP frame-ancestors directive.' },
    { key: 'referrer-policy', name: 'Referrer-Policy', sev: 'low', fix: 'Add Referrer-Policy: strict-origin-when-cross-origin.' },
    { key: 'permissions-policy', name: 'Permissions-Policy', sev: 'low', fix: 'Add a Permissions-Policy to restrict powerful browser features.' },
  ]
  for (const c of checks) {
    if (h[c.key]) {
      findings.push(
        finding('Security headers', `${c.name} present`, 'pass', {
          confidence: 'high',
          evidence: `${c.key}: ${h[c.key].slice(0, 120)}`,
        }),
      )
    } else {
      findings.push(
        finding('Security headers', `${c.name} missing`, c.sev, {
          confidence: 'high',
          description: `The ${c.name} response header was not set on the homepage.`,
          fix: c.fix,
        }),
      )
    }
  }
  if (h['server']) {
    findings.push(
      finding('Security headers', 'Server banner exposes software', 'low', {
        confidence: 'medium',
        description: 'The Server header reveals backend software which aids targeted attacks.',
        evidence: `server: ${h['server']}`,
        fix: 'Suppress or genericize the Server header.',
      }),
    )
  }
  if (h['x-powered-by']) {
    findings.push(
      finding('Security headers', 'X-Powered-By header exposed', 'low', {
        confidence: 'high',
        evidence: `x-powered-by: ${h['x-powered-by']}`,
        fix: 'Remove the X-Powered-By header.',
      }),
    )
  }
}

// ---------------- CORS ----------------
async function checkCORS(domain, findings, budget) {
  const res = await safeFetch(`https://${domain}/`, {
    budget,
    headers: { Origin: 'https://redline-cors-probe.example' },
  })
  if (!res.ok) return
  const acao = res.headers['access-control-allow-origin']
  const acac = res.headers['access-control-allow-credentials']
  if (!acao) {
    findings.push(
      finding('CORS configuration', 'No permissive CORS detected', 'pass', {
        confidence: 'medium',
        evidence: 'No Access-Control-Allow-Origin reflected for an unknown origin.',
      }),
    )
    return
  }
  if (acao === '*' && acac === 'true') {
    findings.push(
      finding('CORS configuration', 'Wildcard CORS with credentials', 'high', {
        confidence: 'high',
        description: 'Allowing any origin together with credentials exposes authenticated data cross-site.',
        evidence: `access-control-allow-origin: *\naccess-control-allow-credentials: true`,
        fix: 'Never combine ACAO:* with credentials. Reflect only an explicit allowlist of origins.',
      }),
    )
  } else if (acao === 'https://redline-cors-probe.example') {
    findings.push(
      finding('CORS configuration', 'Origin reflected without allowlist', 'medium', {
        confidence: 'high',
        description: 'The server reflected an arbitrary Origin, which usually means any site is trusted.',
        evidence: `Reflected access-control-allow-origin: ${acao}`,
        fix: 'Validate the Origin against a strict allowlist before reflecting it.',
      }),
    )
  } else if (acao === '*') {
    findings.push(
      finding('CORS configuration', 'Wildcard CORS (no credentials)', 'low', {
        confidence: 'high',
        description: 'ACAO:* is acceptable for public, non-credentialed resources but review intent.',
        evidence: 'access-control-allow-origin: *',
        fix: 'Confirm only public data is served here; otherwise restrict the origin.',
      }),
    )
  }
}

// ---------------- Secrets ----------------
async function checkSecrets(domain, home, findings, budget) {
  const assets = [{ url: home.finalUrl, body: home.body }]
  // Pull a small number of same-origin scripts.
  const scriptRe = /<script[^>]+src=["']([^"']+)["']/gi
  let m
  const scripts = []
  while ((m = scriptRe.exec(home.body)) && scripts.length < 6) {
    scripts.push(m[1])
  }
  for (const src of scripts) {
    const url = absolute(src, domain)
    if (!url) continue
    const res = await safeFetch(url, { budget })
    if (res.ok && res.status === 200) assets.push({ url, body: res.body })
  }

  let found = 0
  const seen = new Set()
  for (const asset of assets) {
    for (const pat of SECRET_PATTERNS) {
      pat.re.lastIndex = 0
      let mm
      while ((mm = pat.re.exec(asset.body))) {
        const val = mm[0]
        if (pat.hint && !asset.body.slice(Math.max(0, mm.index - 80), mm.index + 80).includes(pat.hint)) continue
        const key = pat.name + redact(val)
        if (seen.has(key)) continue
        seen.add(key)
        found++
        findings.push(
          finding('Secret & API key exposure', `${pat.name} found in public asset`, pat.severity, {
            confidence: pat.name.startsWith('Generic') ? 'low' : 'high',
            description: 'A value matching a known credential format was found in a publicly served asset. Redline redacted it and did not validate it.',
            evidence: `${shortUrl(asset.url, domain)}\n${redact(val)}`,
            fix: 'Rotate the credential immediately, move it server-side, and remove it from the client bundle and history.',
          }),
        )
        if (found > 25) break
      }
    }
  }
  if (found === 0) {
    findings.push(
      finding('Secret & API key exposure', 'No known key formats in public assets', 'pass', {
        confidence: 'medium',
        evidence: `Scanned homepage and ${scripts.length} script(s).`,
      }),
    )
  }
}

// ---------------- Source maps ----------------
function checkSourceMaps(home, findings) {
  const refs = [...home.body.matchAll(/sourceMappingURL=([^\s"'*]+)/g)].map((x) => x[1])
  if (refs.length) {
    findings.push(
      finding('Source maps', 'Source map references exposed', 'medium', {
        confidence: 'medium',
        description: 'Published sourceMappingURL references can expose original source code.',
        evidence: refs.slice(0, 5).join('\n'),
        fix: 'Disable source map emission in production builds or restrict access to .map files.',
      }),
    )
  } else {
    findings.push(
      finding('Source maps', 'No public source map references', 'pass', { confidence: 'low' }),
    )
  }
}

// ---------------- Fingerprint ----------------
function checkFingerprint(home, findings, ctx) {
  const h = home.headers
  const body = home.body
  const sigs = []
  const gen = body.match(/<meta[^>]+name=["']generator["'][^>]+content=["']([^"']+)["']/i)
  if (gen) sigs.push(`generator: ${gen[1]}`)
  if (h['x-powered-by']) sigs.push(`x-powered-by: ${h['x-powered-by']}`)
  if (h['server']) sigs.push(`server: ${h['server']}`)
  if (/wp-content|wp-includes/.test(body)) { sigs.push('WordPress markup'); ctx.wordpress = true }
  if (/_next\/static/.test(body)) sigs.push('Next.js')
  if (/cdn\.shopify\.com/.test(body)) sigs.push('Shopify')
  if (/data-reactroot|__NEXT_DATA__/.test(body)) sigs.push('React')
  if (/Drupal\.settings/.test(body)) sigs.push('Drupal')

  findings.push(
    finding('CMS / framework fingerprinting', sigs.length ? 'Stack fingerprinted from public signals' : 'No obvious stack fingerprint', 'info', {
      confidence: sigs.length ? 'medium' : 'low',
      description: 'Public signals used to contextualize other findings.',
      evidence: sigs.join('\n') || 'No generator/server signals detected.',
    }),
  )
}

// ---------------- AI app risk ----------------
function checkAIRisk(home, findings) {
  const body = home.body
  const hits = []
  if (/api\.openai\.com|api\.anthropic\.com|generativelanguage\.googleapis|api\.cohere|api\.groq\.com/.test(body)) hits.push('Direct AI provider URL referenced in frontend')
  if (/\/api\/(chat|completion|generate|ai|llm|prompt)/i.test(body)) hits.push('Public AI route referenced')
  if (/You are a helpful assistant|system prompt|systemPrompt|"role"\s*:\s*"system"/i.test(body)) hits.push('Prompt-template hint in client code')
  if (hits.length) {
    findings.push(
      finding('AI app risk', 'AI launch risks detected in frontend', 'medium', {
        confidence: 'medium',
        description: 'Frontend AI wiring can leak prompts or route paid usage through the client.',
        evidence: hits.join('\n'),
        fix: 'Proxy AI calls through your backend, keep provider keys server-side, and apply per-user rate/usage limits.',
      }),
    )
  } else {
    findings.push(
      finding('AI app risk', 'No frontend AI provider exposure detected', 'pass', { confidence: 'low' }),
    )
  }
}

// ---------------- Privacy / trackers ----------------
function checkPrivacy(home, findings) {
  const body = home.body
  const trackers = []
  if (/google-analytics\.com|googletagmanager\.com|gtag\(/.test(body)) trackers.push('Google Analytics / GTM')
  if (/connect\.facebook\.net|fbq\(/.test(body)) trackers.push('Meta Pixel')
  if (/hotjar\.com/.test(body)) trackers.push('Hotjar')
  if (/segment\.(com|io)/.test(body)) trackers.push('Segment')
  const setCookie = home.headers['set-cookie'] || ''
  if (setCookie && !/secure/i.test(setCookie)) {
    findings.push(
      finding('Privacy and tracking signals', 'Cookie set without Secure flag', 'low', {
        confidence: 'medium',
        evidence: 'Set-Cookie missing Secure attribute on homepage.',
        fix: 'Add Secure and HttpOnly (and SameSite) attributes to cookies.',
      }),
    )
  }
  findings.push(
    finding('Privacy and tracking signals', trackers.length ? `${trackers.length} third-party tracker(s) detected` : 'No common trackers detected', 'info', {
      confidence: 'medium',
      evidence: trackers.join('\n') || 'No common analytics/marketing beacons found.',
      fix: trackers.length ? 'Ensure trackers are disclosed in your privacy policy and gated behind consent where required.' : '',
    }),
  )
}

// ---------------- Performance ----------------
function checkPerformance(home, findings) {
  const h = home.headers
  const enc = h['content-encoding']
  if (!enc) {
    findings.push(
      finding('Performance and stability', 'No response compression', 'low', {
        confidence: 'medium',
        evidence: 'No Content-Encoding (gzip/br) on homepage.',
        fix: 'Enable gzip or brotli compression at the server/CDN.',
      }),
    )
  } else {
    findings.push(
      finding('Performance and stability', 'Compression enabled', 'pass', { confidence: 'high', evidence: `content-encoding: ${enc}` }),
    )
  }
  findings.push(
    finding('Performance and stability', `Homepage responded in ${home.elapsedMs}ms`, home.elapsedMs > 3000 ? 'low' : 'info', {
      confidence: 'high',
      evidence: `TTFB+body sample: ${home.elapsedMs}ms`,
      fix: home.elapsedMs > 3000 ? 'Investigate slow responses; consider caching/CDN.' : '',
    }),
  )
}

// ---------------- Env files ----------------
async function checkEnvFiles(domain, findings, budget) {
  let exposed = 0
  for (const p of ENV_PATHS) {
    const res = await safeFetch(`https://${domain}/${p}`, { budget })
    if (res.ok && res.status === 200 && /=/.test(res.body) && !/<html/i.test(res.body)) {
      exposed++
      findings.push(
        finding('Public environment files', `Exposed ${p}`, 'critical', {
          confidence: 'high',
          description: 'A public environment file appears to be readable. These commonly contain secrets.',
          evidence: `https://${domain}/${p} → 200\n${redact(res.body.split('\n')[0] || '')}`,
          fix: 'Remove the file from the web root and rotate any secrets it contained.',
        }),
      )
    }
  }
  if (!exposed) {
    findings.push(
      finding('Public environment files', 'No public env files found', 'pass', {
        confidence: 'medium',
        evidence: `Checked: ${ENV_PATHS.join(', ')}`,
      }),
    )
  }
}

// ---------------- Public files ----------------
async function checkPublicFiles(domain, findings, budget) {
  let exposed = 0
  for (const p of FILE_PATHS) {
    const res = await safeFetch(`https://${domain}/${p}`, { budget })
    if (res.ok && res.status === 200 && !/<html/i.test(res.body)) {
      exposed++
      findings.push(
        finding('Public file exposure', `Sensitive path reachable: /${p}`, p.startsWith('.git') ? 'high' : 'medium', {
          confidence: 'medium',
          description: 'A commonly-sensitive path returned content.',
          evidence: `https://${domain}/${p} → 200`,
          fix: 'Block access to this path and remove it from the deployment.',
        }),
      )
    }
  }
  if (!exposed) {
    findings.push(
      finding('Public file exposure', 'No common sensitive paths exposed', 'pass', {
        confidence: 'low',
        evidence: `Checked ${FILE_PATHS.length} paths.`,
      }),
    )
  }
}

// ---------------- API surface ----------------
async function checkApiSurface(domain, findings, budget) {
  const discovered = []
  for (const p of API_PATHS) {
    const res = await safeFetch(`https://${domain}/${p}`, { budget })
    if (res.ok && res.status === 200) {
      if (/openapi|swagger/.test(p) && /(openapi|swagger)/i.test(res.body)) {
        discovered.push(`/${p} (API schema publicly readable)`)
      } else if (p === 'graphql' && /graphql|__schema/i.test(res.body)) {
        discovered.push('/graphql (endpoint responds)')
      } else if (p === 'robots.txt' || p === 'sitemap.xml' || p === '.well-known/security.txt') {
        // informational presence only
      } else if (p === 'api') {
        discovered.push('/api (responds)')
      }
    }
  }
  if (discovered.length) {
    findings.push(
      finding('API surface review', 'Discoverable API surface', 'low', {
        confidence: 'medium',
        description: 'Public API entry points were discoverable. Confirm they are intended to be public.',
        evidence: discovered.join('\n'),
        fix: 'Restrict internal schemas/introspection in production and require auth on non-public endpoints.',
      }),
    )
  } else {
    findings.push(
      finding('API surface review', 'No obviously exposed API surface', 'pass', { confidence: 'low' }),
    )
  }
}

// ---------------- DNS & email ----------------
async function checkDNS(domain, findings) {
  let txt = []
  try {
    txt = (await dns.resolveTxt(domain)).map((r) => r.join(''))
  } catch { /* ignore */ }
  const spf = txt.find((t) => /^v=spf1/i.test(t))
  findings.push(
    spf
      ? finding('DNS and email posture', 'SPF record present', 'pass', { confidence: 'high', evidence: spf })
      : finding('DNS and email posture', 'No SPF record', 'medium', {
          confidence: 'high',
          description: 'Without SPF, attackers can more easily spoof email from your domain.',
          fix: 'Publish a v=spf1 TXT record listing authorized senders, ending in -all.',
        }),
  )

  let dmarc = []
  try {
    dmarc = (await dns.resolveTxt(`_dmarc.${domain}`)).map((r) => r.join(''))
  } catch { /* ignore */ }
  const dm = dmarc.find((t) => /^v=DMARC1/i.test(t))
  findings.push(
    dm
      ? finding('DNS and email posture', 'DMARC record present', 'pass', { confidence: 'high', evidence: dm })
      : finding('DNS and email posture', 'No DMARC record', 'medium', {
          confidence: 'high',
          description: 'DMARC tells receivers how to handle unauthenticated mail from your domain.',
          fix: 'Publish a _dmarc TXT record, e.g. v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.',
        }),
  )

  try {
    const caa = await dns.resolveCaa(domain)
    if (caa?.length) {
      findings.push(finding('DNS and email posture', 'CAA record present', 'pass', { confidence: 'high', evidence: JSON.stringify(caa).slice(0, 120) }))
    } else {
      findings.push(finding('DNS and email posture', 'No CAA record', 'low', { confidence: 'medium', fix: 'Add a CAA record to restrict which CAs may issue certs for your domain.' }))
    }
  } catch { /* ignore */ }
}

// ---------------- WordPress ----------------
async function checkWordPress(domain, findings, budget) {
  const users = await safeFetch(`https://${domain}/wp-json/wp/v2/users`, { budget })
  if (users.ok && users.status === 200 && /"slug"|"name"/.test(users.body)) {
    findings.push(
      finding('WordPress checks', 'REST API user enumeration enabled', 'medium', {
        confidence: 'high',
        description: 'The WordPress REST users endpoint exposes account names that aid credential attacks.',
        evidence: `https://${domain}/wp-json/wp/v2/users → 200`,
        fix: 'Disable or restrict the users REST endpoint and use a security plugin to block enumeration.',
      }),
    )
  }
  const readme = await safeFetch(`https://${domain}/readme.html`, { budget })
  if (readme.ok && readme.status === 200 && /wordpress/i.test(readme.body)) {
    const ver = readme.body.match(/Version\s+([0-9.]+)/i)
    findings.push(
      finding('WordPress checks', 'readme.html exposes WordPress version', 'low', {
        confidence: 'high',
        evidence: ver ? `Version ${ver[1]}` : 'readme.html publicly readable',
        fix: 'Delete readme.html from the web root.',
      }),
    )
  }
}

// ---------------- Rate limiting (strict, safe) ----------------
async function checkRateLimit(domain, findings, budget) {
  const statuses = []
  for (let i = 0; i < 3 && budget.used < budget.max; i++) {
    const res = await safeFetch(`https://${domain}/`, { budget })
    statuses.push(res.ok ? res.status : res.error)
  }
  const limited = statuses.includes(429)
  findings.push(
    finding('Rate limiting and abuse resistance', limited ? 'Rate limiting observed' : 'Repeated-request handling recorded', limited ? 'pass' : 'info', {
      confidence: 'low',
      description: 'Redline records repeated-request handling only within strict safe limits. It does not load-test and makes no DDoS claims.',
      evidence: `3 sampled requests → ${statuses.join(', ')}`,
      fix: limited ? '' : 'Consider edge/application rate limiting on sensitive endpoints.',
    }),
  )
}

// ---------------- helpers ----------------
function absolute(src, domain) {
  try {
    if (src.startsWith('//')) return 'https:' + src
    if (src.startsWith('http')) return src
    if (src.startsWith('/')) return `https://${domain}${src}`
    return `https://${domain}/${src}`
  } catch {
    return null
  }
}
function shortUrl(url, domain) {
  return url.replace(`https://${domain}`, '').slice(0, 120) || '/'
}
