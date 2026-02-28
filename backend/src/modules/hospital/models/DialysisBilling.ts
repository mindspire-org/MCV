import { Schema, model, models } from 'mongoose'

const DialysisBillingSchema = new Schema({
  sessionId: { type: Schema.Types.ObjectId, ref: 'Hospital_DialysisSession', required: true, index: true },
  patientId: { type: Schema.Types.ObjectId, ref: 'Lab_Patient', required: true, index: true },
  mrn: { type: String, index: true },

  status: { type: String, enum: ['open','final'], default: 'final', index: true },

  items: [{
    type: { type: String, enum: ['dialysis_session','consumable','other'], required: true },
    description: { type: String, required: true },
    qty: { type: Number, required: true, min: 0 },
    unitPrice: { type: Number, required: true, min: 0 },
    amount: { type: Number, required: true, min: 0 },
  }],

  subtotal: { type: Number, min: 0, default: 0 },

  createdBy: { type: String },
}, { timestamps: true })

DialysisBillingSchema.index({ sessionId: 1 }, { unique: true })

export type HospitalDialysisBillingDoc = {
  _id: string
  sessionId: string
  patientId: string
  mrn?: string
  status: 'open'|'final'
  items: Array<{ type: 'dialysis_session'|'consumable'|'other'; description: string; qty: number; unitPrice: number; amount: number }>
  subtotal: number
  createdBy?: string
}

export const HospitalDialysisBilling = models.Hospital_DialysisBilling || model('Hospital_DialysisBilling', DialysisBillingSchema)
