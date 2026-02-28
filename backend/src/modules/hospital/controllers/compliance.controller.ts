import { Request, Response } from 'express'
import { z } from 'zod'
import { HospitalComplianceTemplate } from '../models/ComplianceTemplate'
import { HospitalComplianceTask } from '../models/ComplianceTask'
import { HospitalComplianceSubmission } from '../models/ComplianceSubmission'
import { HospitalAuditLog } from '../models/AuditLog'
import {
  complianceReviewSchema,
  complianceSubmitSchema,
  complianceTaskAssignSchema,
  complianceTemplateCreateSchema,
  complianceTemplateUpdateSchema,
} from '../validators/compliance'

function actor(req: Request){
  const u: any = (req as any).user || {}
  return {
    id: String(u._id || u.sub || u.id || ''),
    username: String(u.username || ''),
    role: String(u.role || ''),
  }
}

function isAdmin(req: Request){
  const u: any = (req as any).user || {}
  const r = String(u.role || '')
  return /^admin$/i.test(r)
}

async function log(req: Request, action: string, detail?: string){
  try {
    const a = actor(req)
    await HospitalAuditLog.create({
      actor: a.username || a.id || 'system',
      action,
      label: 'COMPLIANCE',
      method: req.method,
      path: req.originalUrl,
      at: new Date().toISOString(),
      detail,
    })
  } catch {}
}

export async function listTemplates(req: Request, res: Response){
  const q = String((req.query.q || '') as any).trim()
  const active = String((req.query.active || '') as any).trim()
  const filter: any = {}
  if (q) filter.$or = [
    { name: { $regex: q, $options: 'i' } },
    { category: { $regex: q, $options: 'i' } },
  ]
  if (active) filter.active = active === 'true'
  const items = await HospitalComplianceTemplate.find(filter).sort({ createdAt: -1 }).lean()
  res.json({ items })
}

export async function createTemplate(req: Request, res: Response){
  const a = actor(req)
  const data = complianceTemplateCreateSchema.parse(req.body)
  const row = await HospitalComplianceTemplate.create({
    ...data,
    createdBy: a.username || a.id,
    updatedBy: a.username || a.id,
  })
  await log(req, 'compliance.template.create', `Template ${row.name} created`)
  res.status(201).json({ template: row })
}

export async function updateTemplate(req: Request, res: Response){
  const a = actor(req)
  const data = complianceTemplateUpdateSchema.parse(req.body)
  const row = await HospitalComplianceTemplate.findByIdAndUpdate(req.params.id, { $set: { ...data, updatedBy: a.username || a.id } }, { new: true })
  if (!row) return res.status(404).json({ error: 'Template not found' })
  await log(req, 'compliance.template.update', `Template ${row.name} updated`)
  res.json({ template: row })
}

export async function assignTask(req: Request, res: Response){
  const a = actor(req)
  const data = complianceTaskAssignSchema.parse(req.body)
  const tpl: any = await HospitalComplianceTemplate.findById(data.templateId).lean()
  if (!tpl) return res.status(404).json({ error: 'Template not found' })

  const row = await HospitalComplianceTask.create({
    templateId: String(tpl._id),
    name: String(tpl.name),
    module: String(tpl.module || 'Compliance'),
    category: String(tpl.category || 'General'),
    departmentId: tpl.departmentId ? String(tpl.departmentId) : undefined,
    role: tpl.role ? String(tpl.role) : undefined,
    priority: (data.priority || tpl.priority || 'medium'),
    assignedById: a.id,
    assignedByUsername: a.username,
    assignedToId: data.assignedToId,
    assignedToUsername: data.assignedToUsername,
    deadlineIso: data.deadlineIso,
    status: 'pending',
  })

  await log(req, 'compliance.task.assign', `Task ${row.name} assigned to ${data.assignedToUsername || data.assignedToId}`)
  res.status(201).json({ task: row })
}

export async function listTasks(req: Request, res: Response){
  const a = actor(req)
  const mine = String((req.query.mine || '') as any).trim()
  const status = String((req.query.status || '') as any).trim()
  const from = String((req.query.from || '') as any).trim()
  const to = String((req.query.to || '') as any).trim()

  const filter: any = {}
  if (mine === 'true') filter.assignedToId = a.id
  if (status) filter.status = status
  if (from || to) {
    filter.deadlineIso = {}
    if (from) filter.deadlineIso.$gte = from
    if (to) filter.deadlineIso.$lte = to
  }

  const items = await HospitalComplianceTask.find(filter).sort({ createdAt: -1 }).lean()
  res.json({ items })
}

