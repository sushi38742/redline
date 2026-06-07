import { Link } from 'react-router-dom'

export default function Verify() {
  return (
    <section className="section">
      <div className="container prose">
        <span className="kicker">Domain verification</span>
        <h1>Verify your domain</h1>
        <p className="lead">
          Redline only scans domains whose ownership has been proven. Pick any
          one of the three methods below — Redline re-checks it immediately
          before every scan.
        </p>

        <h2>Method 1 — Meta tag</h2>
        <p>Add the token meta tag to the homepage&apos;s head:</p>
        <pre className="codeblock">
          {`<meta name="redline-site-verification"
      content="YOUR-TOKEN" />`}
        </pre>

        <h2>Method 2 — Well-known file</h2>
        <p>
          Serve the raw token at this path over HTTPS with a{' '}
          <code>200</code> response:
        </p>
        <pre className="codeblock">
          {`https://yourdomain.com/.well-known/redline-verification.txt`}
        </pre>

        <h2>Method 3 — DNS TXT record</h2>
        <p>Create a TXT record:</p>
        <pre className="codeblock">
          {`Host:  _redline.yourdomain.com
Type:  TXT
Value: redline-verification=YOUR-TOKEN`}
        </pre>

        <div className="notice">
          Tokens are generated per domain when you start verification on the{' '}
          <Link to="/">scan page</Link>. DNS changes can take time to propagate;
          meta tag and well-known file are usually instant.
        </div>

        <h2>Why verification matters</h2>
        <p>
          Verification keeps Redline ethical and lawful: it ensures only people
          who control a domain can run checks against it. Combined with strict
          safe request limits and non-destructive checks, it keeps every scan
          controlled and authorized.
        </p>

        <div style={{ marginTop: 32 }}>
          <Link to="/" className="btn btn-primary">
            Start verification
          </Link>
        </div>
      </div>
    </section>
  )
}
