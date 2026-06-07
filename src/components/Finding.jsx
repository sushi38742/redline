import { useState } from 'react'

export function SeverityBadge({ severity }) {
  const label = severity === 'pass' ? 'pass' : severity
  return <span className={`badge sev-${severity}`}>{label}</span>
}

export default function Finding({ finding }) {
  const [open, setOpen] = useState(
    finding.severity === 'critical' || finding.severity === 'high',
  )

  return (
    <div className="finding">
      <div className="finding-head" onClick={() => setOpen((v) => !v)}>
        <SeverityBadge severity={finding.severity} />
        <div className="finding-title">
          {finding.title}
          <span className="finding-cat">{finding.category}</span>
        </div>
        {finding.confidence && (
          <span className="conf">{finding.confidence} confidence</span>
        )}
        <span className="faint">{open ? '▲' : '▼'}</span>
      </div>

      {open && (
        <div className="finding-body">
          <dl>
            {finding.description && (
              <>
                <dt>What we found</dt>
                <dd>{finding.description}</dd>
              </>
            )}
            {finding.evidence && (
              <>
                <dt>Evidence</dt>
                <dd>
                  <pre>{finding.evidence}</pre>
                </dd>
              </>
            )}
            {finding.fix && (
              <>
                <dt>Recommended fix</dt>
                <dd>{finding.fix}</dd>
              </>
            )}
          </dl>
        </div>
      )}
    </div>
  )
}
