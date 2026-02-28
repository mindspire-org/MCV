import { Request, Response } from 'express'
import { HospitalDialysisPatient } from '../models/DialysisPatient'
import { HospitalDialysisPlan } from '../models/DialysisPlan'
import { HospitalDialysisSession } from '../models/DialysisSession'
import { HospitalDialysisMonitoring } from '../models/DialysisMonitoring'
import { HospitalDialysisConsumable } from '../models/DialysisConsumable'
import { HospitalDialysisBilling } from '../models/DialysisBilling'
import { LabPatient } from '../../lab/models/Patient'
import { HospitalStoreLot } from '../models/StoreLot'
import { HospitalStoreTxn } from '../models/StoreTxn'
import { HospitalStoreItem } from '../models/StoreItem'
import {
  upsertDialysisPatientSchema,
  screeningSchema,
  approvalSchema,
  planSchema,
  scheduleSessionSchema,
  startSessionSchema,
  addMonitoringSchema,
  completeSessionSchema,
  listSessionsSchema,
  reportConsumablesSchema,
} from '../validators/dialysis'

function handleError(res: Response, e: any){
  if (e?.name === 'ZodError') return res.status(400).json({ error: e.errors?.[0]?.message || 'Invalid payload' })
  if (e?.status) return res.status(e.status).json({ error: e.error || 'Error' })
  return res.status(500).json({ error: e?.message || 'Internal Server Error' })
}

function toDate(s?: string){
  if (!s) return new Date()
  const d = new Date(s)
  return isNaN(d.getTime()) ? new Date() : d
}

function startOfWeek(d: Date){
  const dt = new Date(d)
  dt.setHours(0,0,0,0)
  const day = dt.getDay() // 0=Sun
  const diff = (day === 0 ? -6 : 1 - day) // Monday start
  dt.setDate(dt.getDate() + diff)
  return dt
}

async function fifoConsume(opts: { itemId: string; locationId: string; qty: number }){
  let remaining = opts.qty
  const consumed: Array<{ lotId: string; qty: number; unitCost: number; lotNo: string; expiryDate: string }> = []

  const lots = await HospitalStoreLot.find({ itemId: opts.itemId, locationId: opts.locationId, qtyOnHand: { $gt: 0 } })
    .sort({ receivedAt: 1, createdAt: 1 })

  for (const lot of lots){
    if (remaining <= 0) break
    const take = Math.min(remaining, lot.qtyOnHand)
    lot.qtyOnHand = lot.qtyOnHand - take
    await lot.save()
    consumed.push({ lotId: String(lot._id), qty: take, unitCost: lot.unitCost, lotNo: lot.lotNo, expiryDate: lot.expiryDate })
    remaining -= take
  }

  if (remaining > 0){
    throw { status: 400, error: 'Insufficient stock' }
  }

  return consumed
}

async function createIssueTxn(opts: { dateIso: string; locationId: string; departmentId: string; encounterId?: string; referenceNo?: string; notes?: string; lines: Array<{ itemId: string; qty: number }> }){
  const allLines: any[] = []
  for (const l of opts.lines){
    const consumed = await fifoConsume({ itemId: l.itemId, locationId: opts.locationId, qty: l.qty })
    for (const c of consumed){
      allLines.push({ itemId: l.itemId, lotId: c.lotId, qty: c.qty, unitCost: c.unitCost, lotNo: c.lotNo, expiryDate: c.expiryDate })
    }
  }

  const txn = await HospitalStoreTxn.create({
    type: 'ISSUE',
    date: opts.dateIso,
    referenceNo: opts.referenceNo,
    notes: opts.notes,
    fromLocationId: opts.locationId,
    departmentId: opts.departmentId,
    encounterId: opts.encounterId,
    lines: allLines,
  })

  return txn
}

async function ensureDialysisPatient(id: string){
  const dp = await HospitalDialysisPatient.findById(id)
  if (!dp) throw { status: 404, error: 'Dialysis patient not found' }
  return dp
}

async function ensureSession(id: string){
  const s = await HospitalDialysisSession.findById(id)
  if (!s) throw { status: 404, error: 'Session not found' }
  return s
}

