import { Link } from 'react-router-dom'

const CRITERIA = [
  {
    title: 'Secrets & credentials',
    color: '#ff3b6b',
    items: [
      'No live API keys in public HTML, JS or assets',
      'No exposed AI provider credentials (OpenAI, Anthropic, Groq…)',
      'No public .env or config files',
    ],
  },
  {
    title: 'Transport & headers',
    color: '#2fd47b',
    items: [
      'HTTPS enforced with HTTP→HTTPS redirect',
      'Core security headers present (HSTS, CSP, nosniff…)',
      'No software-leaking banners left wide open',
    ],
  },
  {
    title: 'API surface & CORS',
    color: '#4aa3ff',
    items: [
      'No wildcard CORS combined with credentials',
      'No unintended public API schemas or introspection',
      'No source maps leaking original source',
    ],
  },
  {
    title: 'DNS & email posture',
    color: '#ff5fa2',
    items: [
      'SPF and DMARC records published',
      'CAA record restricting certificate issuance',
      'No obvious dangling or takeover-prone records',
    ],
  },
]

export default function Certificate() {
  return (
    <section className="section">
      <div className="container prose">
        <span className="kicker">Redline Partner Program</span>
        <h1>Pass the scan. Become a Redline Partner.</h1>
        <p className="lead">
          The Redline badge isn&apos;t bought — it&apos;s earned. When your
          verified domain clears our published baseline, you join the Redline
          Partner Program and get a badge that tells visitors a real,
          non-destructive security check found nothing critical at scan time.
        </p>

        <div className="cert-hero">
          <div className="cert-medallion">
            <div className="cert-medallion-ring" />
            <div className="cert-medallion-core">
              <span className="cert-check">✓</span>
              <span className="cert-word">REDLINE</span>
              <span className="cert-sub">PARTNER</span>
            </div>
          </div>
        </div>

        <div className="notice ok" style={{ textAlign: 'center' }}>
          <strong>You receive the badge automatically upon completion</strong> —
          the moment a scan passes, your embed code appears right inside the
          report. Nothing to copy ahead of time, nothing to fake.
        </div>

        <h2>What it takes to qualify</h2>
        <p className="muted">
          Every box below is checked with controlled, non-destructive signals.
          Clear them all — with no open critical or high findings — and
          you&apos;re in.
        </p>
        <div className="grid grid-2" style={{ marginTop: 18 }}>
          {CRITERIA.map((c) => (
            <div className="criteria-card" key={c.title}>
              <div className="criteria-head" style={{ background: c.color }}>
                {c.title}
              </div>
              <ul>
                {c.items.map((it) => (
                  <li key={it}>{it}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="notice" style={{ marginTop: 22 }}>
          <strong>Honest by design.</strong> Unlike checklists that promise
          &quot;DDoS protection&quot; or load-test scores, Redline never claims
          what it doesn&apos;t test. We don&apos;t load-test, we don&apos;t
          exploit, and there is <strong>no public numeric score</strong> — only
          a pass/fail status against a published baseline.
        </div>

        <h2>Why partners run the scan</h2>
        <div className="grid grid-3" style={{ marginTop: 18 }}>
          <div className="card">
            <div className="icon" style={{ background: 'rgba(47,212,123,0.15)' }}>
              🤝
            </div>
            <h3>Instant trust</h3>
            <p>
              Show visitors and customers your site was checked for the launch
              mistakes that quietly leak data — before they had to wonder.
            </p>
          </div>
          <div className="card">
            <div className="icon" style={{ background: 'rgba(139,92,255,0.15)' }}>
              🚀
            </div>
            <h3>Launch confidence</h3>
            <p>
              Especially for AI-built sites: catch the exposed key or open CORS
              rule the model left behind before the internet finds it first.
            </p>
          </div>
          <div className="card">
            <div className="icon" style={{ background: 'rgba(74,163,255,0.15)' }}>
              🔁
            </div>
            <h3>Stays current</h3>
            <p>
              Re-scan anytime. Your partner status reflects the latest passing
              scan, so it keeps meaning something as your site changes.
            </p>
          </div>
        </div>

        <h2>How to earn it</h2>
        <ol className="steps">
          <li>
            <h4>Verify ownership</h4>
            <p>
              Prove you control the domain with a meta tag, well-known file or
              DNS TXT record. This is required for every scan.
            </p>
          </li>
          <li>
            <h4>Run a controlled scan</h4>
            <p>
              Redline re-checks ownership, then runs its non-destructive
              baseline and reports severity, confidence, evidence and fixes.
            </p>
          </li>
          <li>
            <h4>Clear the important findings</h4>
            <p>
              Apply the plain-English fixes for any critical or high findings.
              Lows and infos won&apos;t block your badge.
            </p>
          </li>
          <li>
            <h4>Re-scan &amp; collect your badge</h4>
            <p>
              A clean baseline unlocks your partner badge and embed code right
              there in the report.
            </p>
          </li>
        </ol>

        <h2>What the badge means — and doesn&apos;t</h2>
        <ul>
          <li>
            <strong>Means:</strong> the domain passed Redline&apos;s published
            baseline at scan time with no open critical or high findings.
          </li>
          <li>
            <strong>Does not mean:</strong> a complete security assessment, a
            guarantee, or a substitute for a manual penetration test.
          </li>
        </ul>

        <div style={{ marginTop: 32 }}>
          <Link to="/" className="btn btn-primary">
            Scan my site to become a partner
          </Link>
        </div>
      </div>
    </section>
  )
}
