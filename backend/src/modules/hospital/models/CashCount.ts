import { Schema, model, models } from 'mongoose'

const CashCountSchema = new Schema({
  date: { type: String, required: true, index: true },
  amount: { type: Number, required: true },
  note: { type: String },
  user: { type: String, default: 'manager' },
  receiver: { type: String },
  handoverBy: { type: String },
}, { timestamps: true })

export type HospitalCashCountDoc = {
  _id: string
  date: string
  amount: number
  note?: string
  user: string
  receiver?: string
  handoverBy?: string
  createdAt: string
  updatedAt: string
}

export const HospitalCashCount = models.Hospital_CashCount || model('Hospital_CashCount', CashCountSchema)
