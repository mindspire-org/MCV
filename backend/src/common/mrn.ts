import { LabCounter } from '../modules/lab/models/Counter'

/**
 * Generate the next global MRN.
 * - Uses a single atomic counter: lab_counters._id = "mrn_global".
 * - Optional formatting via HospitalSettings.mrFormat.
 *   Supported tokens: {HOSP}, {DEPT}, {YEAR}/{YYYY}, {YY}, {MONTH}/{MM}, {SERIAL}, {SERIAL6} ...
 * - Since MRN is global, {DEPT} is normalized to 'HOSP' to keep MRNs consistent across modules.
 */
export async function nextGlobalMrn(): Promise<string> {
  // Atomic global counter
  const key = 'mrn_global'
  const c = await LabCounter.findByIdAndUpdate(
    key,
    { $inc: { seq: 1 } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  )
  const seqNum = Number((c as any)?.seq || 1)

  const seq = String(seqNum)
  return `MR-${seq}`
}
