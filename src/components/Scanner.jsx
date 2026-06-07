import { useState, useRef, useEffect } from 'react'
import {
  startVerification,
  checkVerification,
  runScan,
  normalizeDomain,
  isValidDomain,
  isExemptDomain,
  EngineUnavailableError,
} from '../lib/api.js'
import { clientScan } from '../lib/clientScan.js'
import Finding from './Finding.jsx'
import {
  SEVERITY_ORDER,
  RUNNABLE_CHECKS,
  INTENSIVE_CHECKS,
  LIVE_COPY,
} from '../lib/catalog.js'

const VERIFY_METHODS = [
  { id: 'meta', label: 'Meta tag' },
  { id: 'wellknown', label: 'Well-known file' },
  { id: 'dns', label: 'DNS TXT' },
]

const ALL_IDS = RUNNABLE_CHECKS.map((c) => c.id)

export default function Scanner() {
  const [domain, setDomain] = useState('')
  const [stage, setStage] = useState('idle') // idle | verifying | choosing | scanning | done
  const [method, setMethod] = useState('meta')
  const [token, setToken] = useState(null)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)
  const [result, setResult] = useState(null)
  const [selected, setSelected] = useState(() => new Set(ALL_IDS))
  const [progress, setProgress] = useState(0)
  const progressTimer = useRef(null)

  const clean = normalizeDomain(domain)
  const valid = isValidDomain(clean)
  const exempt = isExemptDomain(clean)
  const selectedList = RUNNABLE_CHECKS.filter((c) => selected.has(c.id))

  useEffect(() => () => clearInterval(progressTimer.current), [])

  function toggle(id) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function onSubmit(e) {
    e.preventDefault()
    setError(null)
    setNotice(null)
    setResult(null)
    if (!valid) {
      setError('Enter a valid domain, e.g. yourdomain.com')
      return
    }
    if (exempt) {
      setStage('choosing')
      return
    }
    setStage('verifying')
    try {
      const data = await startVerification(clean)
      setToken(data.token)
    } catch (err) {
      if (err instanceof EngineUnavailableError) return runClientPreview()
      setError(err.message)
      setStage('idle')
    }
  }

  async function onCheckVerify() {
    setError(null)
    try {
      const data = await checkVerification(clean, method)
      if (data.verified) {
        setStage('choosing')
        setNotice('Ownership verified. Choose your tests below.')
      } else {
        setError(
          data.detail ||
            'Verification token not found yet. Publish it and try again.',
        )
      }
    } catch (err) {
      if (err instanceof EngineUnavailableError) return runClientPreview()
      setError(err.message)
    }
  }

  async function onScan() {
    if (!selected.size) {
      setError('Pick at least one test to run.')
      return
    }
    setError(null)
    setNotice(null)
    setProgress(0)
    setStage('scanning')

    // Narrate through the selected tests while the real scan runs.
    clearInterval(progressTimer.current)
    progressTimer.current = setInterval(() => {
      setProgress((p) => Math.min(p + 1, selectedList.length - 1))
    }, 950)

    try {
      const data = await runScan(clean, [...selected])
      finishScan(data)
    } catch (err) {
      clearInterval(progressTimer.current)
      if (err instanceof EngineUnavailableError) return runClientPreview()
      setError(err.message)
      setStage('choosing')
    }
  }

  function finishScan(data) {
    clearInterval(progressTimer.current)
    setProgress(selectedList.length)
    setResult(data)
    setStage('done')
  }

  async function runClientPreview() {
    setProgress(0)
    setStage('scanning')
    try {
      const data = await clientScan(clean)
      finishScan(data)
      setNotice(
        'Showing a quick DNS-only preview while the full scan engine spins up. Refresh in a moment for the complete non-destructive baseline.',
      )
    } catch (err) {
      clearInterval(progressTimer.current)
      setError('Preview scan failed: ' + err.message)
      setStage('idle')
    }
  }

  function reset() {
    setStage('idle')
    setResult(null)
    setError(null)
    setNotice(null)
    setToken(null)
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
      <div className="panel-head">
        <span className="panel-icon">▶</span>
        <div>
          <h3 style={{ margin: 0 }}>Website Testing</h3>
          <span className="faint" style={{ fontSize: '0.85rem' }}>
            Enter a domain to run controlled, non-destructive checks
          </span>
        </div>
      </div>

      <form className="scan-form" onSubmit={onSubmit}>
        <input
          className="scan-input"
          placeholder="yourdomain.com"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          disabled={stage === 'scanning'}
          spellCheck={false}
          autoCapitalize="none"
        />
        {(stage === 'idle' || stage === 'verifying') && (
          <button
            type="submit"
            className="btn btn-primary"
            disabled={stage === 'verifying'}
          >
            {stage === 'verifying'
              ? 'Generating…'
              : exempt
                ? 'Choose tests'
                : 'Verify & continue'}
          </button>
        )}
      </form>

      {stage === 'idle' && (
        <p className="scan-hint">
          {exempt ? (
            <>✓ {clean} is pre-cleared — no verification needed.</>
          ) : (
            <>🔒 Redline only scans domains you own — you&apos;ll prove ownership first.</>
          )}
        </p>
      )}

      {error && <div className="notice error">{error}</div>}
      {notice && <div className="notice ok">{notice}</div>}

      {/* Verification */}
      {stage === 'verifying' && token && (
        <div className="subpanel">
          <div className="subpanel-head">🛡 Domain Verification</div>
          <p className="muted" style={{ fontSize: '0.92rem' }}>
            To prevent abuse, prove you own this domain. Pick a method:
          </p>
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
          <pre className="codeblock">{instructions[method].code}</pre>
          <button className="btn btn-ghost" style={{ marginTop: 12 }} onClick={onCheckVerify}>
            I&apos;ve published it — verify now
          </button>
        </div>
      )}

      {/* Test picker */}
      {stage === 'choosing' && (
        <TestPicker
          selected={selected}
          toggle={toggle}
          setSelected={setSelected}
          onScan={onScan}
        />
      )}

      {/* Live narrated scan */}
      {stage === 'scanning' && (
        <ScanProgress steps={selectedList} progress={progress} domain={clean} />
      )}

      {/* Results */}
      {stage === 'done' && result && <Results result={result} onReset={reset} />}

      <p className="faint" style={{ fontSize: '0.8rem', marginTop: 18 }}>
        Redline performs controlled, non-destructive checks against verified
        domains only. It never exploits vulnerabilities, bypasses
        authentication, brute forces credentials, or validates discovered
        secrets.
      </p>
    </div>
  )
}

