import { Schema, model, models } from 'mongoose'

const MaintenanceTaskSchema = new Schema({
  planId: { type: Schema.Types.ObjectId, ref: 'Hospital_MaintenancePlan', required: true, index: true },
  assetId: { type: Schema.Types.ObjectId, ref: 'Hospital_Asset', required: true, index: true },
  title: { type: String, required: true },
  description: { type: String },
  status: { type: String, enum: ['todo','doing','done'], default: 'todo', index: true },
  dueDate: { type: String, required: true, index: true }, // yyyy-mm-dd
  assignedToStaffId: { type: String, index: true },
  assignedByUserId: { type: String },
  createdAtMs: { type: Number, default: () => Date.now() },
  completedAtMs: { type: Number },
  reopenedCount: { type: Number, default: 0 },
}, { timestamps: true })

MaintenanceTaskSchema.index({ planId: 1, dueDate: 1, assignedToStaffId: 1 })

export type HospitalMaintenanceTaskDoc = {
  _id: string
  planId: string
  assetId: string
  title: string
  description?: string
  status: 'todo'|'doing'|'done'
  dueDate: string
  assignedToStaffId?: string
  assignedByUserId?: string
  createdAtMs: number
  completedAtMs?: number
  reopenedCount?: number
}

export const HospitalMaintenanceTask = models.Hospital_MaintenanceTask || model('Hospital_MaintenanceTask', MaintenanceTaskSchema)
