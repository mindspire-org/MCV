import { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { env } from '../../config/env'

export function authOrAdminKey(req: Request, res: Response, next: NextFunction) {
  const keyHdr = String(req.headers['x-admin-key'] || '')
  if (keyHdr && keyHdr === env.ADMIN_KEY) {
    ;(req as any).user = (req as any).user || { role: 'admin', via: 'admin_key' }
    return next()
  }

  const hdr = req.headers.authorization || ''
  const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : ''
  if (!token) return res.status(401).json({ message: 'Unauthorized' })

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as any
    const norm: any = {
      ...payload,
      id: payload?.id || payload?.sub || payload?._id,
      _id: payload?._id || payload?.sub || payload?.id,
    }
    ;(req as any).user = norm
    return next()
  } catch {
    return res.status(401).json({ message: 'Invalid token' })
  }
}
