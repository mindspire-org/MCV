import { Schema, model, models } from 'mongoose'

const AssetSchema = new Schema({
  name: { type: String, required: true, index: true },
  categoryId: { type: Schema.Types.ObjectId, ref: 'Hospital_MaintenanceCategory', required: true, index: true },
  location: { type: String },
  condition: { type: String, enum: ['ok','needs_service','broken'], default: 'ok', index: true },
  notes: { type: String },
  active: { type: Boolean, default: true },
}, { timestamps: true })

export type HospitalAssetDoc = {
  _id: string
  name: string
  categoryId: string
  location?: string
  condition: 'ok'|'needs_service'|'broken'
  notes?: string
  active: boolean
}

export const HospitalAsset = models.Hospital_Asset || model('Hospital_Asset', AssetSchema)
