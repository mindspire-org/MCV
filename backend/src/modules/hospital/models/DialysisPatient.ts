import { Schema, model, models } from 'mongoose'

const DialysisPatientSchema = new Schema({
  patientId: { type: Schema.Types.ObjectId, ref: 'Lab_Patient', required: true, index: true },
  mrn: { type: String, index: true },

  screening: {
    weightKg: { type: Number },
    bp: { type: String },
    pulse: { type: Number },
    accessType: { type: String },
    labs: { type: Schema.Types.Mixed },
    recordedAt: { type: Date },
    recordedBy: { type: String },
  },

  approvalStatus: { type: String, enum: ['pending', 'eligible', 'not_eligible'], default: 'pending', index: true },
  approval: {
    decidedAt: { type: Date },
    decidedBy: { type: String },
    note: { type: String },
  },

  activePlanId: { type: Schema.Types.ObjectId, ref: 'Hospital_DialysisPlan' },
}, { timestamps: true })

DialysisPatientSchema.index({ patientId: 1 }, { unique: true })

export type HospitalDialysisPatientDoc = {
  _id: string
  patientId: string
  mrn?: string
  screening?: {
    weightKg?: number
    bp?: string
    pulse?: number
    accessType?: string
    labs?: any
    recordedAt?: string
    recordedBy?: string
  }
  approvalStatus: 'pending'|'eligible'|'not_eligible'
  approval?: {
    decidedAt?: string
    decidedBy?: string
    note?: string
  }
  activePlanId?: string
}

export const HospitalDialysisPatient = models.Hospital_DialysisPatient || model('Hospital_DialysisPatient', DialysisPatientSchema)
