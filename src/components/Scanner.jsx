import { useState } from 'react'
import {
  startVerification,
  checkVerification,
  runScan,
  normalizeDomain,
  isValidDomain,
  EngineUnavailableError,
} from '../lib/api.js'
import { clientScan } from '../lib/clientScan.js'
import Finding from './Finding.jsx'
import { SEVERITY_ORDER } from '../lib/catalog.js'

const VERIFY_METHODS = [
  { id: 'meta', label: 'Meta tag' },
  { id: 'wellknown', label: 'Well-known file' },
  { id: 'dns', label: 'DNS TXT' },
]

export default function Scanner() {
  const [domain, setDomain] = useState('')
  const [stage, setStage] = useState('idle') // idle | verifying | verified | scanning | done
  const [method, setMethod] = useState('meta')
  const [token, setToken] = useState(null)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)
  const [result, setResult] = useState(null)

  const clean = normalizeDomain(domain)
  const valid = isValidDomain(clean)

  async function onStartVerify(e) {
    e.preventDefault()
    setError(null)
    setNotice(null)
    setResult(null)
    if (!valid) {
      setError('Enter a valid domain, e.g. example.com')
      return
    }
    setStage('verifying')
    try {
      const data = await startVerification(clean)
      setToken(data.token)
    } catch (err) {
      if (err instanceof EngineUnavailableError) {
        // No backend: run the DNS-only browser preview instead.
        await runClientPreview()
        return
      }
      setError(err.message)
      setStage('idle')
    }
  }

  async function runClientPreview() {
    setStage('scanning')
    try {
      const data = await clientScan(clean)
      setResult(data)
      setStage('done')
      setNotice(
        'Scan engine offline — ran a DNS-only preview in your browser. Start the Redline engine for the full non-destructive baseline.',
      )
    } catch (err) {
      setError('Preview scan failed: ' + err.message)
      setStage('idle')
    }
  }

  async function onCheckVerify() {
    setError(null)
    setNotice(null)
    try {
      const data = await checkVerification(clean, method)
      if (data.verified) {
        setStage('verified')
        setNotice('Ownership verified. You can run a controlled scan now.')
      } else {
        setError(
          data.detail ||
            'Verification token not found yet. Publish it and try again.',
        )
      }
    } catch (err) {
      setError(err.message)
    }
  }

  async function onScan() {
    setError(null)
    setNotice(null)
    setStage('scanning')
    try {
      const data = await runScan(clean)
      setResult(data)
      setStage('done')
    } catch (err) {
      if (err instanceof EngineUnavailableError) {
        await runClientPreview()
        return
      }
      setError(err.message)
      setStage('verified')
    }
  }

  const instructions = token && {
    meta: {
      label: 'Add this meta tag to the <head> of your homepage:',
      code: `<meta name="redline-site-verification" content="${token}" />`,
    },
    wellknown: {
      label: 'Publish this file at /.well-known/redline-verification.txt:',
      code: token,
    },
    dns: {
      label: `Add a TXT record at _redline.${clean}:`,
      code: `redline-verification=${token}`,
    },
  }

  return (
    <div className="scanner" id="scan">
      <form className="scan-form" onSubmit={onStartVerify}>
        <input
          className="scan-input"
          placeholder="yourdomain.com"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          spellCheck={false}
          autoCapitalize="none"
        />
        {stage === 'idle' || stage === 'verifying' ? (
          <button
            type="submit"
            className="btn btn-primary"
            disabled={stage === 'verifying'}
          >
            {stage === 'verifying' ? 'Generating…' : 'Verify ownership'}
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-primary"
            disabled={stage === 'scanning'}
            onClick={onScan}
          >
            {stage === 'scanning' ? (
              <>
                <span className="spinner" /> Scanning…
              </>
            ) : (
              'Run controlled scan'
            )}
          </button>
        )}
      </form>

      {error && <div className="notice error">{error}</div>}
      {notice && <div className="notice ok">{notice}</div>}

      {/* Verification panel */}
      {stage === 'verifying' && token && (
        <div style={{ marginTop: 18 }}>
          <div className="tabs">
            {VERIFY_METHODS.map((m) => (
              <button
                key={m.id}
                className={`tab ${method === m.id ? 'active' : ''}`}
                onClick={() => setMethod(m.id)}
              >
                {m.label}
              </button>
            ))}
          </div>
          <p className="muted" style={{ fontSize: '0.92rem' }}>
            {instructions[method].label}
          </p>
          <pre
            style={{
              background: 'var(--bg)',
              border: '1px solid var(--border-soft)',
              borderRadius: 8,
              padding: '10px 12px',
              overflowX: 'auto',
              fontFamily: 'var(--mono)',
              fontSize: '0.82rem',
            }}
          >
            {instructions[method].code}
          </pre>
          <button
            className="btn btn-ghost"
            style={{ marginTop: 12 }}
            onClick={onCheckVerify}
          >
            I&apos;ve published it — check now
          </button>
        </div>
      )}

      {/* Results */}
      {stage === 'done' && result && <Results result={result} />}

      <p className="faint" style={{ fontSize: '0.8rem', marginTop: 18 }}>
        Redline performs controlled, non-destructive checks against verified
        domains only. It does not exploit vulnerabilities, bypass
        authentication, brute force credentials, or validate discovered secrets.
      </p>
    </div>
  )
}

