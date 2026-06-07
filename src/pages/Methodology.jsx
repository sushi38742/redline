import { CHECK_CATALOG } from '../lib/catalog.js'

export default function Methodology() {
  return (
    <section className="section">
      <div className="container prose">
        <span className="kicker">Methodology</span>
        <h1>How Redline scans</h1>
        <p className="lead">
          Redline runs controlled, non-destructive checks against verified
          domains only, then reports status, severity, confidence, evidence and
          fixes — without public numeric scores.
        </p>

        <h2>What Redline does not do</h2>
        <ul>
          <li>Exploit vulnerabilities or chain findings into attacks.</li>
          <li>Bypass authentication or access controls.</li>
          <li>Brute force credentials, tokens or directories.</li>
          <li>Perform destructive, stateful or load testing.</li>
          <li>
            Validate discovered secrets with third-party providers — secrets are
            redacted and never sent anywhere.
          </li>
        </ul>

        <h2>Domain verification</h2>
        <p>
          A scan can start only after ownership is proven through one of three
          methods, and Redline re-checks verification immediately before
          scanning:
        </p>
        <ul>
          <li>
            <strong>Meta tag</strong> — a{' '}
            <code>redline-site-verification</code> meta tag in your homepage{' '}
            <code>&lt;head&gt;</code>.
          </li>
          <li>
            <strong>Well-known file</strong> — a token served at{' '}
            <code>/.well-known/redline-verification.txt</code>.
          </li>
          <li>
            <strong>DNS TXT</strong> — a <code>redline-verification=</code>{' '}
            record at <code>_redline.yourdomain.com</code>.
          </li>
        </ul>

        <h2>Severity, confidence & evidence</h2>
        <p>
          Each finding carries a <strong>severity</strong> (critical, high,
          medium, low, info or pass), a <strong>confidence</strong> level (how
          certain the signal is), redacted <strong>evidence</strong>, and a
          concrete <strong>fix</strong>. Redline reports status — never a public
          numeric score.
        </p>
        <table className="cmp">
          <thead>
            <tr>
              <th>Severity</th>
              <th>Meaning</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <span className="badge sev-critical">critical</span>
              </td>
              <td>Live secret or data exposure that needs immediate action.</td>
            </tr>
            <tr>
              <td>
                <span className="badge sev-high">high</span>
              </td>
              <td>Serious misconfiguration likely to be abused at launch.</td>
            </tr>
            <tr>
              <td>
                <span className="badge sev-medium">medium</span>
              </td>
              <td>Weakness worth fixing before or shortly after launch.</td>
            </tr>
            <tr>
              <td>
                <span className="badge sev-low">low</span>
              </td>
              <td>Minor hardening opportunity or informational signal.</td>
            </tr>
            <tr>
              <td>
                <span className="badge sev-pass">pass</span>
              </td>
              <td>Baseline check passed at scan time.</td>
            </tr>
          </tbody>
        </table>

        <h2>The published baseline</h2>
        <p>
          These are the controlled checks Redline runs. Each reports safe public
          signals only.
        </p>
        {CHECK_CATALOG.map((c) => (
          <div key={c.id} style={{ marginTop: 20 }}>
            <h3>
              {c.icon} {c.title}
            </h3>
            <p className="muted">{c.summary}</p>
          </div>
        ))}

        <h2>Rate limiting &amp; safety</h2>
        <p>
          Redline uses strict safe request limits and records repeated-request
          handling only. It does not perform load testing and does not claim
          DDoS protection.
        </p>

        <h2>Limitations</h2>
        <p>
          A passing result means the domain passed Redline&apos;s published
          baseline checks at scan time. It is not a complete security
          assessment, and it does not replace a manual penetration test or a
          formal audit.
        </p>
      </div>
    </section>
  )
}