export async function getSession(req: Request, res: Response){
  try{
    const s = await ensureSession(String(req.params.id))
    const monitoringCount = await HospitalDialysisMonitoring.countDocuments({ sessionId: s._id })
    const consumables = await HospitalDialysisConsumable.find({ sessionId: s._id }).lean()
    const billing = await HospitalDialysisBilling.findOne({ sessionId: s._id }).lean()
    res.json({ session: s, monitoringCount, consumables, billing })
  } catch (e){ return handleError(res, e) }
}

export async function upsertPatient(req: Request, res: Response){
  try{
    const data = upsertDialysisPatientSchema.parse(req.body)
    const pat = await LabPatient.findById(data.patientId).lean()
    if (!pat) return res.status(404).json({ error: 'Patient not found' })

    const mrn = data.mrn || String((pat as any).mrn || '')

    const dp = await HospitalDialysisPatient.findOneAndUpdate(
      { patientId: data.patientId },
      { $setOnInsert: { patientId: data.patientId }, $set: { mrn } },
      { upsert: true, new: true }
    )

    res.status(201).json({ dialysisPatient: dp })
  } catch (e){ return handleError(res, e) }
}

export async function listActivePatients(req: Request, res: Response){
  try{
    const q = String((req.query as any)?.q || '').trim().toLowerCase()
    const limit = Math.max(1, Math.min(500, parseInt(String((req.query as any)?.limit || '200')) || 200))

    const dpCrit: any = { approvalStatus: 'eligible', activePlanId: { $exists: true, $ne: null } }
    if (q) dpCrit.$or = [{ mrn: { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } }]

    const dps = await HospitalDialysisPatient.find(dpCrit).sort({ updatedAt: -1 }).limit(limit).lean()
    const dpIds = dps.map((x: any) => x._id)
    const patientIds = dps.map((x: any) => x.patientId)
    const planIds = dps.map((x: any) => x.activePlanId).filter(Boolean)

    const [pats, plans] = await Promise.all([
      LabPatient.find({ _id: { $in: patientIds } }).select('fullName mrn phoneNormalized age gender').lean(),
      HospitalDialysisPlan.find({ _id: { $in: planIds } }).lean(),
    ])
    const patById = new Map<string, any>(pats.map((p: any) => [String(p._id), p]))
    const planById = new Map<string, any>(plans.map((p: any) => [String(p._id), p]))

    const now = new Date()
    const wkStart = startOfWeek(now)
    const wkEnd = new Date(wkStart)
    wkEnd.setDate(wkEnd.getDate() + 7)

    const completedAgg = await HospitalDialysisSession.aggregate([
      { $match: { status: 'completed', completedAt: { $gte: wkStart, $lt: wkEnd }, dialysisPatientId: { $in: dpIds } } },
      { $group: { _id: '$dialysisPatientId', completedThisWeek: { $sum: 1 } } },
    ])
    const completedByDp = new Map<string, number>(completedAgg.map((r: any) => [String(r._id), Number(r.completedThisWeek || 0)]))

    const nextAgg = await HospitalDialysisSession.aggregate([
      { $match: { status: { $in: ['scheduled','running'] }, scheduledStartAt: { $gte: now }, dialysisPatientId: { $in: dpIds } } },
      { $sort: { scheduledStartAt: 1 } },
      { $group: { _id: '$dialysisPatientId', nextSessionAt: { $first: '$scheduledStartAt' }, nextSessionId: { $first: '$_id' }, nextMachineId: { $first: '$machineId' } } },
    ])
    const nextByDp = new Map<string, any>(nextAgg.map((r: any) => [String(r._id), r]))

    const items = dps.map((dp: any) => {
      const patient = patById.get(String(dp.patientId))
      const plan = planById.get(String(dp.activePlanId))
      const completedThisWeek = completedByDp.get(String(dp._id)) || 0
      const frequencyPerWeek = plan?.frequencyPerWeek != null ? Number(plan.frequencyPerWeek) : null
      const remainingThisWeek = frequencyPerWeek != null ? Math.max(0, frequencyPerWeek - completedThisWeek) : null
      const next = nextByDp.get(String(dp._id))
      return {
        dialysisPatientId: String(dp._id),
        patientId: String(dp.patientId),
        mrn: String(dp.mrn || patient?.mrn || ''),
        fullName: patient?.fullName,
        phoneNormalized: patient?.phoneNormalized,
        age: patient?.age,
        gender: patient?.gender,
        approvalStatus: dp.approvalStatus,
        activePlanId: dp.activePlanId ? String(dp.activePlanId) : undefined,
        frequencyPerWeek,
        completedThisWeek,
        remainingThisWeek,
        nextSessionAt: next?.nextSessionAt || null,
        nextSessionId: next?.nextSessionId ? String(next.nextSessionId) : null,
        nextMachineId: next?.nextMachineId || null,
      }
    })

    const q2 = q
    const filtered = q2
      ? items.filter((it: any) =>
          String(it.mrn || '').toLowerCase().includes(q2) ||
          String(it.fullName || '').toLowerCase().includes(q2) ||
          String(it.phoneNormalized || '').toLowerCase().includes(q2)
        )
      : items

    res.json({ items: filtered, weekStart: wkStart.toISOString(), weekEnd: wkEnd.toISOString() })
  } catch (e){ return handleError(res, e) }
}

