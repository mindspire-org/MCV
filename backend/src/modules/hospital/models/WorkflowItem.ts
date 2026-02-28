import { Schema, model, models } from 'mongoose'

const WorkflowItemSchema = new Schema({
  // Core identification
  type: { type: String, required: true, index: true }, // e.g. 'complaint', 'incident', 'capa', 'housekeeping', 'utility', 'security', 'fleet', 'surgery_safety', 'charity', 'counselling', 'expiry_compliance', 'document_policy', 'mortality_morbidity', 'biomedical_consumables'
  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true },

  // Workflow state
  status: { type: String, required: true, enum: ['draft', 'submitted', 'in_review', 'approved', 'rejected', 'in_progress', 'closed'], default: 'draft', index: true },
  priority: { type: String, required: true, enum: ['low', 'medium', 'high', 'critical'], default: 'medium', index: true },

  // Assignment
  assignedTo: { type: String, index: true },
  assignedBy: { type: String },
  submittedBy: { type: String, required: true, index: true },

  // Dates
  submittedAt: { type: Date },
  dueDate: { type: Date, index: true },
  completedAt: { type: Date },

  // Approval chain (optional)
  approvalSteps: [{ step: String, role: String, approvedBy: String, approvedAt: Date, notes: String }],
  currentApprovalStep: { type: Number, default: -1 },

  // Type-specific data (flexible)
  data: { type: Schema.Types.Mixed }, // e.g. for incident: { location, severity, type, affected }

  // Attachments
  attachments: [{
    filename: String,
    originalName: String,
    mimeType: String,
    size: Number,
    uploadedBy: String,
    uploadedAt: { type: Date, default: Date.now },
    url: String,
  }],

  // Comments
  comments: [{
    author: String,
    text: String,
    createdAt: { type: Date, default: Date.now },
    internal: { type: Boolean, default: false }, // internal-only comment
  }],

  // Metadata
  tags: [{ type: String, trim: true }],
  location: { type: String, trim: true }, // physical location (e.g. ward, lab, OT)
  department: { type: String, trim: true },

  // Audit fields
  createdBy: { type: String, required: true },
  updatedBy: { type: String },
}, { timestamps: true })

// Indexes for performance
WorkflowItemSchema.index({ type: 1, status: 1 })
WorkflowItemSchema.index({ submittedBy: 1, status: 1 })
WorkflowItemSchema.index({ assignedTo: 1, status: 1 })
WorkflowItemSchema.index({ dueDate: 1 })

export type HospitalWorkflowItemDoc = {
  _id: string
  type: string
  title: string
  description?: string
  status: 'draft' | 'submitted' | 'in_review' | 'approved' | 'rejected' | 'in_progress' | 'closed'
  priority: 'low' | 'medium' | 'high' | 'critical'
  assignedTo?: string
  assignedBy?: string
  submittedBy: string
  submittedAt?: Date
  dueDate?: Date
  completedAt?: Date
  approvalSteps?: Array<{
    step: string
    role: string
    approvedBy?: string
    approvedAt?: Date
    notes?: string
  }>
  currentApprovalStep: number
  data?: any
  attachments?: Array<{
    filename: string
    originalName: string
    mimeType: string
    size: number
    uploadedBy: string
    uploadedAt: Date
    url: string
  }>
  comments?: Array<{
    author: string
    text: string
    createdAt: Date
    internal: boolean
  }>
  tags?: string[]
  location?: string
  department?: string
  createdBy: string
  updatedBy?: string
  createdAt: Date
  updatedAt: Date
}

export const HospitalWorkflowItem = models.Hospital_WorkflowItem || model('Hospital_WorkflowItem', WorkflowItemSchema)
