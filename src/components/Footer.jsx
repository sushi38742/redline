import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div style={{ maxWidth: 300 }}>
          <div className="brand" style={{ marginBottom: 10 }}>
            <img src="/favicon.svg" alt="" />
            Redline
          </div>
          <p style={{ margin: 0 }}>
            Preflight scanning for modern websites. Controlled, non-destructive
            checks against verified domains before the internet starts
            improvising.
          </p>
        </div>

        <div>
          <strong style={{ color: 'var(--text-dim)' }}>Product</strong>
          <Link to="/">Run a scan</Link>
          <Link to="/methodology">Methodology</Link>
          <Link to="/verify">Verify domain</Link>
          <Link to="/certificate">Get the certificate</Link>
        </div>

        <div>
          <strong style={{ color: 'var(--text-dim)' }}>Legal</strong>
          <Link to="/legal/terms">Terms of use</Link>
          <Link to="/legal/privacy">Privacy</Link>
          <Link to="/legal/scope">Scope & safe harbor</Link>
          <Link to="/legal/disclosure">Responsible disclosure</Link>
        </div>
      </div>
      <div className="container" style={{ marginTop: 28 }}>
        © {new Date().getFullYear()} Redline. A passing result means the domain
        passed Redline&apos;s published baseline checks at scan time. It is not a
        complete security assessment.
      </div>
    </footer>
  )
}
