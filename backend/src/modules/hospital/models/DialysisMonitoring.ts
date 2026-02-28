import { Schema, model, models } from 'mongoose'

const DialysisMonitoringSchema = new Schema({
  sessionId: { type: Schema.Types.ObjectId, ref: 'Hospital_DialysisSession', required: true, index: true },
  recordedAt: { type: Date, required: true, index: true },
  bp: { type: String },
  pulse: { type: Number },
  ufRate: { type: Number },
  recordedBy: { type: String },
}, { timestamps: true })

DialysisMonitoringSchema.index({ sessionId: 1, recordedAt: -1 })

export type HospitalDialysisMonitoringDoc = {
  _id: string
  sessionId: string
  recordedAt: string
  bp?: string
  pulse?: number
  ufRate?: number
  recordedBy?: string
}

export const HospitalDialysisMonitoring = models.Hospital_DialysisMonitoring || model('Hospital_DialysisMonitoring', DialysisMonitoringSchema)
