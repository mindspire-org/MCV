import { z } from 'zod'

export const listCategoriesSchema = z.object({
  active: z.coerce.boolean().optional(),
})

export const upsertCategorySchema = z.object({
  name: z.string().min(1),
  maintenanceType: z.string().optional(),
  defaultRole: z.string().optional(),
  defaultRecurrence: z.enum(['none','daily','weekly','monthly','every_n_days']).optional(),
  defaultIntervalDays: z.coerce.number().int().positive().optional(),
  active: z.boolean().optional(),
})

export const listAssetsSchema = z.object({
  q: z.string().optional(),
  categoryId: z.string().optional(),
  condition: z.enum(['ok','needs_service','broken']).optional(),
  active: z.coerce.boolean().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(500).optional(),
})

export const upsertAssetSchema = z.object({
  name: z.string().min(1),
  categoryId: z.string().min(1),
  location: z.string().optional(),
  condition: z.enum(['ok','needs_service','broken']).optional(),
  notes: z.string().optional(),
  active: z.boolean().optional(),
})

export const listPlansSchema = z.object({
  assetId: z.string().optional(),
  role: z.string().optional(),
  enabled: z.coerce.boolean().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(500).optional(),
})

export const upsertPlanSchema = z.object({
  assetId: z.string().min(1),
  title: z.string().min(1),
  instructions: z.string().optional(),
  role: z.string().min(1),
  recurrence: z.enum(['none','daily','weekly','monthly','every_n_days']).optional(),
  intervalDays: z.coerce.number().int().positive().optional(),
  dueTime: z.string().optional(),
  assignmentStrategy: z.enum(['round_robin','fixed','least_loaded']).optional(),
  fixedStaffIds: z.array(z.string().min(1)).optional(),
  enabled: z.boolean().optional(),
})

export const listTasksSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  date: z.string().optional(),
  status: z.enum(['todo','doing','done']).optional(),
  assetId: z.string().optional(),
  planId: z.string().optional(),
  assignedToStaffId: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(500).optional(),
})

export const updateTaskSchema = z.object({
  status: z.enum(['todo','doing','done']).optional(),
  assignedToStaffId: z.string().optional(),
})

export const generateTasksSchema = z.object({
  dateIso: z.string().optional(),
  planId: z.string().optional(),
  dryRun: z.coerce.boolean().optional(),
})
export const reassignSchema = z.object({
  fromStaffId: z.string().min(1),
  toStaffId: z.string().min(1),
  dateIso: z.string().optional(),
  includeDone: z.coerce.boolean().optional(),
})

export const createServiceLogSchema = z.object({
  dateIso: z.string().optional(),
  type: z.enum(['service','repair','refill','inspection','cleaning','other']).optional(),
  cost: z.coerce.number().min(0).optional(),
  vendorName: z.string().optional(),
  notes: z.string().optional(),
  createExpense: z.coerce.boolean().optional(),
  expenseMethod: z.string().optional(),
  expenseCategory: z.string().optional(),
})

export const listServiceLogsSchema = z.object({
  assetId: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(500).optional(),
})
