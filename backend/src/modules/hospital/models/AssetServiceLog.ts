import { Schema, model, models } from 'mongoose'

const AssetServiceLogSchema = new Schema({
  assetId: { type: Schema.Types.ObjectId, ref: 'Hospital_Asset', required: true, index: true },
  dateIso: { type: String, required: true, index: true }, // yyyy-mm-dd
  type: { type: String, enum: ['service','repair','refill','inspection','cleaning','other'], default: 'service' },
  cost: { type: Number, default: 0 },
  vendorName: { type: String },
  notes: { type: String },
  expenseId: { type: Schema.Types.ObjectId, ref: 'Hospital_Expense' },
  createdBy: { type: String },
}, { timestamps: true })

export type HospitalAssetServiceLogDoc = {
  _id: string
  assetId: string
  dateIso: string
  type: 'service'|'repair'|'refill'|'inspection'|'cleaning'|'other'
  cost?: number
  vendorName?: string
  notes?: string
  expenseId?: string
  createdBy?: string
}

export const HospitalAssetServiceLog = models.Hospital_AssetServiceLog || model('Hospital_AssetServiceLog', AssetServiceLogSchema)
