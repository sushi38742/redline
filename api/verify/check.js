import { verifyCheck } from '../../server/core.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const r = await verifyCheck(req.body)
  res.status(r.status).json(r.body)
}