export async function getPatient(req: Request, res: Response){
  try{
    const dp = await ensureDialysisPatient(String(req.params.id))
    const plan = dp.activePlanId ? await HospitalDialysisPlan.findById(dp.activePlanId).lean() : null
    const pat = await LabPatient.findById(dp.patientId).lean()
    res.json({ dialysisPatient: dp, patient: pat, activePlan: plan })
  } catch (e){ return handleError(res, e) }
}

export async function recordScreening(req: Request, res: Response){
  try{
    const dp = await ensureDialysisPatient(String(req.params.id))
    const data = screeningSchema.parse(req.body)
    dp.screening = {
      weightKg: data.weightKg,
      bp: data.bp,
      pulse: data.pulse,
      accessType: data.accessType,
      labs: data.labs,
      recordedAt: toDate(data.recordedAt),
      recordedBy: data.recordedBy,
    } as any
    if (dp.approvalStatus === 'pending') dp.approvalStatus = 'pending'
    await dp.save()
    res.json({ dialysisPatient: dp })
  } catch (e){ return handleError(res, e) }
}

export async function approve(req: Request, res: Response){
  try{
    const dp = await ensureDialysisPatient(String(req.params.id))
    const data = approvalSchema.parse(req.body)
    dp.approvalStatus = data.decision === 'eligible' ? 'eligible' : 'not_eligible'
    dp.approval = {
      decidedAt: toDate(data.decidedAt),
      decidedBy: data.decidedBy,
      note: data.note,
    } as any
    await dp.save()
    res.json({ dialysisPatient: dp })
  } catch (e){ return handleError(res, e) }
}

export async function createPlan(req: Request, res: Response){
  try{
    const dp = await ensureDialysisPatient(String(req.params.id))
    if (dp.approvalStatus !== 'eligible') return res.status(400).json({ error: 'Patient not approved' })
    const data = planSchema.parse(req.body)

    await HospitalDialysisPlan.updateMany({ dialysisPatientId: dp._id, active: true }, { $set: { active: false } })

    const plan = await HospitalDialysisPlan.create({
      dialysisPatientId: dp._id,
      patientId: dp.patientId,
      mrn: dp.mrn,
      frequencyPerWeek: data.frequencyPerWeek,
      durationHours: data.durationHours,
      bloodFlowRate: data.bloodFlowRate,
      dialyzerType: data.dialyzerType,
      heparinDose: data.heparinDose,
      dryWeightKg: data.dryWeightKg,
      active: true,
      createdBy: data.createdBy,
    })

    dp.activePlanId = plan._id as any
    await dp.save()

    res.status(201).json({ plan })
  } catch (e){ return handleError(res, e) }
}

export async function listPlans(req: Request, res: Response){
  try{
    const dp = await ensureDialysisPatient(String(req.params.id))
    const rows = await HospitalDialysisPlan.find({ dialysisPatientId: dp._id }).sort({ createdAt: -1 }).lean()
    res.json({ plans: rows })
  } catch (e){ return handleError(res, e) }
}