function TestPicker({ selected, toggle, setSelected, onScan }) {
  const allOn = selected.size === RUNNABLE_CHECKS.length
  return (
    <div className="subpanel">
      <div className="subpanel-head">
        ☷ Select tests to run
        <button
          className="link-btn"
          onClick={() =>
            setSelected(allOn ? new Set() : new Set(RUNNABLE_CHECKS.map((c) => c.id)))
          }
        >
          {allOn ? 'Clear all' : 'Select all'}
        </button>
      </div>

      <div className="tip">
        <strong>ℹ Tip:</strong> Every test here is non-destructive. Select all
        for a full baseline (required to earn the partner badge), or pick a few
        to focus on what matters right now.
      </div>

      <div className="test-grid">
        {RUNNABLE_CHECKS.map((c) => {
          const on = selected.has(c.id)
          return (
            <label key={c.id} className={`test-row ${on ? 'on' : ''}`}>
              <input type="checkbox" checked={on} onChange={() => toggle(c.id)} />
              <span className="test-check" style={{ '--accent': c.accent }} />
              <span className="test-body">
                <span className="test-title">
                  <span className="test-emoji">{c.icon}</span>
                  {c.title}
                </span>
                <span className="test-desc">{c.summary}</span>
                {INTENSIVE_CHECKS.has(c.id) && (
                  <span className="test-warn">⚠ Intensive — reads several pages/paths</span>
                )}
              </span>
            </label>
          )
        })}
      </div>

      <button
        className="btn btn-primary"
        style={{ marginTop: 18, width: '100%', justifyContent: 'center' }}
        onClick={onScan}
      >
        Run {selected.size} {selected.size === 1 ? 'test' : 'tests'}
      </button>
    </div>
  )
}

function ScanProgress({ steps, progress, domain }) {
  const current = steps[Math.min(progress, steps.length - 1)]
  const pct = Math.round((Math.min(progress, steps.length) / steps.length) * 100)
  return (
    <div className="subpanel">
      <div className="subpanel-head">
        <span className="spinner" /> Scanning {domain}…
      </div>

      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${pct}%` }} />
      </div>

      <div className="live-now">
        <strong>{current?.icon} {current?.title}</strong>
        <p>{LIVE_COPY[current?.id]}</p>
      </div>

      <div className="scan-log">
        {steps.map((s, i) => {
          const state = i < progress ? 'done' : i === progress ? 'run' : 'wait'
          return (
            <div key={s.id} className={state}>
              {s.title}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function BadgeReward({ domain }) {
  const [copied, setCopied] = useState(false)
  const snippet = `<a href="https://redline.scan/r/${domain}" rel="noopener" target="_blank">
  <img src="https://redline.scan/badge/${domain}.svg"
       alt="Redline Verified Partner" width="170" height="40" />
</a>`
  return (
    <div className="badge-reward">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: '1.4rem' }}>🎖️</span>
        <strong>
          Badge unlocked — {domain} passed the full baseline. Welcome to the
          Redline Partner Program.
        </strong>
      </div>
      <p className="muted" style={{ margin: '8px 0 0', fontSize: '0.9rem' }}>
        Your embed code is ready — drop it on your site:
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

function Results({ result, onReset }) {
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
      <div className="results-head">
        <h3 style={{ margin: 0 }}>
          Report for <span style={{ color: 'var(--red-soft)' }}>{result.domain}</span>
        </h3>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span className="faint" style={{ fontSize: '0.82rem' }}>
            {new Date(result.scannedAt).toLocaleString()} · {result.durationMs}ms ·{' '}
            {result.checksRun} tests
          </span>
          <button className="link-btn" onClick={onReset}>
            New scan
          </button>
        </div>
      </div>

      <div className="summary-bar">
        {['critical', 'high', 'medium', 'low', 'pass'].map((s) => (
          <div className="stat" key={s}>
            <span
              className={`n sev-${s}`}
              style={{ background: 'none', border: 'none', padding: 0 }}
            >
              {counts[s]}
            </span>
            <span className="l">{s}</span>
          </div>
        ))}
      </div>

      {result.aiSummary && (
        <div className="notice ok">
          <strong>✨ AI remediation summary</strong>
          <div style={{ marginTop: 6, whiteSpace: 'pre-wrap' }}>{result.aiSummary}</div>
        </div>
      )}

      {result.partial ? (
        <div className="notice">
          Partial scan — you ran {result.checksRun} of the full baseline. Run all
          tests to qualify for the Redline Partner badge.
        </div>
      ) : result.badgeEligible ? (
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
