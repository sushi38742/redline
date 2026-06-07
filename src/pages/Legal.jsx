import { useParams, Link } from 'react-router-dom'

const TABS = [
  { id: 'terms', label: 'Terms of use' },
  { id: 'privacy', label: 'Privacy' },
  { id: 'scope', label: 'Scope & safe harbor' },
  { id: 'disclosure', label: 'Responsible disclosure' },
]

export default function Legal() {
  const { tab } = useParams()
  const active = TABS.find((t) => t.id === tab)?.id || 'terms'

  return (
    <section className="section">
      <div className="container prose">
        <span className="kicker">Legal</span>
        <h1>Legal &amp; policy</h1>

        <div className="tabs" style={{ marginBottom: 28, flexWrap: 'wrap' }}>
          {TABS.map((t) => (
            <Link
              key={t.id}
              to={`/legal/${t.id}`}
              className={`tab ${active === t.id ? 'active' : ''}`}
            >
              {t.label}
            </Link>
          ))}
        </div>

        {active === 'terms' && <Terms />}
        {active === 'privacy' && <Privacy />}
        {active === 'scope' && <Scope />}
        {active === 'disclosure' && <Disclosure />}
      </div>
    </section>
  )
}

function Terms() {
  return (
    <>
      <h2>Terms of use</h2>
      <p className="muted">Last updated 2026.</p>
      <p>
        Redline provides controlled, non-destructive preflight scanning of
        websites whose ownership you have verified. By using Redline you agree to
        these terms.
      </p>
      <h3>Authorized use only</h3>
      <ul>
        <li>
          You may only scan domains you own or are explicitly authorized to
          test. Ownership must be verified before any scan runs.
        </li>
        <li>
          You may not use Redline to scan third-party domains without permission,
          or to circumvent the verification requirement.
        </li>
      </ul>
      <h3>No warranty</h3>
      <p>
        Redline is provided &quot;as is&quot;. A passing result means the domain
        passed Redline&apos;s published baseline checks at scan time. It is not a
        complete security assessment and creates no guarantee. To the maximum
        extent permitted by law, Redline disclaims all warranties and is not
        liable for incidental or consequential damages.
      </p>
      <h3>Acceptable use</h3>
      <p>
        Don&apos;t attempt to overload the service, reverse the safe-request
        limits, or use results to harm others. We may rate-limit or suspend
        abusive use.
      </p>
    </>
  )
}

function Privacy() {
  return (
    <>
      <h2>Privacy</h2>
      <p className="muted">Last updated 2026.</p>
      <p>
        Redline is designed to collect as little as possible and to never store
        sensitive material it encounters.
      </p>
      <h3>What we process</h3>
      <ul>
        <li>The domain you submit and its verification status.</li>
        <li>
          Publicly reachable signals returned by the controlled checks (headers,
          DNS records, response metadata).
        </li>
        <li>Scan timestamps and finding summaries to power your reports.</li>
      </ul>
      <h3>Secrets are redacted</h3>
      <p>
        If a check matches a known credential format, the value is redacted in
        evidence and is <strong>never</strong> stored in full and{' '}
        <strong>never</strong> sent to any third party for validation.
      </p>
      <h3>No third-party validation</h3>
      <p>
        Redline does not call provider APIs to confirm discovered secrets, and
        does not sell or share scan data.
      </p>
    </>
  )
}

function Scope() {
  return (
    <>
      <h2>Scope &amp; safe harbor</h2>
      <p>
        Redline performs controlled, non-destructive checks against verified
        domains only. The following are explicitly out of scope:
      </p>
      <ul>
        <li>Exploiting vulnerabilities or chaining findings into attacks.</li>
        <li>Bypassing authentication or authorization.</li>
        <li>Brute forcing credentials, tokens, or paths.</li>
        <li>Destructive, stateful, or load testing.</li>
        <li>Validating discovered secrets with third-party providers.</li>
      </ul>
      <p>
        Because scans require domain ownership verification and stay within safe
        request limits, Redline operates as authorized, good-faith testing of
        your own property.
      </p>
      <h3>Rate limiting</h3>
      <p>
        Redline uses strict safe request limits and records repeated-request
        handling only. It does not perform load testing and does not claim DDoS
        protection.
      </p>
    </>
  )
}

function Disclosure() {
  return (
    <>
      <h2>Responsible disclosure</h2>
      <p>
        Found a security issue in Redline itself? We appreciate good-faith
        reports and will work with you to fix it.
      </p>
      <ul>
        <li>
          Email <a href="mailto:security@redline.scan">security@redline.scan</a>{' '}
          with steps to reproduce.
        </li>
        <li>Give us reasonable time to remediate before public disclosure.</li>
        <li>
          Don&apos;t access other users&apos; data, degrade the service, or run
          destructive tests during your research.
        </li>
      </ul>
      <p>
        We will not pursue good-faith researchers who follow this policy.
      </p>
    </>
  )
}
