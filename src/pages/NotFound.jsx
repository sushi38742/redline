import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <section className="section">
      <div className="container prose" style={{ textAlign: 'center' }}>
        <h1>404</h1>
        <p className="lead">That page drifted off the runway.</p>
        <Link to="/" className="btn btn-primary">
          Back to scan
        </Link>
      </div>
    </section>
  )
}
