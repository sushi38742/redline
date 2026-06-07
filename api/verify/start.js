import { verifyStart } from '../../server/core.js'

export default function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const r = verifyStart(req.body)
  res.status(r.status).json(r.body)
}
