import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { hospitalApi } from '../../utils/api'

function fmtDT(d?: any){
  try {
    if (!d) return ''
    const dt = new Date(d)
    if (isNaN(dt.getTime())) return ''
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`
  } catch { return '' }
}

export default function Hospital_DialysisPatient(){
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [dp, setDp] = useState<any>(null)
  const [patient, setPatient] = useState<any>(null)
  const [plan, setPlan] = useState<any>(null)
  const [plans, setPlans] = useState<any[]>([])
  const [sessions, setSessions] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const approvalStatus = String(dp?.approvalStatus || 'pending')

  const [screening, setScreening] = useState({ weightKg: '', bp: '', pulse: '', accessType: '' })
  const [approval, setApproval] = useState({ decision: 'eligible', note: '' })
  const [planForm, setPlanForm] = useState({ frequencyPerWeek: '3', durationHours: '', bloodFlowRate: '', dialyzerType: '', heparinDose: '', dryWeightKg: '' })

  const [sched, setSched] = useState({ machineId: 'M1', nurseId: '', scheduledStartAt: '', scheduledEndAt: '' })

  const canSchedule = useMemo(()=> approvalStatus === 'eligible' && !!plan?._id, [approvalStatus, plan?._id])

  useEffect(()=>{ if (id) loadAll() }, [id])

  async function loadAll(){
    setLoading(true)
    try {
      const res: any = await hospitalApi.dialysisGetPatient(String(id)).catch(()=>null)
      setDp(res?.dialysisPatient || null)
      setPatient(res?.patient || null)
      setPlan(res?.activePlan || null)

      const pl: any = await hospitalApi.dialysisListPlans(String(id)).catch(()=>({ plans: [] }))
      setPlans(Array.isArray(pl?.plans) ? pl.plans : [])

      const ss: any = await hospitalApi.dialysisListSessions({ dialysisPatientId: String(id), limit: 100 }).catch(()=>({ sessions: [] }))
      setSessions(Array.isArray(ss?.sessions) ? ss.sessions : [])

      try {
        const s = res?.dialysisPatient?.screening || {}
        setScreening({
          weightKg: s.weightKg != null ? String(s.weightKg) : '',
          bp: String(s.bp || ''),
          pulse: s.pulse != null ? String(s.pulse) : '',
          accessType: String(s.accessType || ''),
        })
        const dw = res?.activePlan?.dryWeightKg
        setPlanForm(v => ({ ...v, dryWeightKg: dw != null ? String(dw) : v.dryWeightKg }))
      } catch {}
    } finally { setLoading(false) }
  }

  async function saveScreening(){
    if (!id) return
    const body: any = {
      weightKg: Number(screening.weightKg || 0),
      bp: screening.bp || undefined,
      pulse: screening.pulse ? Number(screening.pulse) : undefined,
      accessType: screening.accessType || undefined,
      recordedAt: new Date().toISOString(),
    }
    await hospitalApi.dialysisRecordScreening(String(id), body)
    await loadAll()
  }

  async function saveApproval(){
    if (!id) return
    const body: any = {
      decision: approval.decision,
      note: approval.note || undefined,
      decidedAt: new Date().toISOString(),
    }
    await hospitalApi.dialysisApprove(String(id), body)
    await loadAll()
  }

  async function savePlan(){
    if (!id) return
    const freq = parseInt(String(planForm.frequencyPerWeek || '').trim(), 10)
    const dry = parseFloat(String(planForm.dryWeightKg || '').trim())
    const dur = String(planForm.durationHours || '').trim()
    const bfr = String(planForm.bloodFlowRate || '').trim()

    if (!Number.isFinite(freq) || freq < 1){
      try { window.alert('Frequency per week must be a number (min 1).') } catch {}
      return
    }
    if (!Number.isFinite(dry) || dry < 0){
      try { window.alert('Dry weight (kg) must be a valid number.') } catch {}
      return
    }

    const durationHours = dur ? parseFloat(dur) : undefined
    if (durationHours != null && !Number.isFinite(durationHours)){
      try { window.alert('Duration (hours) must be a valid number.') } catch {}
      return
    }

    const bloodFlowRate = bfr ? parseFloat(bfr) : undefined
    if (bloodFlowRate != null && !Number.isFinite(bloodFlowRate)){
      try { window.alert('Blood flow rate must be a valid number.') } catch {}
      return
    }

    const body: any = {
      frequencyPerWeek: freq,
      durationHours,
      bloodFlowRate,
      dialyzerType: planForm.dialyzerType || undefined,
      heparinDose: planForm.heparinDose || undefined,
      dryWeightKg: dry,
    }
    try {
      await hospitalApi.dialysisCreatePlan(String(id), body)
      await loadAll()
    } catch (e: any) {
      const msg = String(e?.message || e?.error || 'Failed to save plan')
      try { window.alert(msg) } catch {}
    }
  }

  async function doSchedule(){
    if (!id) return
    if (!sched.scheduledStartAt || !sched.scheduledEndAt) return
    const body: any = {
      machineId: sched.machineId,
      nurseId: sched.nurseId || undefined,
      scheduledStartAt: new Date(sched.scheduledStartAt).toISOString(),
      scheduledEndAt: new Date(sched.scheduledEndAt).toISOString(),
    }
    await hospitalApi.dialysisScheduleSession(String(id), body)
    setSched(v => ({ ...v, scheduledStartAt: '', scheduledEndAt: '' }))
    await loadAll()
  }

  function openSession(s: any){
    const sid = String(s?._id || '')
    if (!sid) return
    navigate(`/hospital/dialysis/session/${encodeURIComponent(sid)}`)
  }

  return (
    <div className="w-full px-4 md:px-6 py-6 space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-2xl font-bold text-slate-900">Dialysis Patient</div>
          <div className="text-sm text-slate-600">{patient ? `${patient.fullName || ''} · MRN ${patient.mrn || ''}` : ''}</div>
        </div>
        <div className="flex gap-2">
          <button className="btn-outline-navy" onClick={()=>navigate('/hospital/dialysis')}>Back</button>
          <button className="btn-outline-navy" onClick={()=>navigate(`/hospital/dialysis/patient/${encodeURIComponent(String(id))}/history`)}>History</button>
          <button className="btn-outline-navy" onClick={()=>navigate('/hospital/dialysis/reports')}>Reports</button>
        </div>
      </div>

      {loading && <div className="text-sm text-slate-600">Loading...</div>}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
          <div className="text-base font-semibold text-slate-900">Screening (Nurse)</div>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-slate-700">Weight (kg)</label>
              <input value={screening.weightKg} onChange={e=>setScreening(v=>({ ...v, weightKg: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-700">BP</label>
              <input value={screening.bp} onChange={e=>setScreening(v=>({ ...v, bp: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="120/80" />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-700">Pulse</label>
              <input value={screening.pulse} onChange={e=>setScreening(v=>({ ...v, pulse: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-700">Access Type</label>
              <input value={screening.accessType} onChange={e=>setScreening(v=>({ ...v, accessType: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="AVF / CVC" />
            </div>
          </div>
          <div className="flex justify-end">
            <button className="btn" onClick={saveScreening}>Save Screening</button>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
          <div className="text-base font-semibold text-slate-900">Approval (Doctor)</div>
          <div className="text-sm text-slate-600">Status: <span className="font-semibold text-slate-900">{approvalStatus}</span></div>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-slate-700">Decision</label>
              <select value={approval.decision} onChange={e=>setApproval(v=>({ ...v, decision: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
                <option value="eligible">Eligible</option>
                <option value="not_eligible">Not Eligible</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-700">Note</label>
              <input value={approval.note} onChange={e=>setApproval(v=>({ ...v, note: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Optional" />
            </div>
          </div>
          <div className="flex justify-end">
            <button className="btn" onClick={saveApproval}>Save Approval</button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
          <div className="text-base font-semibold text-slate-900">Dialysis Plan (Doctor)</div>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-slate-700">Frequency / week</label>
              <input value={planForm.frequencyPerWeek} onChange={e=>setPlanForm(v=>({ ...v, frequencyPerWeek: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-700">Duration (hours)</label>
              <input value={planForm.durationHours} onChange={e=>setPlanForm(v=>({ ...v, durationHours: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-700">Blood Flow Rate</label>
              <input value={planForm.bloodFlowRate} onChange={e=>setPlanForm(v=>({ ...v, bloodFlowRate: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-700">Dialyzer Type</label>
              <input value={planForm.dialyzerType} onChange={e=>setPlanForm(v=>({ ...v, dialyzerType: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-700">Heparin Dose</label>
              <input value={planForm.heparinDose} onChange={e=>setPlanForm(v=>({ ...v, heparinDose: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-700">Dry Weight (kg)</label>
              <input value={planForm.dryWeightKg} onChange={e=>setPlanForm(v=>({ ...v, dryWeightKg: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="flex justify-end">
            <button className="btn" onClick={savePlan} disabled={approvalStatus !== 'eligible'}>Save Plan</button>
          </div>
          <div className="text-xs text-slate-500">Active plan required before session start.</div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
          <div className="text-base font-semibold text-slate-900">Schedule Session (Reception)</div>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-slate-700">Machine</label>
              <input value={sched.machineId} onChange={e=>setSched(v=>({ ...v, machineId: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="M1" />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-700">Assigned Nurse (optional)</label>
              <input value={sched.nurseId} onChange={e=>setSched(v=>({ ...v, nurseId: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Nurse ID" />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-700">Start</label>
              <input type="datetime-local" value={sched.scheduledStartAt} onChange={e=>setSched(v=>({ ...v, scheduledStartAt: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-700">End</label>
              <input type="datetime-local" value={sched.scheduledEndAt} onChange={e=>setSched(v=>({ ...v, scheduledEndAt: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="flex justify-end">
            <button className="btn" onClick={doSchedule} disabled={!canSchedule}>Schedule</button>
          </div>
          {!canSchedule && (
            <div className="text-xs text-rose-700">Cannot schedule unless patient is approved and has an active plan.</div>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
        <div className="text-base font-semibold text-slate-900">Sessions</div>
        <div className="border rounded-md overflow-auto">
          <table className="min-w-[1000px] w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Machine</th>
                <th className="px-3 py-2 text-left">Start</th>
                <th className="px-3 py-2 text-left">End</th>
                <th className="px-3 py-2 text-left">Nurse</th>
                <th className="px-3 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {sessions.length === 0 && (
                <tr><td colSpan={6} className="px-3 py-6 text-slate-500">No sessions scheduled.</td></tr>
              )}
              {sessions.map(s => (
                <tr key={String(s._id)} className="border-t">
                  <td className="px-3 py-2 font-medium">{s.status}</td>
                  <td className="px-3 py-2">{s.machineId}</td>
                  <td className="px-3 py-2">{fmtDT(s.scheduledStartAt)}</td>
                  <td className="px-3 py-2">{fmtDT(s.scheduledEndAt)}</td>
                  <td className="px-3 py-2">{s.nurseId || '-'}</td>
                  <td className="px-3 py-2"><button className="btn-outline-navy text-xs" onClick={()=>openSession(s)}>Open</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
        <div className="text-base font-semibold text-slate-900">Plan History</div>
        <div className="border rounded-md overflow-auto">
          <table className="min-w-[900px] w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left">Active</th>
                <th className="px-3 py-2 text-left">Frequency</th>
                <th className="px-3 py-2 text-left">Dry Weight</th>
                <th className="px-3 py-2 text-left">Dialyzer</th>
                <th className="px-3 py-2 text-left">Created</th>
              </tr>
            </thead>
            <tbody>
              {plans.length === 0 && (
                <tr><td colSpan={5} className="px-3 py-6 text-slate-500">No plan history.</td></tr>
              )}
              {plans.map(p => (
                <tr key={String(p._id)} className="border-t">
                  <td className="px-3 py-2">{p.active ? 'Yes' : 'No'}</td>
                  <td className="px-3 py-2">{p.frequencyPerWeek || '-'}</td>
                  <td className="px-3 py-2">{p.dryWeightKg != null ? String(p.dryWeightKg) : '-'}</td>
                  <td className="px-3 py-2">{p.dialyzerType || '-'}</td>
                  <td className="px-3 py-2">{fmtDT(p.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
