import { runScan } from '../server/core.js'

export const config = { maxDuration: 60 }

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const r = await runScan(req.body, {
    allowUnverified: process.env.REDLINE_ALLOW_UNVERIFIED === '1',
  })
  res.status(r.status).json(r.body)
}
