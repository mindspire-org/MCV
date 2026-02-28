import { Schema, model, models } from 'mongoose'

const ComplianceTaskSchema = new Schema({
  templateId: { type: String, required: true, index: true },
  name: { type: String, required: true, index: true },
  module: { type: String, required: true, index: true },
  category: { type: String, required: true, index: true },
  departmentId: { type: String, index: true },
  role: { type: String, index: true },
  priority: { type: String, enum: ['low','medium','high'], default: 'medium', index: true },

  assignedById: { type: String, required: true, index: true },
  assignedByUsername: { type: String },
  assignedToId: { type: String, required: true, index: true },
  assignedToUsername: { type: String },

  deadlineIso: { type: String, required: true, index: true },

  status: { type: String, enum: ['pending','submitted','approved','rejected','escalated'], default: 'pending', index: true },

  submissionId: { type: String, index: true },

  escalatedToId: { type: String, index: true },
  escalatedAt: { type: String },
  escalationReason: { type: String },
}, { timestamps: true })

export type ComplianceTaskDoc = {
  _id: string
  templateId: string
  name: string
  module: string
  category: string
  departmentId?: string
  role?: string
  priority: 'low'|'medium'|'high'
  assignedById: string
  assignedByUsername?: string
  assignedToId: string
  assignedToUsername?: string
  deadlineIso: string
  status: 'pending'|'submitted'|'approved'|'rejected'|'escalated'
  submissionId?: string
  escalatedToId?: string
  escalatedAt?: string
  escalationReason?: string
  createdAt?: Date
  updatedAt?: Date
}

export const HospitalComplianceTask = models.Hospital_ComplianceTask || model('Hospital_ComplianceTask', ComplianceTaskSchema)
