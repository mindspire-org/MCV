import { Schema, model, models } from 'mongoose'

const MaintenancePlanSchema = new Schema({
  assetId: { type: Schema.Types.ObjectId, ref: 'Hospital_Asset', required: true, index: true },
  title: { type: String, required: true },
  instructions: { type: String },
  role: { type: String, required: true, index: true },
  recurrence: { type: String, enum: ['none','daily','weekly','monthly','every_n_days'], default: 'none', index: true },
  intervalDays: { type: Number },
  dueTime: { type: String },
  assignmentStrategy: { type: String, enum: ['round_robin','fixed','least_loaded'], default: 'round_robin' },
  fixedStaffIds: { type: [String], default: [] },
  enabled: { type: Boolean, default: true, index: true },
  lastGeneratedOn: { type: String }, // yyyy-mm-dd
}, { timestamps: true })

export type HospitalMaintenancePlanDoc = {
  _id: string
  assetId: string
  title: string
  instructions?: string
  role: string
  recurrence: 'none'|'daily'|'weekly'|'monthly'|'every_n_days'
  intervalDays?: number
  dueTime?: string
  assignmentStrategy: 'round_robin'|'fixed'|'least_loaded'
  fixedStaffIds?: string[]
  enabled: boolean
  lastGeneratedOn?: string
}

export const HospitalMaintenancePlan = models.Hospital_MaintenancePlan || model('Hospital_MaintenancePlan', MaintenancePlanSchema)
