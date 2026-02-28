import { Schema, model, models } from 'mongoose'

const DialysisSessionSchema = new Schema({
  dialysisPatientId: { type: Schema.Types.ObjectId, ref: 'Hospital_DialysisPatient', required: true, index: true },
  patientId: { type: Schema.Types.ObjectId, ref: 'Lab_Patient', required: true, index: true },
  mrn: { type: String, index: true },
  planId: { type: Schema.Types.ObjectId, ref: 'Hospital_DialysisPlan', required: true },

  status: { type: String, enum: ['scheduled','running','completed'], default: 'scheduled', index: true },

  machineId: { type: String, required: true, index: true },
  nurseId: { type: String },

  scheduledStartAt: { type: Date, required: true, index: true },
  scheduledEndAt: { type: Date, required: true, index: true },

  startedAt: { type: Date },
  completedAt: { type: Date },

  pre: {
    weightKg: { type: Number },
    bp: { type: String },
    temperatureC: { type: Number },
    fluidRemovalTargetKg: { type: Number },
    recordedAt: { type: Date },
    recordedBy: { type: String },
  },

  completion: {
    postWeightKg: { type: Number },
    finalBp: { type: String },
    condition: { type: String },
    actualFluidRemovedKg: { type: Number },
    recordedAt: { type: Date },
    recordedBy: { type: String },
  },

  consumablesTxnId: { type: Schema.Types.ObjectId, ref: 'Hospital_StoreTxn' },
  billingId: { type: Schema.Types.ObjectId, ref: 'Hospital_DialysisBilling' },

  createdBy: { type: String },
}, { timestamps: true })

DialysisSessionSchema.index({ machineId: 1, scheduledStartAt: 1, scheduledEndAt: 1 })
DialysisSessionSchema.index({ dialysisPatientId: 1, scheduledStartAt: -1 })

export type HospitalDialysisSessionDoc = {
  _id: string
  dialysisPatientId: string
  patientId: string
  mrn?: string
  planId: string
  status: 'scheduled'|'running'|'completed'
  machineId: string
  nurseId?: string
  scheduledStartAt: string
  scheduledEndAt: string
  startedAt?: string
  completedAt?: string
  pre?: {
    weightKg?: number
    bp?: string
    temperatureC?: number
    fluidRemovalTargetKg?: number
    recordedAt?: string
    recordedBy?: string
  }
  completion?: {
    postWeightKg?: number
    finalBp?: string
    condition?: string
    actualFluidRemovedKg?: number
    recordedAt?: string
    recordedBy?: string
  }
  consumablesTxnId?: string
  billingId?: string
  createdBy?: string
}

export const HospitalDialysisSession = models.Hospital_DialysisSession || model('Hospital_DialysisSession', DialysisSessionSchema)
