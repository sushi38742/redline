// Client-side fallback scan. When the Node engine is unavailable, Redline can
// still run real checks that browsers are allowed to make cross-origin:
// DNS-over-HTTPS lookups (Cloudflare). These return genuine SPF/DMARC/CAA/MX
// posture without any backend. Header/secret checks require the engine because
// browser CORS blocks reading cross-origin responses — those are reported as
// "needs engine" rather than faked.

let n = 0
const f = (category, title, severity, opts = {}) => ({
  id: 'c' + Date.now().toString(36) + n++,
  category,
  title,
  severity,
  confidence: opts.confidence || 'medium',
  description: opts.description || '',
  evidence: opts.evidence || '',
  fix: opts.fix || '',
})

async function doh(name, type) {
  const url = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(
    name,
  )}&type=${type}`
  const res = await fetch(url, { headers: { Accept: 'application/dns-json' } })
  if (!res.ok) throw new Error('DoH lookup failed')
  const data = await res.json()
  return (data.Answer || []).map((a) => a.data.replace(/^"|"$/g, ''))
}

export async function clientScan(domain) {
  const started = Date.now()
  const findings = []

  // Does it resolve at all?
  let a = []
  try {
    a = await doh(domain, 'A')
  } catch { /* ignore */ }
  findings.push(
    a.length
      ? f('DNS and email posture', 'Domain resolves', 'pass', {
          confidence: 'high',
          evidence: `A records: ${a.join(', ')}`,
        })
      : f('DNS and email posture', 'Domain did not resolve', 'high', {
          confidence: 'high',
          description: 'No A record was returned for the apex domain.',
          fix: 'Confirm the domain has valid DNS A/AAAA records.',
        }),
  )

  // SPF
  let txt = []
  try {
    txt = await doh(domain, 'TXT')
  } catch { /* ignore */ }
  const spf = txt.find((t) => /^v=spf1/i.test(t))
  findings.push(
    spf
      ? f('DNS and email posture', 'SPF record present', 'pass', {
          confidence: 'high',
          evidence: spf,
        })
      : f('DNS and email posture', 'No SPF record', 'medium', {
          confidence: 'high',
          description: 'Without SPF, your domain is easier to spoof in email.',
          fix: 'Publish a v=spf1 TXT record ending in -all.',
        }),
  )

  // DMARC
  let dmarc = []
  try {
    dmarc = await doh(`_dmarc.${domain}`, 'TXT')
  } catch { /* ignore */ }
  const dm = dmarc.find((t) => /v=DMARC1/i.test(t))
  findings.push(
    dm
      ? f('DNS and email posture', 'DMARC record present', 'pass', {
          confidence: 'high',
          evidence: dm,
        })
      : f('DNS and email posture', 'No DMARC record', 'medium', {
          confidence: 'high',
          description: 'DMARC tells receivers how to handle spoofed mail.',
          fix: 'Publish a _dmarc TXT record, e.g. v=DMARC1; p=quarantine.',
        }),
  )

  // CAA
  let caa = []
  try {
    caa = await doh(domain, 'CAA')
  } catch { /* ignore */ }
  findings.push(
    caa.length
      ? f('DNS and email posture', 'CAA record present', 'pass', {
          confidence: 'high',
          evidence: caa.join('\n'),
        })
      : f('DNS and email posture', 'No CAA record', 'low', {
          confidence: 'medium',
          fix: 'Add a CAA record to restrict which CAs may issue certs.',
        }),
  )

  // MX
  let mx = []
  try {
    mx = await doh(domain, 'MX')
  } catch { /* ignore */ }
  if (mx.length) {
    findings.push(
      f('DNS and email posture', 'Mail (MX) configured', 'info', {
        confidence: 'high',
        evidence: mx.join('\n'),
      }),
    )
  }

  // Note the checks that require the engine.
  findings.push(
    f('Scan coverage', 'Full scan needs the Redline engine', 'info', {
      confidence: 'high',
      description:
        'This is a DNS-only preview run in your browser. Security headers, CORS, secret exposure, env/source-map/file checks and TLS redirect analysis require the Redline scan engine, because browsers block reading cross-origin responses.',
      fix: 'Run the engine (npm start / npm run dev) or deploy it to enable the full non-destructive baseline.',
    }),
  )

  return {
    domain,
    mode: 'client',
    scannedAt: new Date().toISOString(),
    durationMs: Date.now() - started,
    requestsUsed: 5,
    checksRun: 1,
    badgeEligible: false,
    badgeNote: 'Badge eligibility requires a full engine scan.',
    findings,
  }
}