export async function scheduleSession(req: Request, res: Response){
  try{
    const dp = await ensureDialysisPatient(String(req.params.id))
    if (dp.approvalStatus !== 'eligible') return res.status(400).json({ error: 'Cannot schedule without approval' })
    if (!dp.activePlanId) return res.status(400).json({ error: 'Cannot schedule without plan' })

    const data = scheduleSessionSchema.parse(req.body)
    const startAt = toDate(data.scheduledStartAt)
    const endAt = toDate(data.scheduledEndAt)
    if (endAt <= startAt) return res.status(400).json({ error: 'Invalid time range' })

    const overlap = await HospitalDialysisSession.countDocuments({
      machineId: data.machineId,
      status: { $in: ['scheduled','running'] },
      $or: [
        { scheduledStartAt: { $lt: endAt }, scheduledEndAt: { $gt: startAt } },
        { startedAt: { $lt: endAt }, scheduledEndAt: { $gt: startAt } },
      ]
    })
    if (overlap > 0) return res.status(400).json({ error: 'Machine time overlap' })

    const s = await HospitalDialysisSession.create({
      dialysisPatientId: dp._id,
      patientId: dp.patientId,
      mrn: dp.mrn,
      planId: dp.activePlanId,
      status: 'scheduled',
      machineId: data.machineId,
      nurseId: data.nurseId,
      scheduledStartAt: startAt,
      scheduledEndAt: endAt,
      createdBy: data.createdBy,
    })

    res.status(201).json({ session: s })
  } catch (e){ return handleError(res, e) }
}

export async function listSessions(req: Request, res: Response){
  try{
    const q = listSessionsSchema.safeParse(req.query)
    if (!q.success) return res.status(400).json({ error: 'Invalid query' })
    const { dialysisPatientId, patientId, mrn, status, from, to, page = 1, limit = 50 } = q.data

    const crit: any = {}
    if (dialysisPatientId) crit.dialysisPatientId = dialysisPatientId
    if (patientId) crit.patientId = patientId
    if (mrn) crit.mrn = mrn
    if (status) crit.status = status
    if (from || to) crit.scheduledStartAt = { ...(from ? { $gte: toDate(from) } : {}), ...(to ? { $lte: toDate(to) } : {}) }

    const total = await HospitalDialysisSession.countDocuments(crit)
    const rows = await HospitalDialysisSession.find(crit).sort({ scheduledStartAt: -1, createdAt: -1 }).skip((page-1)*limit).limit(limit).lean()
    res.json({ sessions: rows, total, page, limit })
  } catch (e){ return handleError(res, e) }
}

export async function startSession(req: Request, res: Response){
  try{
    const s = await ensureSession(String(req.params.id))
    if (s.status !== 'scheduled') return res.status(400).json({ error: 'Session is not scheduled' })

    const dp = await ensureDialysisPatient(String(s.dialysisPatientId))
    if (dp.approvalStatus !== 'eligible') return res.status(400).json({ error: 'Cannot start without approval' })
    if (!dp.activePlanId) return res.status(400).json({ error: 'Cannot start session without plan' })

    const plan = await HospitalDialysisPlan.findById(s.planId)
    if (!plan || !plan.active) return res.status(400).json({ error: 'Active plan required' })

    const data = startSessionSchema.parse(req.body)

    const preWeight = data.pre.weightKg
    const dryWeight = Number(plan.dryWeightKg || 0)
    const target = Math.max(0, preWeight - dryWeight)

    s.pre = {
      weightKg: preWeight,
      bp: data.pre.bp,
      temperatureC: data.pre.temperatureC,
      fluidRemovalTargetKg: target,
      recordedAt: toDate(data.pre.recordedAt),
      recordedBy: data.pre.recordedBy,
    } as any

    s.status = 'running'
    s.startedAt = new Date()

    const txn = await createIssueTxn({
      dateIso: String(data.consumables.date || new Date().toISOString().slice(0,10)),
      locationId: data.consumables.locationId,
      departmentId: data.consumables.departmentId,
      encounterId: String(s._id),
      referenceNo: data.consumables.referenceNo,
      notes: data.consumables.notes,
      lines: data.consumables.lines,
    })

    s.consumablesTxnId = txn._id as any

    const itemIds = [...new Set(txn.lines.map((l: any) => String(l.itemId)))]
    const items = await HospitalStoreItem.find({ _id: { $in: itemIds } }).lean()
    const map = new Map<string, any>()
    for (const it of items) map.set(String((it as any)._id), it)

    const agg = new Map<string, { qty: number; amount: number; unitCost: number }>()
    for (const l of (txn.lines as any[])){
      const key = String(l.itemId)
      const prev = agg.get(key) || { qty: 0, amount: 0, unitCost: 0 }
      const amt = Number(l.qty || 0) * Number(l.unitCost || 0)
      agg.set(key, { qty: prev.qty + Number(l.qty || 0), amount: prev.amount + amt, unitCost: 0 })
    }

    await HospitalDialysisConsumable.deleteMany({ sessionId: s._id })
    for (const [itemId, v] of agg.entries()){
      const name = String(map.get(itemId)?.name || '')
      const unitCost = v.qty > 0 ? (v.amount / v.qty) : 0
      await HospitalDialysisConsumable.create({ sessionId: s._id, itemId, itemName: name, qty: v.qty, unitCost, amount: v.amount })
    }

    await s.save()

    res.json({ session: s, storeTxn: txn })
  } catch (e){ return handleError(res, e) }
}

