// Optional AI remediation summary, powered by Groq's OpenAI-compatible API.
// Enabled only when GROQ_API_KEY is set in the environment — the key is never
// committed to the repo. If the key is missing or the call fails, scans still
// work and simply omit the summary.

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'

export function aiEnabled() {
  return Boolean(process.env.GROQ_API_KEY)
}

export async function summarizeFindings(domain, findings) {
  if (!aiEnabled()) return null

  const actionable = findings
    .filter((f) => ['critical', 'high', 'medium'].includes(f.severity))
    .slice(0, 12)
    .map((f) => `- [${f.severity}] ${f.category}: ${f.title}`)
    .join('\n')

  if (!actionable) {
    return null
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 12000)
  try {
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.3,
        max_tokens: 320,
        messages: [
          {
            role: 'system',
            content:
              'You are a concise web security advisor. Given a list of non-destructive scan findings, write a short, prioritized remediation summary (max 5 sentences). Be practical and specific. Do not invent findings not in the list. No markdown headings.',
          },
          {
            role: 'user',
            content: `Domain: ${domain}\nFindings:\n${actionable}`,
          },
        ],
      }),
    })
    if (!res.ok) return null
    const data = await res.json()
    return data?.choices?.[0]?.message?.content?.trim() || null
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}
