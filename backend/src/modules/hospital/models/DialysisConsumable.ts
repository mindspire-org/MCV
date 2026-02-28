import { Schema, model, models } from 'mongoose'

const DialysisConsumableSchema = new Schema({
  sessionId: { type: Schema.Types.ObjectId, ref: 'Hospital_DialysisSession', required: true, index: true },
  itemId: { type: Schema.Types.ObjectId, ref: 'Hospital_StoreItem', required: true },
  itemName: { type: String },
  qty: { type: Number, required: true, min: 0 },
  unitCost: { type: Number, min: 0 },
  amount: { type: Number, min: 0 },
}, { timestamps: true })

DialysisConsumableSchema.index({ sessionId: 1 })

export type HospitalDialysisConsumableDoc = {
  _id: string
  sessionId: string
  itemId: string
  itemName?: string
  qty: number
  unitCost?: number
  amount?: number
}

export const HospitalDialysisConsumable = models.Hospital_DialysisConsumable || model('Hospital_DialysisConsumable', DialysisConsumableSchema)