export async function addMonitoring(req: Request, res: Response){
  try{
    const s = await ensureSession(String(req.params.id))
    if (s.status !== 'running') return res.status(400).json({ error: 'Session is not running' })
    const data = addMonitoringSchema.parse(req.body)
    const row = await HospitalDialysisMonitoring.create({
      sessionId: s._id,
      recordedAt: toDate(data.recordedAt),
      bp: data.bp,
      pulse: data.pulse,
      ufRate: data.ufRate,
      recordedBy: data.recordedBy,
    })
    res.status(201).json({ monitoring: row })
  } catch (e){ return handleError(res, e) }
}

export async function listMonitoring(req: Request, res: Response){
  try{
    const s = await ensureSession(String(req.params.id))
    const limit = Math.max(1, Math.min(500, parseInt(String((req.query as any)?.limit || '100')) || 100))
    const rows = await HospitalDialysisMonitoring.find({ sessionId: s._id }).sort({ recordedAt: -1, createdAt: -1 }).limit(limit).lean()
    res.json({ monitoring: rows })
  } catch (e){ return handleError(res, e) }
}

export async function listSessionConsumables(req: Request, res: Response){
  try{
    const s = await ensureSession(String(req.params.id))
    const limit = Math.max(1, Math.min(500, parseInt(String((req.query as any)?.limit || '200')) || 200))
    const rows = await HospitalDialysisConsumable.find({ sessionId: s._id }).sort({ createdAt: -1 }).limit(limit).lean()
    res.json({ items: rows })
  } catch (e){ return handleError(res, e) }
}

export async function completeSession(req: Request, res: Response){
  try{
    const s = await ensureSession(String(req.params.id))
    if (s.status !== 'running') return res.status(400).json({ error: 'Session is not running' })

    const cnt = await HospitalDialysisMonitoring.countDocuments({ sessionId: s._id })
    if (cnt < 1) return res.status(400).json({ error: 'Cannot complete session without monitoring' })

    const data = completeSessionSchema.parse(req.body)

    const preW = Number((s as any).pre?.weightKg || 0)
    const postW = Number(data.completion.postWeightKg || 0)
    const removed = Math.max(0, preW - postW)

    s.completion = {
      postWeightKg: postW,
      finalBp: data.completion.finalBp,
      condition: data.completion.condition,
      actualFluidRemovedKg: removed,
      recordedAt: toDate(data.completion.recordedAt),
      recordedBy: data.completion.recordedBy,
    } as any

    s.status = 'completed'
    s.completedAt = new Date()

    const sessionCharge = Number(data.charges?.sessionCharge || 0)

    const cons = await HospitalDialysisConsumable.find({ sessionId: s._id }).lean()
    const items: Array<{ type: 'dialysis_session'|'consumable'; description: string; qty: number; unitPrice: number; amount: number }> = []
    items.push({ type: 'dialysis_session', description: 'Dialysis Session', qty: 1, unitPrice: sessionCharge, amount: sessionCharge })

    for (const c of cons){
      const qty = Number((c as any).qty || 0)
      const unitPrice = Number((c as any).unitCost || 0)
      const amt = Number((c as any).amount != null ? (c as any).amount : (qty * unitPrice))
      items.push({ type: 'consumable', description: String((c as any).itemName || 'Consumable'), qty, unitPrice, amount: amt })
    }

    const subtotal = items.reduce((sum, it) => sum + Number(it.amount || 0), 0)

    const billing = await HospitalDialysisBilling.findOneAndUpdate(
      { sessionId: s._id },
      { $set: { sessionId: s._id, patientId: s.patientId, mrn: s.mrn, status: 'final', items, subtotal } },
      { upsert: true, new: true }
    )

    s.billingId = (billing as any)._id
    await s.save()

    res.json({ session: s, billing })
  } catch (e){ return handleError(res, e) }
}