function BadgeReward({ domain }) {
  const [copied, setCopied] = useState(false)
  const snippet = `<a href="https://redline.scan/r/${domain}" rel="noopener" target="_blank">
  <img src="https://redline.scan/badge/${domain}.svg"
       alt="Redline Verified" width="160" height="40" />
</a>`
  return (
    <div className="badge-reward">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: '1.4rem' }}>🎖️</span>
        <strong>
          Badge unlocked — {domain} passed the baseline with no critical or high
          findings.
        </strong>
      </div>
      <p className="muted" style={{ margin: '8px 0 0', fontSize: '0.9rem' }}>
        Your embed code is now yours. Drop it on your site:
      </p>
      <pre>{snippet}</pre>
      <button
        className="copy-btn"
        onClick={() => {
          navigator.clipboard?.writeText(snippet)
          setCopied(true)
          setTimeout(() => setCopied(false), 1800)
        }}
      >
        {copied ? '✓ Copied' : 'Copy embed code'}
      </button>
    </div>
  )
}

function Results({ result }) {
  const counts = SEVERITY_ORDER.reduce((acc, s) => {
    acc[s] = result.findings.filter((f) => f.severity === s).length
    return acc
  }, {})

  const sorted = [...result.findings].sort(
    (a, b) =>
      SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity),
  )

  const actionable = result.findings.filter((f) => f.severity !== 'pass')

  return (
    <div style={{ marginTop: 22 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 10,
        }}
      >
        <h3 style={{ margin: 0 }}>
          Report for <span style={{ color: 'var(--red-soft)' }}>{result.domain}</span>
        </h3>
        <span className="faint" style={{ fontSize: '0.82rem' }}>
          {new Date(result.scannedAt).toLocaleString()} ·{' '}
          {result.durationMs}ms · {result.checksRun} checks
        </span>
      </div>

      <div className="summary-bar">
        {['critical', 'high', 'medium', 'low', 'pass'].map((s) => (
          <div className="stat" key={s}>
            <span className={`n sev-${s}`} style={{ background: 'none', border: 'none', padding: 0 }}>
              {counts[s]}
            </span>
            <span className="l">{s}</span>
          </div>
        ))}
      </div>

      {result.aiSummary && (
        <div className="notice ok">
          <strong>✨ AI remediation summary</strong>
          <div style={{ marginTop: 6, whiteSpace: 'pre-wrap' }}>
            {result.aiSummary}
          </div>
        </div>
      )}

      {result.badgeEligible ? (
        <BadgeReward domain={result.domain} />
      ) : (
        <div className="notice">
          Not badge eligible yet — resolve the {actionable.length} open finding
          {actionable.length === 1 ? '' : 's'} below and re-scan.
        </div>
      )}

      <div style={{ marginTop: 8 }}>
        {sorted.map((f) => (
          <Finding key={f.id} finding={f} />
        ))}
      </div>
    </div>
  )
}
