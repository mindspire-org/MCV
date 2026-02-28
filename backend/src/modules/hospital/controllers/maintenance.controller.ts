import { Request, Response } from 'express'
import { HospitalMaintenanceCategory } from '../models/MaintenanceCategory'
import { HospitalAsset } from '../models/Asset'
import { HospitalMaintenancePlan } from '../models/MaintenancePlan'
import { HospitalMaintenanceTask } from '../models/MaintenanceTask'
import { HospitalStaff } from '../models/Staff'
import { HospitalAttendance } from '../models/Attendance'
import { HospitalAssetServiceLog } from '../models/AssetServiceLog'
import { HospitalExpense } from '../models/Expense'
import { FinanceJournal } from '../models/FinanceJournal'
import { HospitalCashSession } from '../models/CashSession'
import {
  createServiceLogSchema,
  generateTasksSchema,
  listAssetsSchema,
  listCategoriesSchema,
  listPlansSchema,
  listServiceLogsSchema,
  listTasksSchema,
  reassignSchema,
  updateTaskSchema,
  upsertAssetSchema,
  upsertCategorySchema,
  upsertPlanSchema,
} from '../validators/maintenance'

function todayIso(){
  return new Date().toISOString().slice(0,10)
}

function escapeRegex(s: string){
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function dayOfWeek(iso: string){
  const d = new Date(iso)
  const n = d.getDay() // 0-6
  return n
}

function dayOfMonth(iso: string){
  const d = new Date(iso)
  return d.getDate()
}

function addDays(iso: string, days: number){
  try {
    const d = new Date(iso)
    d.setDate(d.getDate() + days)
    return d.toISOString().slice(0,10)
  } catch { return iso }
}

async function getAbsentStaffIds(dateIso: string): Promise<Set<string>>{
  const rows: any[] = await HospitalAttendance.find({ date: dateIso, status: { $in: ['absent','leave'] } }).lean()
  return new Set(rows.map(r => String(r.staffId || '')).filter(Boolean))
}

async function pickAssignee(opts: { role: string; strategy: string; fixedStaffIds?: string[]; dateIso: string; planId: string }): Promise<string | undefined> {
  const { role, strategy, fixedStaffIds, dateIso, planId } = opts
  const absent = await getAbsentStaffIds(dateIso)

  if (strategy === 'fixed') {
    const fixed = (fixedStaffIds || []).map(String).map(s => s.trim()).filter(Boolean)
    if (fixed.length) {
      const fixedDocs: any[] = await HospitalStaff.find({ _id: { $in: fixed }, active: true }).lean()
      const fixedActive = new Set(fixedDocs.map(s => String(s?._id || '')).filter(Boolean))
      const fixedEligible = fixed.filter(id => fixedActive.has(id) && !absent.has(id))
      if (fixedEligible.length) {
        const last: any = await HospitalMaintenanceTask.findOne({ planId, assignedToStaffId: { $in: fixedEligible } })
          .sort({ createdAtMs: -1, createdAt: -1 })
          .lean()
        const lastId = String(last?.assignedToStaffId || '')
        const idx = fixedEligible.findIndex(x => x === lastId)
        const next = fixedEligible[(idx + 1) % fixedEligible.length]
        return next || fixedEligible[0]
      }
    }
    // If fixed list is empty/invalid/unavailable, fall back to role-based matching
  }

  const eligibleAll: any[] = await HospitalStaff.find({ active: true, role }).sort({ createdAt: 1 }).lean()
  const eligible = eligibleAll.filter(s => !absent.has(String(s._id || '')))

  if (strategy === 'least_loaded') {
    if (!eligible.length) return undefined
    const ids = eligible.map(s => String(s._id))
    const counts = await HospitalMaintenanceTask.aggregate([
      { $match: { dueDate: dateIso, status: { $ne: 'done' }, assignedToStaffId: { $in: ids } } },
      { $group: { _id: '$assignedToStaffId', c: { $sum: 1 } } },
    ]) as any[]
    const byId = new Map(counts.map(x => [String(x._id || ''), Number(x.c || 0)]))
    ids.sort((a, b) => (byId.get(a) || 0) - (byId.get(b) || 0))
    return ids[0]
  }

  // round_robin (default): rotate based on tasks created for this plan
  if (!eligible.length) return undefined
  const ids = eligible.map(s => String(s._id))
  const last: any = await HospitalMaintenanceTask.findOne({ planId }).sort({ createdAtMs: -1, createdAt: -1 }).lean()
  const lastId = String(last?.assignedToStaffId || '')
  const idx = Math.max(0, ids.findIndex(x => x === lastId))
  const next = ids[(idx + 1) % ids.length]
  return next || ids[0]
}

function shouldGenerateForDate(plan: any, dateIso: string): boolean {
  const rec = String(plan?.recurrence || 'none')
  if (!plan?.enabled) return false
  if (rec === 'none') return false
  if (rec === 'daily') return true
  if (rec === 'weekly') return dayOfWeek(String(plan.createdAt ? new Date(plan.createdAt).toISOString().slice(0,10) : dateIso)) === dayOfWeek(dateIso)
  if (rec === 'monthly') return dayOfMonth(String(plan.createdAt ? new Date(plan.createdAt).toISOString().slice(0,10) : dateIso)) === dayOfMonth(dateIso)
  if (rec === 'every_n_days') {
    const n = Number(plan.intervalDays || 0)
    if (!n || n <= 0) return false
    const baseIso = String(plan.lastGeneratedOn || '')
    if (!baseIso) return true
    const next = addDays(baseIso, n)
    return next <= dateIso
  }
  return false
}

// Categories
export async function listCategories(req: Request, res: Response){
  const q = listCategoriesSchema.safeParse(req.query)
  const active = q.success ? q.data.active : undefined
  const filter: any = {}
  if (typeof active === 'boolean') filter.active = active
  const items = await HospitalMaintenanceCategory.find(filter).sort({ name: 1 }).lean()
  res.json({ items })
}

export async function createCategory(req: Request, res: Response){
  const data = upsertCategorySchema.parse(req.body)
  const row = await HospitalMaintenanceCategory.create(data)
  res.status(201).json({ category: row })
}

export async function updateCategory(req: Request, res: Response){
  const patch = upsertCategorySchema.partial().parse(req.body)
  const row = await HospitalMaintenanceCategory.findByIdAndUpdate(req.params.id, patch, { new: true })
  if (!row) return res.status(404).json({ error: 'Category not found' })
  res.json({ category: row })
}

export async function removeCategory(req: Request, res: Response){
  const row = await HospitalMaintenanceCategory.findByIdAndDelete(req.params.id)
  if (!row) return res.status(404).json({ error: 'Category not found' })
  res.json({ ok: true })
}

// Assets
export async function listAssets(req: Request, res: Response){
  const parsed = listAssetsSchema.safeParse(req.query)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid query' })
  const { q, categoryId, condition, active, page = 1, limit = 200 } = parsed.data
  const filter: any = {}
  if (categoryId) filter.categoryId = categoryId
  if (condition) filter.condition = condition
  if (typeof active === 'boolean') filter.active = active
  if (q) {
    const rx = new RegExp(escapeRegex(String(q)), 'i')
    filter.$or = [{ name: rx }, { location: rx }, { notes: rx }]
  }
  const items = await HospitalAsset.find(filter).sort({ createdAt: -1 }).skip((page-1)*limit).limit(limit).lean()
  const total = await HospitalAsset.countDocuments(filter)
  res.json({ items, total, page, limit })
}

export async function createAsset(req: Request, res: Response){
  const data = upsertAssetSchema.parse(req.body)
  const row = await HospitalAsset.create(data)
  res.status(201).json({ asset: row })
}

export async function updateAsset(req: Request, res: Response){
  const patch = upsertAssetSchema.partial().parse(req.body)
  const row = await HospitalAsset.findByIdAndUpdate(req.params.id, patch, { new: true })
  if (!row) return res.status(404).json({ error: 'Asset not found' })
  res.json({ asset: row })
}

export async function removeAsset(req: Request, res: Response){
  const row = await HospitalAsset.findByIdAndDelete(req.params.id)
  if (!row) return res.status(404).json({ error: 'Asset not found' })
  await HospitalMaintenancePlan.deleteMany({ assetId: req.params.id })
  await HospitalMaintenanceTask.deleteMany({ assetId: req.params.id })
  res.json({ ok: true })
}

// Plans
export async function listPlans(req: Request, res: Response){
  const parsed = listPlansSchema.safeParse(req.query)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid query' })
  const { assetId, role, enabled, page = 1, limit = 200 } = parsed.data
  const filter: any = {}
  if (assetId) filter.assetId = assetId
  if (role) filter.role = role
  if (typeof enabled === 'boolean') filter.enabled = enabled
  const items = await HospitalMaintenancePlan.find(filter).sort({ createdAt: -1 }).skip((page-1)*limit).limit(limit).lean()
  const total = await HospitalMaintenancePlan.countDocuments(filter)
  res.json({ items, total, page, limit })
}

export async function createPlan(req: Request, res: Response){
  const data = upsertPlanSchema.parse(req.body)
  const row = await HospitalMaintenancePlan.create(data)
  res.status(201).json({ plan: row })
}

export async function updatePlan(req: Request, res: Response){
  const patch = upsertPlanSchema.partial().parse(req.body)
  const row = await HospitalMaintenancePlan.findByIdAndUpdate(req.params.id, patch, { new: true })
  if (!row) return res.status(404).json({ error: 'Plan not found' })
  res.json({ plan: row })
}

export async function removePlan(req: Request, res: Response){
  const row = await HospitalMaintenancePlan.findByIdAndDelete(req.params.id)
  if (!row) return res.status(404).json({ error: 'Plan not found' })
  await HospitalMaintenanceTask.deleteMany({ planId: req.params.id })
  res.json({ ok: true })
}

// Tasks
export async function listTasks(req: Request, res: Response){
  const parsed = listTasksSchema.safeParse(req.query)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid query' })
  const { from, to, date, status, assetId, planId, assignedToStaffId, page = 1, limit = 200 } = parsed.data
  const filter: any = {}
  if (date) filter.dueDate = date
  if (from || to) filter.dueDate = { ...(from?{ $gte: from }:{}), ...(to?{ $lte: to }:{}) }
  if (status) filter.status = status
  if (assetId) filter.assetId = assetId
  if (planId) filter.planId = planId
  if (assignedToStaffId) filter.assignedToStaffId = assignedToStaffId
  const items = await HospitalMaintenanceTask.find(filter).sort({ dueDate: -1, createdAtMs: -1 }).skip((page-1)*limit).limit(limit).lean()
  const total = await HospitalMaintenanceTask.countDocuments(filter)
  res.json({ items, total, page, limit })
}

export async function updateTask(req: Request, res: Response){
  const patch = updateTaskSchema.parse(req.body)
  const row: any = await HospitalMaintenanceTask.findById(req.params.id)
  if (!row) return res.status(404).json({ error: 'Task not found' })

  if (patch.assignedToStaffId != null) row.assignedToStaffId = patch.assignedToStaffId
  if (patch.status) {
    const next = patch.status
    const prev = String(row.status || 'todo')
    row.status = next
    if (next === 'done') row.completedAtMs = Date.now()
    if (prev === 'done' && next !== 'done') {
      row.completedAtMs = undefined
      row.reopenedCount = Number(row.reopenedCount || 0) + 1
    }
  }

  await row.save()
  res.json({ task: row })
}

export async function generateTasks(req: Request, res: Response){
  const parsed = generateTasksSchema.parse(req.body || {})
  const dateIso = String(parsed.dateIso || todayIso())
  const dryRun = !!parsed.dryRun

  const planFilter: any = { enabled: true }
  if (parsed.planId) planFilter._id = parsed.planId

  const plans: any[] = await HospitalMaintenancePlan.find(planFilter).sort({ createdAt: 1 }).lean()
  const created: any[] = []
  const skipped: any[] = []

  for (const plan of plans) {
    if (!shouldGenerateForDate(plan, dateIso)) {
      skipped.push({ planId: String(plan._id), reason: 'not_due' })
      continue
    }

    const exists = await HospitalMaintenanceTask.findOne({ planId: String(plan._id), dueDate: dateIso }).lean()
    if (exists) {
      skipped.push({ planId: String(plan._id), reason: 'already_generated' })
      continue
    }

    const assignedToStaffId = await pickAssignee({
      role: String(plan.role || ''),
      strategy: String(plan.assignmentStrategy || 'round_robin'),
      fixedStaffIds: Array.isArray(plan.fixedStaffIds) ? plan.fixedStaffIds : [],
      dateIso,
      planId: String(plan._id),
    })

    const taskDoc: any = {
      planId: plan._id,
      assetId: plan.assetId,
      title: String(plan.title || 'Maintenance Task'),
      description: String(plan.instructions || ''),
      status: 'todo',
      dueDate: dateIso,
      assignedToStaffId,
      assignedByUserId: String((req as any).user?._id || (req as any).user?.id || ''),
      createdAtMs: Date.now(),
    }

    if (dryRun) {
      created.push({ ...taskDoc, _dry: true })
    } else {
      const row = await HospitalMaintenanceTask.create(taskDoc)
      created.push(row)
      try {
        await HospitalMaintenancePlan.findByIdAndUpdate(String(plan._id), { $set: { lastGeneratedOn: dateIso } })
      } catch {}
    }
  }

  res.json({ ok: true, dateIso, createdCount: created.length, skippedCount: skipped.length, created, skipped })
}

export async function reassign(req: Request, res: Response){
  const data = reassignSchema.parse(req.body)
  const dateIso = String(data.dateIso || todayIso())
  const includeDone = !!data.includeDone

  const filter: any = {
    dueDate: dateIso,
    assignedToStaffId: String(data.fromStaffId),
    ...(includeDone ? {} : { status: { $ne: 'done' } }),
  }

  const r = await HospitalMaintenanceTask.updateMany(filter, { $set: { assignedToStaffId: String(data.toStaffId) } })
  res.json({ ok: true, matched: (r as any).matchedCount ?? (r as any).n ?? 0, modified: (r as any).modifiedCount ?? (r as any).nModified ?? 0 })
}

// Service Logs + Costs (optional expense)
export async function listServiceLogs(req: Request, res: Response){
  const parsed = listServiceLogsSchema.safeParse(req.query)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid query' })
  const { assetId, from, to, page = 1, limit = 200 } = parsed.data
  const filter: any = {}
  if (assetId) filter.assetId = assetId
  if (from || to) filter.dateIso = { ...(from?{ $gte: from }:{}), ...(to?{ $lte: to }:{}) }
  const items = await HospitalAssetServiceLog.find(filter).sort({ dateIso: -1, createdAt: -1 }).skip((page-1)*limit).limit(limit).lean()
  const total = await HospitalAssetServiceLog.countDocuments(filter)
  res.json({ items, total, page, limit })
}

async function createExpenseFromServiceLog(req: Request, opts: { dateIso: string; amount: number; note: string; method?: string; category?: string; ref?: string }){
  const { dateIso, amount, note, method, category, ref } = opts
  const createdBy = String((req as any).user?._id || (req as any).user?.id || '')
  const expense = await HospitalExpense.create({
    dateIso,
    category: category || 'Maintenance',
    amount,
    note,
    method: method || 'Cash',
    ref: ref || 'maintenance',
    createdBy,
  })

  // Finance Journal (copy of expense.controller.ts logic)
  try{
    const m = String((expense as any)?.method || method || '').toLowerCase()
    const isCash = m === 'cash'
    let sessionId: string | undefined = undefined
    if (isCash){
      try{
        if (createdBy){
          const sess: any = await HospitalCashSession.findOne({ status: 'open', userId: createdBy }).sort({ createdAt: -1 }).lean()
          if (sess) sessionId = String(sess._id)
        }
      } catch {}
    }
    const tags: any = {}
    if (sessionId) tags.sessionId = sessionId
    const creditAccount = isCash ? 'CASH' : 'BANK'
    const lines = [
      { account: 'EXPENSE', debit: Number(amount || 0), tags },
      { account: creditAccount, credit: Number(amount || 0), tags },
    ] as any
    await FinanceJournal.create({ dateIso, refType: 'expense', refId: String((expense as any)?._id || ''), memo: note || 'Maintenance Expense', lines })
  } catch {}

  return expense
}

export async function createServiceLog(req: Request, res: Response){
  const assetId = String(req.params.assetId || '')
  const asset = await HospitalAsset.findById(assetId).lean()
  if (!asset) return res.status(404).json({ error: 'Asset not found' })

  const data = createServiceLogSchema.parse(req.body || {})
  const dateIso = String(data.dateIso || todayIso())
  const cost = Number(data.cost || 0)
  const createdBy = String((req as any).user?._id || (req as any).user?.id || '')

  let expenseId: any = undefined
  if (data.createExpense && cost > 0) {
    const note = `Maintenance: ${String((asset as any).name || '')}${data.notes ? ' — ' + String(data.notes) : ''}`
    const exp = await createExpenseFromServiceLog(req, {
      dateIso,
      amount: cost,
      note,
      method: data.expenseMethod,
      category: data.expenseCategory || 'Maintenance',
      ref: `asset:${assetId}`,
    })
    expenseId = (exp as any)?._id
  }

  const row = await HospitalAssetServiceLog.create({
    assetId,
    dateIso,
    type: data.type || 'service',
    cost,
    vendorName: data.vendorName,
    notes: data.notes,
    expenseId,
    createdBy,
  })

  res.status(201).json({ serviceLog: row })
}
