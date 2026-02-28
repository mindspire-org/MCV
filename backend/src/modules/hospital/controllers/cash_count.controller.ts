import { Request, Response } from 'express'
import { z } from 'zod'
import { HospitalCashCount } from '../models/CashCount'

const createSchema = z.object({
  date: z.string(),
  amount: z.number(),
  note: z.string().optional(),
  receiver: z.string().optional(),
  handoverBy: z.string().optional(),
})

const listSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  from: z.string().optional(),
  to: z.string().optional(),
  search: z.string().optional(),
})

export async function createCashCount(req: Request, res: Response) {
  try {
    const data = createSchema.parse(req.body)
    const doc = await HospitalCashCount.create(data)
    res.status(201).json(doc)
  } catch (error) {
    res.status(400).json({ error: 'Failed to create cash count' })
  }
}

export async function listCashCounts(req: Request, res: Response) {
  try {
    const { page, limit, from, to, search } = listSchema.parse(req.query)
    
    const filter: any = {}
    if (from && to) {
      filter.date = { $gte: from, $lte: to }
    }
    if (search) {
      filter.$or = [
        { note: { $regex: search, $options: 'i' } },
        { receiver: { $regex: search, $options: 'i' } },
        { handoverBy: { $regex: search, $options: 'i' } },
      ]
    }
    
    const total = await HospitalCashCount.countDocuments(filter)
    const items = await HospitalCashCount
      .find(filter)
      .sort({ date: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean()
    
    const totalPages = Math.ceil(total / limit)
    
    res.json({
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    })
  } catch (error) {
    res.status(400).json({ error: 'Failed to list cash counts' })
  }
}

export async function cashCountSummary(req: Request, res: Response) {
  try {
    const { from, to, search } = listSchema.parse(req.query)
    
    const filter: any = {}
    if (from && to) {
      filter.date = { $gte: from, $lte: to }
    }
    if (search) {
      filter.$or = [
        { note: { $regex: search, $options: 'i' } },
        { receiver: { $regex: search, $options: 'i' } },
        { handoverBy: { $regex: search, $options: 'i' } },
      ]
    }
    
    const summary = await HospitalCashCount.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          amount: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ])
    
    const result = summary[0] || { amount: 0, count: 0 }
    
    res.json(result)
  } catch (error) {
    res.status(400).json({ error: 'Failed to get cash count summary' })
  }
}
