// Known provider key formats. Redline matches these in public assets, redacts
// the value, and NEVER validates it against any provider.

export const SECRET_PATTERNS = [
  { name: 'AWS Access Key ID', re: /\bAKIA[0-9A-Z]{16}\b/g, severity: 'critical' },
  { name: 'AWS Secret Access Key', re: /\baws_secret_access_key\s*[=:]\s*['"]?[A-Za-z0-9/+=]{40}['"]?/gi, severity: 'critical' },
  { name: 'Google API Key', re: /\bAIza[0-9A-Za-z\-_]{35}\b/g, severity: 'high' },
  { name: 'Google OAuth Client', re: /\b[0-9]+-[0-9A-Za-z_]{32}\.apps\.googleusercontent\.com\b/g, severity: 'low' },
  { name: 'OpenAI API Key', re: /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/g, severity: 'critical' },
  { name: 'Anthropic API Key', re: /\bsk-ant-[A-Za-z0-9_-]{20,}\b/g, severity: 'critical' },
  { name: 'Hugging Face Token', re: /\bhf_[A-Za-z0-9]{30,}\b/g, severity: 'high' },
  { name: 'Cohere API Key', re: /\bco_[A-Za-z0-9]{40,}\b/g, severity: 'high' },
  { name: 'Groq API Key', re: /\bgsk_[A-Za-z0-9]{40,}\b/g, severity: 'high' },
  { name: 'Replicate Token', re: /\br8_[A-Za-z0-9]{37,}\b/g, severity: 'high' },
  { name: 'Stripe Live Secret Key', re: /\bsk_live_[0-9a-zA-Z]{24,}\b/g, severity: 'critical' },
  { name: 'Stripe Restricted Key', re: /\brk_live_[0-9a-zA-Z]{24,}\b/g, severity: 'high' },
  { name: 'GitHub Token', re: /\bgh[pousr]_[A-Za-z0-9]{36,}\b/g, severity: 'critical' },
  { name: 'GitLab Token', re: /\bglpat-[A-Za-z0-9_-]{20,}\b/g, severity: 'critical' },
  { name: 'Slack Token', re: /\bxox[baprs]-[0-9A-Za-z-]{10,}\b/g, severity: 'high' },
  { name: 'Slack Webhook', re: /https:\/\/hooks\.slack\.com\/services\/[A-Za-z0-9/]+/g, severity: 'medium' },
  { name: 'Twilio Account SID', re: /\bAC[0-9a-fA-F]{32}\b/g, severity: 'high' },
  { name: 'SendGrid API Key', re: /\bSG\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\b/g, severity: 'critical' },
  { name: 'Mailgun Key', re: /\bkey-[0-9a-zA-Z]{32}\b/g, severity: 'high' },
  { name: 'Firebase Cloud Messaging Key', re: /\bAAAA[A-Za-z0-9_-]{7}:[A-Za-z0-9_-]{140,}\b/g, severity: 'high' },
  { name: 'Supabase Service Role JWT', re: /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, severity: 'medium', hint: 'service_role' },
  { name: 'Private Key Block', re: /-----BEGIN (?:RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----/g, severity: 'critical' },
  { name: 'Generic Bearer/Secret assignment', re: /(?:api[_-]?key|secret|token|password|passwd)\s*[=:]\s*['"][A-Za-z0-9_-]{16,}['"]/gi, severity: 'medium' },
]

// Redact a matched secret to a safe fingerprint.
export function redact(value) {
  const v = String(value)
  if (v.length <= 10) return v.slice(0, 2) + '••••'
  return v.slice(0, 4) + '…' + v.slice(-4) + ` (${v.length} chars)`
}
