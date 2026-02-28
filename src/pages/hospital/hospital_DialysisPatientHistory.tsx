import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { hospitalApi } from '../../utils/api'

function fmtDT(d?: any){
  try {
    if (!d) return '-'
    const dt = new Date(d)
    if (isNaN(dt.getTime())) return '-'
    return dt.toLocaleString()
  } catch { return '-' }
}

export default function Hospital_DialysisPatientHistory(){
  const { id = '' } = useParams()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(false)
  const [dp, setDp] = useState<any>(null)
  const [patient, setPatient] = useState<any>(null)
  const [plan, setPlan] = useState<any>(null)

  const [upcoming, setUpcoming] = useState<any[]>([])
  const [completed, setCompleted] = useState<any[]>([])

  const [selectedSessionId, setSelectedSessionId] = useState<string>('')
  const [sessionDetails, setSessionDetails] = useState<any>(null)

  const [msg, setMsg] = useState<{ type: 'info'|'error'|'success'; text: string } | null>(null)

  const title = useMemo(()=>{
    const name = patient?.fullName ? String(patient.fullName) : ''
    const mrn = patient?.mrn ? String(patient.mrn) : ''
    return name && mrn ? `${name} · MRN ${mrn}` : (name || mrn || 'Dialysis Patient')
  }, [patient?.fullName, patient?.mrn])

  function showMessage(type: 'info'|'error'|'success', text: string){
    setMsg({ type, text })
    try {
      window.clearTimeout((showMessage as any)._t)
      ;(showMessage as any)._t = window.setTimeout(() => setMsg(null), 3500)
    } catch {}
  }

  async function loadAll(){
    if (!id) return
    setLoading(true)
    try {
      const res: any = await hospitalApi.dialysisGetPatient(String(id))
      setDp(res?.dialysisPatient || null)
      setPatient(res?.patient || null)
      setPlan(res?.activePlan || null)

      const [up, done] = await Promise.all([
        hospitalApi.dialysisListSessions({ dialysisPatientId: String(id), status: 'scheduled', limit: 200 } as any).catch(()=>({ sessions: [] })),
        hospitalApi.dialysisListSessions({ dialysisPatientId: String(id), status: 'completed', limit: 500 } as any).catch(()=>({ sessions: [] })),
      ])

      setUpcoming(Array.isArray(up?.sessions) ? up.sessions : [])
      setCompleted(Array.isArray(done?.sessions) ? done.sessions : [])

      if ((up?.sessions || []).length === 0 && (done?.sessions || []).length === 0) showMessage('info', 'No sessions found for this patient.')
    } catch (e: any){
      showMessage('error', e?.message || e?.error || 'Failed to load patient history')
      setUpcoming([])
      setCompleted([])
    } finally {
      setLoading(false)
    }
  }

  async function loadSessionDetails(sessionId: string){
    const sid = String(sessionId || '')
    if (!sid) return
    setSelectedSessionId(sid)
    setSessionDetails(null)
    try {
      const res: any = await hospitalApi.dialysisGetSession(sid)
      setSessionDetails(res || null)
    } catch (e: any){
      showMessage('error', e?.message || e?.error || 'Failed to load session details')
    }
  }

  useEffect(()=>{ loadAll() }, [id])

  return (
    <div className="w-full px-4 md:px-6 py-6 space-y-5">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-2xl font-bold text-slate-900">Dialysis Patient Profile</div>
          <div className="text-sm text-slate-600">{title}</div>
        </div>
        <div className="flex gap-2">
          <button className="btn-outline-navy" onClick={()=>navigate(`/hospital/dialysis/patient/${encodeURIComponent(String(id))}`)}>Back</button>
          <button className="btn-outline-navy" onClick={loadAll} disabled={loading}>{loading ? 'Loading...' : 'Refresh'}</button>
        </div>
      </div>

      {msg && (
        <div className={
          msg.type === 'error'
            ? 'rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800'
            : msg.type === 'success'
              ? 'rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800'
              : 'rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800'
        }>
          <div className="flex items-start justify-between gap-3">
            <div>{msg.text}</div>
            <button type="button" className="text-slate-600 hover:text-slate-900" onClick={()=>setMsg(null)}>×</button>
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
            <div className="text-base font-semibold text-slate-900">Active Plan</div>
            <div className="grid gap-2 md:grid-cols-3 text-sm">
              <div><span className="text-slate-500">Frequency/week:</span> <span className="font-medium">{plan?.frequencyPerWeek ?? '-'}</span></div>
              <div><span className="text-slate-500">Dry weight:</span> <span className="font-medium">{plan?.dryWeightKg ?? '-'}</span></div>
              <div><span className="text-slate-500">Dialyzer:</span> <span className="font-medium">{plan?.dialyzerType || '-'}</span></div>
            </div>
            <div className="text-xs text-slate-500">Approval: {String(dp?.approvalStatus || '-')}</div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-base font-semibold text-slate-900">Upcoming Sessions</div>
              <button className="btn-outline-navy text-xs" onClick={()=>navigate(`/hospital/dialysis/patient/${encodeURIComponent(String(id))}`)}>Schedule</button>
            </div>
            <div className="border rounded-md overflow-auto">
              <table className="min-w-[900px] w-full text-sm">
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
                  {upcoming.length === 0 && (
                    <tr><td colSpan={6} className="px-3 py-6 text-slate-500">No upcoming sessions.</td></tr>
                  )}
                  {upcoming.map(s => (
                    <tr key={String(s._id)} className="border-t">
                      <td className="px-3 py-2 font-medium">{s.status}</td>
                      <td className="px-3 py-2">{s.machineId}</td>
                      <td className="px-3 py-2">{fmtDT(s.scheduledStartAt)}</td>
                      <td className="px-3 py-2">{fmtDT(s.scheduledEndAt)}</td>
                      <td className="px-3 py-2">{s.nurseId || '-'}</td>
                      <td className="px-3 py-2">
                        <div className="flex justify-end gap-2">
                          <button className="btn-outline-navy text-xs" onClick={()=>navigate(`/hospital/dialysis/session/${encodeURIComponent(String(s._id))}`)}>Open</button>
                          <button className="btn-outline-navy text-xs" onClick={()=>loadSessionDetails(String(s._id))}>Details</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
            <div className="text-base font-semibold text-slate-900">Completed Sessions (History)</div>
            <div className="border rounded-md overflow-auto">
              <table className="min-w-[950px] w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 text-left">Completed At</th>
                    <th className="px-3 py-2 text-left">Machine</th>
                    <th className="px-3 py-2 text-left">Duration</th>
                    <th className="px-3 py-2 text-left">UF Target</th>
                    <th className="px-3 py-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {completed.length === 0 && (
                    <tr><td colSpan={5} className="px-3 py-6 text-slate-500">No completed sessions.</td></tr>
                  )}
                  {completed.map(s => (
                    <tr key={String(s._id)} className="border-t">
                      <td className="px-3 py-2">{fmtDT(s.completedAt || s.scheduledEndAt)}</td>
                      <td className="px-3 py-2">{s.machineId || '-'}</td>
                      <td className="px-3 py-2">{s.completion?.durationMinutes != null ? `${s.completion.durationMinutes} min` : '-'}</td>
                      <td className="px-3 py-2">{s.pre?.fluidRemovalTargetKg != null ? String(s.pre.fluidRemovalTargetKg) : '-'}</td>
                      <td className="px-3 py-2">
                        <div className="flex justify-end gap-2">
                          <button className="btn-outline-navy text-xs" onClick={()=>navigate(`/hospital/dialysis/session/${encodeURIComponent(String(s._id))}`)}>Open</button>
                          <button className="btn-outline-navy text-xs" onClick={()=>loadSessionDetails(String(s._id))}>Details</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
            <div className="text-base font-semibold text-slate-900">Session Details</div>
            {!selectedSessionId && (
              <div className="text-sm text-slate-500">Select a session and click Details.</div>
            )}
            {selectedSessionId && !sessionDetails && (
              <div className="text-sm text-slate-500">Loading session details...</div>
            )}
            {sessionDetails && (
              <div className="space-y-4">
                <div className="text-sm">
                  <div><span className="text-slate-500">Session:</span> <span className="font-medium">{String(sessionDetails?.session?._id || selectedSessionId)}</span></div>
                  <div><span className="text-slate-500">Status:</span> <span className="font-medium">{String(sessionDetails?.session?.status || '-')}</span></div>
                  <div><span className="text-slate-500">Monitoring count:</span> <span className="font-medium">{String(sessionDetails?.monitoringCount ?? '-')}</span></div>
                </div>

                <div>
                  <div className="text-sm font-semibold text-slate-900 mb-2">Consumables</div>
                  <div className="border rounded-md overflow-auto">
                    <table className="min-w-[420px] w-full text-xs">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-2 py-2 text-left">Item</th>
                          <th className="px-2 py-2 text-right">Qty</th>
                          <th className="px-2 py-2 text-right">Unit</th>
                          <th className="px-2 py-2 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(sessionDetails?.consumables || []).length === 0 && (
                          <tr><td colSpan={4} className="px-2 py-4 text-slate-500">No consumables.</td></tr>
                        )}
                        {(sessionDetails?.consumables || []).map((c: any) => (
                          <tr key={String(c?._id || `${c.itemId}-${c.itemName}`)} className="border-t">
                            <td className="px-2 py-2">{c.itemName || c.itemId || '-'}</td>
                            <td className="px-2 py-2 text-right">{c.qty ?? '-'}</td>
                            <td className="px-2 py-2 text-right">{c.unitCost != null ? Number(c.unitCost).toFixed(2) : '-'}</td>
                            <td className="px-2 py-2 text-right">{c.amount != null ? Number(c.amount).toFixed(2) : '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div>
                  <div className="text-sm font-semibold text-slate-900 mb-2">Billing</div>
                  {sessionDetails?.billing ? (
                    <div className="text-sm space-y-1">
                      <div><span className="text-slate-500">Status:</span> <span className="font-medium">{String(sessionDetails.billing.status || '-')}</span></div>
                      <div><span className="text-slate-500">Subtotal:</span> <span className="font-medium">{sessionDetails.billing.subtotal != null ? Number(sessionDetails.billing.subtotal).toFixed(2) : '-'}</span></div>
                      <div className="text-xs text-slate-500">(Finance integration is next.)</div>
                    </div>
                  ) : (
                    <div className="text-sm text-slate-500">No billing record.</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
