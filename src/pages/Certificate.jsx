import { Link } from 'react-router-dom'

export default function Certificate() {
  return (
    <section className="section">
      <div className="container prose">
        <span className="kicker">Badge eligibility</span>
        <h1>Get the Redline certificate</h1>
        <p className="lead">
          When a verified domain passes Redline&apos;s published baseline with
          no open critical or high findings at scan time, it becomes eligible to
          display the Redline verified badge.
        </p>

        <div style={{ margin: '24px 0' }}>
          <span className="cert-badge">
            <span className="ring" />
            Redline Verified
          </span>
        </div>

        <h2>How to earn it</h2>
        <ol className="steps">
          <li>
            <h4>Verify ownership</h4>
            <p>
              Prove you control the domain with a meta tag, well-known file or
              DNS TXT record. See the{' '}
              <Link to="/verify">verification guide</Link>.
            </p>
          </li>
          <li>
            <h4>Run a controlled scan</h4>
            <p>
              Redline re-checks verification, then runs its non-destructive
              baseline and reports severity, confidence, evidence and fixes.
            </p>
          </li>
          <li>
            <h4>Resolve open findings</h4>
            <p>
              Apply the recommended fixes for any critical or high findings.
              Each finding includes concrete remediation steps.
            </p>
          </li>
          <li>
            <h4>Re-scan to confirm</h4>
            <p>
              A clean baseline at scan time makes the domain badge eligible.
            </p>
          </li>
          <li>
            <h4>Embed the badge</h4>
            <p>
              Add the badge snippet below. It links back to your most recent
              public report status.
            </p>
          </li>
        </ol>

        <h2>Badge snippet</h2>
        <p className="muted">
          Once eligible, embed this on your site. Replace{' '}
          <code>yourdomain.com</code> with your verified domain.
        </p>
        <pre
          style={{
            background: 'var(--bg)',
            border: '1px solid var(--border-soft)',
            borderRadius: 8,
            padding: '12px 14px',
            overflowX: 'auto',
            fontFamily: 'var(--mono)',
            fontSize: '0.82rem',
          }}
        >
          {`<a href="https://redline.scan/r/yourdomain.com"
   rel="noopener" target="_blank">
  <img src="https://redline.scan/badge/yourdomain.com.svg"
       alt="Redline Verified" width="160" height="40" />
</a>`}
        </pre>

        <h2>What the badge means — and doesn&apos;t</h2>
        <ul>
          <li>
            <strong>Means:</strong> the domain passed Redline&apos;s published
            baseline checks at scan time with no open critical or high findings.
          </li>
          <li>
            <strong>Does not mean:</strong> a complete security assessment, a
            guarantee, or a substitute for a manual penetration test.
          </li>
        </ul>
        <p>
          Eligibility reflects a point in time. Significant changes to your site
          should be followed by a fresh scan. There is no public numeric score —
          only status.
        </p>

        <div style={{ marginTop: 32 }}>
          <Link to="/" className="btn btn-primary">
            Run a scan
          </Link>
        </div>
      </div>
    </section>
  )
}
