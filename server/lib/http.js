// Safe HTTP helper: enforces timeouts, response size caps, and a per-scan
// request budget so Redline stays within strict, non-destructive limits.

const MAX_BODY_BYTES = 1_500_000 // 1.5 MB cap per response
const DEFAULT_TIMEOUT = 8000

export function createBudget(maxRequests = 40) {
  return { used: 0, max: maxRequests }
}

export async function safeFetch(url, { budget, timeout = DEFAULT_TIMEOUT, headers = {}, method = 'GET', redirect = 'follow' } = {}) {
  if (budget) {
    if (budget.used >= budget.max) {
      return { ok: false, error: 'request-budget-exhausted', url }
    }
    budget.used++
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  const started = Date.now()

  try {
    const res = await fetch(url, {
      method,
      redirect,
      signal: controller.signal,
      headers: {
        'User-Agent': 'RedlineScanner/0.1 (+https://redline.scan; non-destructive)',
        Accept: '*/*',
        ...headers,
      },
    })

    // Read a capped amount of the body.
    let body = ''
    if (method !== 'HEAD') {
      const reader = res.body?.getReader?.()
      if (reader) {
        const decoder = new TextDecoder()
        let total = 0
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          total += value.length
          body += decoder.decode(value, { stream: true })
          if (total >= MAX_BODY_BYTES) {
            controller.abort()
            break
          }
        }
      } else {
        body = await res.text()
      }
    }

    const headerObj = {}
    res.headers.forEach((v, k) => {
      headerObj[k.toLowerCase()] = v
    })

    return {
      ok: true,
      status: res.status,
      url: res.url || url,
      finalUrl: res.url || url,
      redirected: res.redirected,
      headers: headerObj,
      body,
      elapsedMs: Date.now() - started,
    }
  } catch (err) {
    return {
      ok: false,
      error: err.name === 'AbortError' ? 'timeout' : err.message,
      url,
      elapsedMs: Date.now() - started,
    }
  } finally {
    clearTimeout(timer)
  }
}
