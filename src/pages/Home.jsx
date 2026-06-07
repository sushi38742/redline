import { Link } from 'react-router-dom'
import Scanner from '../components/Scanner.jsx'
import { PRINCIPLES } from '../lib/catalog.js'

export default function Home() {
  return (
    <>
      <section className="hero">
        <div className="container">
          <span className="kicker">● Preflight scanning for AI-built sites</span>
          <h1>
            You shipped it with AI.
            <br />
            Let&apos;s make sure it&apos;s <span className="accent">safe to launch.</span>
          </h1>
          <p className="lead">
            Built your site with Lovable, Cursor, v0, Bolt or ChatGPT? Amazing —
            you moved fast. But AI loves to leave an API key in the page, a
            wide-open CORS rule, or a public <code>.env</code> behind. Redline
            quietly checks for all of it <em>before</em> the internet starts
            improvising.
          </p>
          <div className="pill-row">
            <span className="pill">
              <span className="dot" /> Controlled
            </span>
            <span className="pill">
              <span className="dot" /> Non-destructive
            </span>
            <span className="pill">
              <span className="dot" /> Verified domains only
            </span>
            <span className="pill">
              <span className="dot" /> No public score
            </span>
          </div>
        </div>
      </section>

      <section className="container" style={{ paddingBottom: 24 }}>
        <Scanner />
      </section>

      {/* Conversational pitch for AI builders */}
      <section className="section">
        <div className="container prose" style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: 'clamp(1.6rem,4vw,2.3rem)' }}>
            AI writes great features. It&apos;s terrible at keeping secrets.
          </h2>
          <p className="lead" style={{ margin: '0 auto', maxWidth: 680 }}>
            When a model wires up your app, it&apos;ll happily paste your OpenAI
            or Stripe key straight into the browser bundle, ship source maps that
            expose your whole codebase, or skip the security headers no one told
            it about. None of that shows up on your screen — but it&apos;s all
            sitting there in public. Redline finds it the way an attacker would,
            without ever touching, breaking, or exploiting anything.
          </p>
        </div>
      </section>

      {/* Easy 3-step technical walkthrough */}
      <section className="section" id="how">
        <div className="container">
          <div className="section-head">
            <h2>How it actually works</h2>
            <p>Three steps. No jargon. You stay in control the whole time.</p>
          </div>
          <div className="grid grid-3">
            <div className="card walk-card" style={{ '--accent': '#8b5cff' }}>
              <div className="walk-num">1</div>
              <h3>Prove it&apos;s yours</h3>
              <p>
                Drop a small tag, file, or DNS record on your site so Redline
                knows you own it. This is required — we never scan a domain you
                can&apos;t prove is yours. It takes about a minute.
              </p>
            </div>
            <div className="card walk-card" style={{ '--accent': '#ff5fa2' }}>
              <div className="walk-num">2</div>
              <h3>We look, gently</h3>
              <p>
                Redline reads the same public pages, scripts, headers and DNS
                records anyone on the internet can already see — just faster and
                more thoroughly. No logins, no brute force, no breaking things.
              </p>
            </div>
            <div className="card walk-card" style={{ '--accent': '#2fd4d4' }}>
              <div className="walk-num">3</div>
              <h3>You get plain-English fixes</h3>
              <p>
                Each finding tells you what we saw, how serious it is, how sure
                we are, and exactly how to fix it. Clear the important ones and
                you can earn the Redline verified badge.
              </p>
            </div>
          </div>
          <p
            className="muted"
            style={{ textAlign: 'center', marginTop: 24, fontSize: '0.95rem' }}
          >
            Want the full technical breakdown of every check?{' '}
            <Link to="/methodology">See how it works →</Link>
          </p>
        </div>
      </section>

      {/* Principles */}
      <section className="section">
        <div className="container">
          <div className="section-head">
            <h2>The promises we keep</h2>
            <p>
              Redline runs controlled baseline checks against verified domains,
              then reports status, severity, confidence, evidence and fixes —
              never a public numeric score.
            </p>
          </div>
          <div className="grid grid-2">
            {PRINCIPLES.map((p, i) => (
              <div className="card principle" key={p.title}>
                <span className="principle-tag">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3>{p.title}</h3>
                <p>{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section">
        <div className="container">
          <div
            className="card"
            style={{
              textAlign: 'center',
              padding: '48px 24px',
              background:
                'linear-gradient(180deg, var(--bg-elev), var(--bg-card))',
              border: '1px solid var(--border)',
            }}
          >
            <h2>Pass the scan, become a Redline Partner</h2>
            <p className="muted" style={{ maxWidth: 580, margin: '0 auto 24px' }}>
              Clear the published baseline and you join the Redline Partner
              Program — earning a badge that shows visitors your site was checked
              for the launch mistakes AI tools love to leave behind.
            </p>
            <div
              style={{
                display: 'flex',
                gap: 12,
                justifyContent: 'center',
                flexWrap: 'wrap',
              }}
            >
              <a href="#scan" className="btn btn-primary">
                Scan my site
              </a>
              <Link to="/certificate" className="btn btn-ghost">
                About the badge
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
