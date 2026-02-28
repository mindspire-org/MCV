import { Schema, model, models } from 'mongoose'

const WorkflowTaskSchema = new Schema({
  // Link to parent workflow item
  workflowItemId: { type: Schema.Types.ObjectId, ref: 'Hospital_WorkflowItem', required: true, index: true },

  // Task details
  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true },

  // Assignment
  assignedTo: { type: String, required: true, index: true },
  assignedBy: { type: String, required: true },

  // Status
  status: { type: String, required: true, enum: ['pending', 'in_progress', 'completed', 'overdue'], default: 'pending', index: true },

  // Dates
  dueDate: { type: Date, required: true, index: true },
  completedAt: { type: Date },

  // Escalation
  escalated: { type: Boolean, default: false },
  escalatedTo: { type: String },
  escalatedAt: { type: Date },
  escalationReason: { type: String },

  // Priority
  priority: { type: String, required: true, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },

  // Completion notes
  completionNotes: { type: String },

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

  // Metadata
  tags: [{ type: String, trim: true }],
  location: { type: String, trim: true },

  // Audit
  createdBy: { type: String, required: true },
  updatedBy: { type: String },
}, { timestamps: true })

// Indexes
WorkflowTaskSchema.index({ workflowItemId: 1, status: 1 })
WorkflowTaskSchema.index({ assignedTo: 1, dueDate: 1 })
WorkflowTaskSchema.index({ status: 1, dueDate: 1 })

export type HospitalWorkflowTaskDoc = {
  _id: string
  workflowItemId: string
  title: string
  description?: string
  assignedTo: string
  assignedBy: string
  status: 'pending' | 'in_progress' | 'completed' | 'overdue'
  dueDate: Date
  completedAt?: Date
  escalated: boolean
  escalatedTo?: string
  escalatedAt?: Date
  escalationReason?: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  completionNotes?: string
  attachments?: Array<{
    filename: string
    originalName: string
    mimeType: string
    size: number
    uploadedBy: string
    uploadedAt: Date
    url: string
  }>
  tags?: string[]
  location?: string
  createdBy: string
  updatedBy?: string
  createdAt: Date
  updatedAt: Date
}

export const HospitalWorkflowTask = models.Hospital_WorkflowTask || model('Hospital_WorkflowTask', WorkflowTaskSchema)
