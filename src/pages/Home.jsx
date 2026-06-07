import { Link } from 'react-router-dom'
import Scanner from '../components/Scanner.jsx'
import { CHECK_CATALOG, PRINCIPLES } from '../lib/catalog.js'

export default function Home() {
  return (
    <>
      <section className="hero">
        <div className="container">
          <span className="kicker">● Preflight scanning for modern websites</span>
          <h1>
            Catch launch mistakes before
            <br />
            the internet starts <span className="accent">improvising.</span>
          </h1>
          <p className="lead">
            Redline checks verified websites for exposed API keys, AI provider
            credentials, public environment files, risky endpoints, weak
            headers, CORS issues, DNS problems and launch mistakes — controlled,
            non-destructive, and verified domains only.
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

      {/* Principles */}
      <section className="section">
        <div className="container">
          <div className="section-head">
            <h2>How Redline behaves</h2>
            <p>
              Redline runs controlled baseline checks against verified domains,
              then reports status, severity, confidence, evidence and fixes —
              without public numeric scores.
            </p>
          </div>
          <div className="grid grid-2">
            {PRINCIPLES.map((p, i) => (
              <div className="card principle" key={p.title}>
                <span className="principle-tag">{String(i + 1).padStart(2, '0')}</span>
                <h3>{p.title}</h3>
                <p>{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Check catalog */}
      <section className="section" id="checks">
        <div className="container">
          <div className="section-head">
            <h2>What Redline checks</h2>
            <p>
              Every category reports safe public signals classified by severity
              and confidence, with practical remediation and never any
              exploitation.
            </p>
          </div>
          <div className="grid grid-3">
            {CHECK_CATALOG.map((c) => (
              <div
                className="card check-card"
                key={c.id}
                style={{ '--accent': c.accent }}
              >
                <div
                  className="icon"
                  style={{
                    background: `linear-gradient(135deg, ${c.accent}33, ${c.accent}11)`,
                    boxShadow: `inset 0 0 0 1px ${c.accent}40`,
                  }}
                >
                  {c.icon}
                </div>
                <h3>{c.title}</h3>
                <p>{c.summary}</p>
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
            <h2>Earn the Redline verified badge</h2>
            <p className="muted" style={{ maxWidth: 560, margin: '0 auto 24px' }}>
              Pass the published baseline at scan time and become eligible to
              display the Redline badge on your site.
            </p>
            <div
              style={{
                display: 'flex',
                gap: 12,
                justifyContent: 'center',
                flexWrap: 'wrap',
              }}
            >
              <Link to="/certificate" className="btn btn-primary">
                Get the certificate
              </Link>
              <Link to="/methodology" className="btn btn-ghost">
                Read the methodology
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
