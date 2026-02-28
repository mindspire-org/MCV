import { Schema, model, models } from 'mongoose'

const ChecklistFieldSchema = new Schema({
  key: { type: String, required: true },
  label: { type: String, required: true },
  type: { type: String, enum: ['text','number','select','boolean','date'], required: true },
  required: { type: Boolean, default: false },
  options: [{ type: String }],
}, { _id: false })

const ComplianceTemplateSchema = new Schema({
  module: { type: String, required: true, index: true },
  category: { type: String, required: true, index: true },
  name: { type: String, required: true, index: true },
  description: { type: String },
  departmentId: { type: String },
  role: { type: String },
  priority: { type: String, enum: ['low','medium','high'], default: 'medium', index: true },
  recurring: { type: String, enum: ['daily','weekly','monthly','none'], default: 'none', index: true },
  critical: { type: Boolean, default: false },
  requireBeforeAfter: { type: Boolean, default: false },
  checklist: { type: [ChecklistFieldSchema], default: [] },
  active: { type: Boolean, default: true, index: true },
  createdBy: { type: String },
  updatedBy: { type: String },
}, { timestamps: true })

export type ComplianceChecklistField = {
  key: string
  label: string
  type: 'text'|'number'|'select'|'boolean'|'date'
  required?: boolean
  options?: string[]
}

export type ComplianceTemplateDoc = {
  _id: string
  module: string
  category: string
  name: string
  description?: string
  departmentId?: string
  role?: string
  priority: 'low'|'medium'|'high'
  recurring: 'daily'|'weekly'|'monthly'|'none'
  critical: boolean
  requireBeforeAfter: boolean
  checklist: ComplianceChecklistField[]
  active: boolean
  createdBy?: string
  updatedBy?: string
  createdAt?: Date
  updatedAt?: Date
}

export const HospitalComplianceTemplate = models.Hospital_ComplianceTemplate || model('Hospital_ComplianceTemplate', ComplianceTemplateSchema)
