import { Schema, model, models } from 'mongoose'

const EvidenceSchema = new Schema({
  kind: { type: String, enum: ['single','before','after','snapshot'], default: 'single' },
  dataUrl: { type: String, required: true },
  capturedAt: { type: String, required: true },
  capturedById: { type: String, required: true },
}, { _id: false })

const ChecklistAnswerSchema = new Schema({
  key: { type: String, required: true },
  value: { type: Schema.Types.Mixed },
}, { _id: false })

const ComplianceSubmissionSchema = new Schema({
  taskId: { type: String, required: true, index: true },
  templateId: { type: String, required: true, index: true },

  submittedById: { type: String, required: true, index: true },
  submittedByUsername: { type: String },
  submittedAt: { type: String, required: true, index: true },

  area: { type: String },

  checklistAnswers: { type: [ChecklistAnswerSchema], default: [] },
  evidence: { type: [EvidenceSchema], default: [] },

  adminStatus: { type: String, enum: ['pending','approved','rejected'], default: 'pending', index: true },
  adminReviewedAt: { type: String },
  adminReviewedById: { type: String },
  adminReviewedByUsername: { type: String },
  rejectReason: { type: String },
}, { timestamps: true })

export type ComplianceEvidence = {
  kind?: 'single'|'before'|'after'|'snapshot'
  dataUrl: string
  capturedAt: string
  capturedById: string
}

export type ComplianceChecklistAnswer = {
  key: string
  value: any
}

export type ComplianceSubmissionDoc = {
  _id: string
  taskId: string
  templateId: string
  submittedById: string
  submittedByUsername?: string
  submittedAt: string
  area?: string
  checklistAnswers: ComplianceChecklistAnswer[]
  evidence: ComplianceEvidence[]
  adminStatus: 'pending'|'approved'|'rejected'
  adminReviewedAt?: string
  adminReviewedById?: string
  adminReviewedByUsername?: string
  rejectReason?: string
  createdAt?: Date
  updatedAt?: Date
}

export const HospitalComplianceSubmission = models.Hospital_ComplianceSubmission || model('Hospital_ComplianceSubmission', ComplianceSubmissionSchema)
