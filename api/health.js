import { health } from '../server/core.js'

export default function handler(_req, res) {
  const r = health()
  res.status(r.status).json(r.body)
}