export async function getTask(req: Request, res: Response){
  const id = String(req.params.id || '')
  const row: any = await HospitalComplianceTask.findById(id).lean()
  if (!row) return res.status(404).json({ error: 'Task not found' })

  const tpl = await HospitalComplianceTemplate.findById(row.templateId).lean()
  const submission = row.submissionId ? await HospitalComplianceSubmission.findById(row.submissionId).lean() : null

  res.json({ task: row, template: tpl, submission })
}

export async function submitTask(req: Request, res: Response){
  const a = actor(req)
  const taskId = String(req.params.id || '')
  const data = complianceSubmitSchema.parse(req.body)

  const task: any = await HospitalComplianceTask.findById(taskId)
  if (!task) return res.status(404).json({ error: 'Task not found' })

  if (String(task.assignedToId || '') !== a.id && !isAdmin(req)) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  if (task.submissionId) {
    return res.status(409).json({ error: 'Task already submitted' })
  }

  const tpl: any = await HospitalComplianceTemplate.findById(String(task.templateId)).lean()
  if (!tpl) return res.status(400).json({ error: 'Template missing' })

  const requiredKeys = new Set<string>()
  for (const f of (tpl.checklist || [])) {
    if (f?.required) requiredKeys.add(String(f.key || ''))
  }
  const provided = new Map<string, any>()
  for (const ans of (data.checklistAnswers || [])) {
    provided.set(String(ans.key || ''), ans.value)
  }
  for (const k of requiredKeys) {
    if (!k) continue
    if (!provided.has(k) || provided.get(k) == null || provided.get(k) === '') {
      return res.status(400).json({ error: `Checklist field required: ${k}` })
    }
  }

  const critical = !!tpl.critical
  const requireBeforeAfter = !!tpl.requireBeforeAfter
  const ev = data.evidence || []

  if (critical && ev.length === 0) {
    return res.status(400).json({ error: 'Image evidence is required for this task' })
  }

  if (requireBeforeAfter) {
    const hasBefore = ev.some(x => String(x.kind || '') === 'before')
    const hasAfter = ev.some(x => String(x.kind || '') === 'after')
    if (!hasBefore || !hasAfter) return res.status(400).json({ error: 'Before & After images are required' })
  }

  const submission = await HospitalComplianceSubmission.create({
    taskId: String(task._id),
    templateId: String(tpl._id),
    submittedById: a.id,
    submittedByUsername: a.username,
    submittedAt: new Date().toISOString(),
    area: data.area,
    checklistAnswers: data.checklistAnswers || [],
    evidence: (data.evidence || []).map(x => ({
      kind: x.kind || 'single',
      dataUrl: x.dataUrl,
      capturedAt: x.capturedAt,
      capturedById: a.id,
    })),
    adminStatus: 'pending',
  })

  task.submissionId = String(submission._id)
  task.status = 'submitted'
  await task.save()

  await log(req, 'compliance.task.submit', `Task ${task.name} submitted by ${a.username || a.id}`)
  res.status(201).json({ ok: true, submissionId: String(submission._id) })
}

export async function reviewSubmission(req: Request, res: Response){
  const a = actor(req)
  const taskId = String(req.params.id || '')
  const data = complianceReviewSchema.parse(req.body)

  const task: any = await HospitalComplianceTask.findById(taskId)
  if (!task) return res.status(404).json({ error: 'Task not found' })
  if (!task.submissionId) return res.status(400).json({ error: 'Task not submitted yet' })

  const submission: any = await HospitalComplianceSubmission.findById(String(task.submissionId))
  if (!submission) return res.status(400).json({ error: 'Submission missing' })

  if (data.status === 'rejected') {
    const reason = String(data.reason || '').trim()
    if (!reason) return res.status(400).json({ error: 'Reject reason required' })
  }

  submission.adminStatus = data.status
  submission.adminReviewedAt = new Date().toISOString()
  submission.adminReviewedById = a.id
  submission.adminReviewedByUsername = a.username
  submission.rejectReason = data.status === 'rejected' ? String(data.reason || '') : undefined
  await submission.save()

  task.status = data.status
  await task.save()

  await log(req, `compliance.task.${data.status}`, `Task ${task.name} ${data.status} by ${a.username || a.id}`)
  res.json({ ok: true })
}

