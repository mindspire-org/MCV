import { z } from 'zod'

export const checklistFieldSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  type: z.enum(['text','number','select','boolean','date']),
  required: z.boolean().optional().default(false),
  options: z.array(z.string()).optional().default([]),
})

export const complianceTemplateCreateSchema = z.object({
  module: z.string().min(1).default('Compliance'),
  category: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  departmentId: z.string().optional(),
  role: z.string().optional(),
  priority: z.enum(['low','medium','high']).optional().default('medium'),
  recurring: z.enum(['daily','weekly','monthly','none']).optional().default('none'),
  critical: z.boolean().optional().default(false),
  requireBeforeAfter: z.boolean().optional().default(false),
  checklist: z.array(checklistFieldSchema).optional().default([]),
  active: z.boolean().optional().default(true),
})

export const complianceTemplateUpdateSchema = complianceTemplateCreateSchema.partial()

export const complianceTaskAssignSchema = z.object({
  templateId: z.string().min(1),
  assignedToId: z.string().min(1),
  assignedToUsername: z.string().optional(),
  deadlineIso: z.string().min(10),
  priority: z.enum(['low','medium','high']).optional(),
})

export const evidenceSchema = z.object({
  kind: z.enum(['single','before','after','snapshot']).optional().default('single'),
  dataUrl: z.string().min(20),
  capturedAt: z.string().min(10),
})

export const complianceSubmitSchema = z.object({
  area: z.string().optional(),
  checklistAnswers: z.array(z.object({
    key: z.string().min(1),
    value: z.any(),
  })).optional().default([]),
  evidence: z.array(evidenceSchema).optional().default([]),
})

export const complianceReviewSchema = z.object({
  status: z.enum(['approved','rejected']),
  reason: z.string().optional(),
})
