import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'

export default function Nav() {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)

  return (
    <header className="nav">
      <div className="container nav-inner">
        <Link to="/" className="brand" onClick={close}>
          <img src="/favicon.svg" alt="" />
          Redline
        </Link>

        <button
          className="nav-toggle"
          aria-label="Toggle menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          ☰
        </button>

        <nav className={`nav-links ${open ? 'open' : ''}`}>
          <NavLink to="/" end onClick={close}>
            Scan
          </NavLink>
          <NavLink to="/methodology" onClick={close}>
            Methodology
          </NavLink>
          <NavLink to="/verify" onClick={close}>
            Verify domain
          </NavLink>
          <NavLink to="/certificate" onClick={close}>
            Certificate
          </NavLink>
          <NavLink to="/legal" onClick={close}>
            Legal
          </NavLink>
        </nav>
      </div>
    </header>
  )
}