export async function getBilling(req: Request, res: Response){
  try{
    const s = await ensureSession(String(req.params.id))
    const billing = await HospitalDialysisBilling.findOne({ sessionId: s._id }).lean()
    res.json({ billing })
  } catch (e){ return handleError(res, e) }
}

export async function reportPatientHistory(req: Request, res: Response){
  try{
    const dialysisPatientId = String((req.query as any)?.dialysisPatientId || '')
    const mrn = String((req.query as any)?.mrn || '')
    if (!dialysisPatientId && !mrn) return res.status(400).json({ error: 'dialysisPatientId or mrn required' })
    const crit: any = {}
    if (dialysisPatientId) crit.dialysisPatientId = dialysisPatientId
    if (mrn) crit.mrn = mrn
    const rows = await HospitalDialysisSession.find(crit).sort({ scheduledStartAt: -1 }).limit(500).lean()
    res.json({ sessions: rows })
  } catch (e){ return handleError(res, e) }
}

export async function reportSessionsCompleted(req: Request, res: Response){
  try{
    const from = String((req.query as any)?.from || '')
    const to = String((req.query as any)?.to || '')

    const mrn = String((req.query as any)?.mrn || '')
    const dialysisPatientId = String((req.query as any)?.dialysisPatientId || '')

    const baseCrit: any = {}
    if (mrn) baseCrit.mrn = mrn
    if (dialysisPatientId) baseCrit.dialysisPatientId = dialysisPatientId

    const completedCrit: any = { ...baseCrit, status: 'completed' }
    if (from || to) completedCrit.completedAt = { ...(from ? { $gte: toDate(from) } : {}), ...(to ? { $lte: toDate(to) } : {}) }

    const remainingCrit: any = { ...baseCrit, status: { $in: ['scheduled','running'] } }
    if (from || to) remainingCrit.scheduledStartAt = { ...(from ? { $gte: toDate(from) } : {}), ...(to ? { $lte: toDate(to) } : {}) }

    const [totalCompleted, totalRemaining] = await Promise.all([
      HospitalDialysisSession.countDocuments(completedCrit),
      HospitalDialysisSession.countDocuments(remainingCrit),
    ])

    res.json({ totalCompleted, totalRemaining })
  } catch (e){ return handleError(res, e) }
}

export async function reportConsumablesUsed(req: Request, res: Response){
  try{
    const q = reportConsumablesSchema.safeParse(req.query)
    if (!q.success) return res.status(400).json({ error: 'Invalid query' })
    const { from, to, mrn, itemId, page = 1, limit = 200 } = q.data

    const match: any = {}
    if (mrn) match.mrn = mrn

    const sessMatch: any = {}
    if (from || to) sessMatch.completedAt = { ...(from ? { $gte: toDate(from) } : {}), ...(to ? { $lte: toDate(to) } : {}) }

    const sessionIds = await HospitalDialysisSession.find({ status: 'completed', ...(Object.keys(match).length ? match : {}), ...(Object.keys(sessMatch).length ? sessMatch : {}) }).select('_id').lean()
    const ids = sessionIds.map((x: any) => x._id)

    const crit: any = { sessionId: { $in: ids } }
    if (itemId) crit.itemId = itemId

    const total = await HospitalDialysisConsumable.countDocuments(crit)
    const rows = await HospitalDialysisConsumable.find(crit).sort({ createdAt: -1 }).skip((page-1)*limit).limit(limit).lean()

    res.json({ items: rows, total, page, limit })
  } catch (e){ return handleError(res, e) }
}
