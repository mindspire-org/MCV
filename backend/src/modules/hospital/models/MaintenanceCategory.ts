import { Schema, model, models } from 'mongoose'

const MaintenanceCategorySchema = new Schema({
  name: { type: String, required: true, index: true },
  maintenanceType: { type: String, default: 'general' },
  defaultRole: { type: String },
  defaultRecurrence: { type: String, enum: ['none','daily','weekly','monthly','every_n_days'], default: 'none' },
  defaultIntervalDays: { type: Number },
  active: { type: Boolean, default: true },
}, { timestamps: true })

MaintenanceCategorySchema.index({ name: 1 }, { unique: true })

export type MaintenanceCategoryDoc = {
  _id: string
  name: string
  maintenanceType?: string
  defaultRole?: string
  defaultRecurrence?: 'none'|'daily'|'weekly'|'monthly'|'every_n_days'
  defaultIntervalDays?: number
  active: boolean
}

export const HospitalMaintenanceCategory = models.Hospital_MaintenanceCategory || model('Hospital_MaintenanceCategory', MaintenanceCategorySchema)
