import { Schema, model, models } from 'mongoose'

const DialysisPlanSchema = new Schema({
  dialysisPatientId: { type: Schema.Types.ObjectId, ref: 'Hospital_DialysisPatient', required: true, index: true },
  patientId: { type: Schema.Types.ObjectId, ref: 'Lab_Patient', required: true, index: true },
  mrn: { type: String, index: true },

  frequencyPerWeek: { type: Number, min: 1 },
  durationHours: { type: Number, min: 0 },
  bloodFlowRate: { type: Number, min: 0 },
  dialyzerType: { type: String },
  heparinDose: { type: String },
  dryWeightKg: { type: Number, min: 0 },

  active: { type: Boolean, default: true, index: true },
  createdBy: { type: String },
}, { timestamps: true })

DialysisPlanSchema.index({ dialysisPatientId: 1, active: 1 })

export type HospitalDialysisPlanDoc = {
  _id: string
  dialysisPatientId: string
  patientId: string
  mrn?: string
  frequencyPerWeek?: number
  durationHours?: number
  bloodFlowRate?: number
  dialyzerType?: string
  heparinDose?: string
  dryWeightKg?: number
  active?: boolean
  createdBy?: string
}

export const HospitalDialysisPlan = models.Hospital_DialysisPlan || model('Hospital_DialysisPlan', DialysisPlanSchema)
