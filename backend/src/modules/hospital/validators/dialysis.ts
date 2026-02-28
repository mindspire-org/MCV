import { z } from 'zod'

export const upsertDialysisPatientSchema = z.object({
  patientId: z.string().min(1),
  mrn: z.string().optional(),
})

export const screeningSchema = z.object({
  weightKg: z.number().min(0),
  bp: z.string().optional(),
  pulse: z.number().min(0).optional(),
  accessType: z.string().optional(),
  labs: z.any().optional(),
  recordedAt: z.string().optional(),
  recordedBy: z.string().optional(),
})

export const approvalSchema = z.object({
  decision: z.enum(['eligible','not_eligible']),
  note: z.string().optional(),
  decidedAt: z.string().optional(),
  decidedBy: z.string().optional(),
})

export const planSchema = z.object({
  frequencyPerWeek: z.number().int().min(1),
  durationHours: z.number().min(0).optional(),
  bloodFlowRate: z.number().min(0).optional(),
  dialyzerType: z.string().optional(),
  heparinDose: z.string().optional(),
  dryWeightKg: z.number().min(0),
  createdBy: z.string().optional(),
})

export const scheduleSessionSchema = z.object({
  machineId: z.string().min(1),
  nurseId: z.string().optional(),
  scheduledStartAt: z.string().min(1),
  scheduledEndAt: z.string().min(1),
  createdBy: z.string().optional(),
})

export const startSessionSchema = z.object({
  pre: z.object({
    weightKg: z.number().min(0),
    bp: z.string().optional(),
    temperatureC: z.number().min(0).optional(),
    recordedAt: z.string().optional(),
    recordedBy: z.string().optional(),
  }),
  consumables: z.object({
    locationId: z.string().min(1),
    departmentId: z.string().min(1),
    date: z.string().optional(),
    referenceNo: z.string().optional(),
    notes: z.string().optional(),
    lines: z.array(z.object({ itemId: z.string().min(1), qty: z.number().gt(0) })).min(1),
  }),
})

export const addMonitoringSchema = z.object({
  recordedAt: z.string().optional(),
  bp: z.string().optional(),
  pulse: z.number().min(0).optional(),
  ufRate: z.number().min(0).optional(),
  recordedBy: z.string().optional(),
})

export const completeSessionSchema = z.object({
  completion: z.object({
    postWeightKg: z.number().min(0),
    finalBp: z.string().optional(),
    condition: z.string().optional(),
    recordedAt: z.string().optional(),
    recordedBy: z.string().optional(),
  }),
  charges: z.object({
    sessionCharge: z.number().min(0).default(0),
  }).optional(),
})

export const listSessionsSchema = z.object({
  dialysisPatientId: z.string().optional(),
  patientId: z.string().optional(),
  mrn: z.string().optional(),
  status: z.enum(['scheduled','running','completed']).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
})

export const reportConsumablesSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  mrn: z.string().optional(),
  itemId: z.string().optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(1000).optional(),
})