export async function complianceSummary(req: Request, res: Response){
  const parsed = z.object({ from: z.string().optional(), to: z.string().optional() }).safeParse(req.query)
  const from = parsed.success ? String(parsed.data.from || '') : ''
  const to = parsed.success ? String(parsed.data.to || '') : ''

  const filter: any = {}
  if (from || to) {
    filter.deadlineIso = {}
    if (from) filter.deadlineIso.$gte = from
    if (to) filter.deadlineIso.$lte = to
  }

  const total = await HospitalComplianceTask.countDocuments(filter)
  const approved = await HospitalComplianceTask.countDocuments({ ...filter, status: 'approved' })
  const rejected = await HospitalComplianceTask.countDocuments({ ...filter, status: 'rejected' })
  const pending = await HospitalComplianceTask.countDocuments({ ...filter, status: 'pending' })
  const submitted = await HospitalComplianceTask.countDocuments({ ...filter, status: 'submitted' })
  const escalated = await HospitalComplianceTask.countDocuments({ ...filter, status: 'escalated' })

  res.json({ total, approved, rejected, pending, submitted, escalated })
}

export async function seedDefaultTemplates(req: Request, res: Response){
  const a = actor(req)
  const defaults: any[] = [
    {
      module: 'Compliance',
      category: 'Security & Safety',
      name: 'CCTV checks',
      description: 'Verify CCTV feeds and recording status',
      priority: 'high',
      recurring: 'daily',
      critical: true,
      requireBeforeAfter: false,
      checklist: [
        { key: 'feeds_ok', label: 'All camera feeds working?', type: 'boolean', required: true },
        { key: 'recording_ok', label: 'Recording active?', type: 'boolean', required: true },
        { key: 'issues', label: 'Any issues noted', type: 'text', required: false },
      ],
      active: true,
    },
    {
      module: 'Compliance',
      category: 'Security & Safety',
      name: 'Fire safety inspections',
      description: 'Fire extinguishers, exits, alarms',
      priority: 'high',
      recurring: 'daily',
      critical: true,
      requireBeforeAfter: false,
      checklist: [
        { key: 'extinguishers_ok', label: 'Extinguishers present & accessible?', type: 'boolean', required: true },
        { key: 'exits_clear', label: 'Emergency exits clear?', type: 'boolean', required: true },
        { key: 'alarm_ok', label: 'Alarm panel normal?', type: 'boolean', required: true },
      ],
      active: true,
    },
    {
      module: 'Compliance',
      category: 'Housekeeping & Hygiene',
      name: 'Washroom cleanliness',
      description: 'Cleanliness with before/after proof',
      priority: 'medium',
      recurring: 'daily',
      critical: true,
      requireBeforeAfter: true,
      checklist: [
        { key: 'cleaned', label: 'Cleaned as per SOP?', type: 'boolean', required: true },
        { key: 'supplies', label: 'Supplies refilled (soap/tissue)?', type: 'boolean', required: true },
      ],
      active: true,
    },
    {
      module: 'Compliance',
      category: 'Vehicles & Fleet',
      name: 'Fuel tracking',
      description: 'Record readings and usage',
      priority: 'medium',
      recurring: 'daily',
      critical: false,
      requireBeforeAfter: false,
      checklist: [
        { key: 'vehicle', label: 'Vehicle', type: 'text', required: true },
        { key: 'prev_reading', label: 'Previous reading', type: 'number', required: true },
        { key: 'curr_reading', label: 'Current reading', type: 'number', required: true },
        { key: 'fuel_liters', label: 'Fuel filled (liters)', type: 'number', required: true },
      ],
      active: true,
    },
  ]

  let created = 0
  let updated = 0
  for (const d of defaults) {
    const existing: any = await HospitalComplianceTemplate.findOne({
      module: String(d.module),
      category: String(d.category),
      name: String(d.name),
    }).lean()
    if (existing?._id) {
      await HospitalComplianceTemplate.findByIdAndUpdate(String(existing._id), { $set: { ...d, updatedBy: a.username || a.id } })
      updated += 1
    } else {
      await HospitalComplianceTemplate.create({
        ...d,
        createdBy: a.username || a.id,
        updatedBy: a.username || a.id,
      })
      created += 1
    }
  }

  await log(req, 'compliance.template.seed-defaults', `Seeded defaults created=${created} updated=${updated}`)
  res.status(201).json({ ok: true, created, updated })
}
