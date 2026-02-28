import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { hospitalApi } from '../../utils/api'

function fmtDT(d?: any){
  try {
    if (!d) return '-'
    const dt = new Date(d)
    if (isNaN(dt.getTime())) return '-'
    return dt.toLocaleString()
  } catch { return '-' }
}

export default function Hospital_DialysisActivePatients(){
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ type: 'info'|'error'|'success'; text: string } | null>(null)

  const trimmed = useMemo(()=> q.trim(), [q])

  function showMessage(type: 'info'|'error'|'success', text: string){
    setMsg({ type, text })
    try {
      window.clearTimeout((showMessage as any)._t)
      ;(showMessage as any)._t = window.setTimeout(() => setMsg(null), 3500)
    } catch {}
  }

  async function load(){
    setLoading(true)
    try {
      const res: any = await hospitalApi.dialysisListActivePatients({ q: trimmed || undefined, limit: 500 } as any)
      setRows(Array.isArray(res?.items) ? res.items : [])
      if ((res?.items || []).length === 0) showMessage('info', 'No active dialysis patients found.')
    } catch (e: any){
      showMessage('error', e?.message || 'Failed to load active patients')
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(()=>{ load() }, [])

  useEffect(()=>{
    const t = window.setTimeout(()=>{ load() }, 250)
    return ()=> window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trimmed])

  return (
    <div className="w-full px-4 md:px-6 py-6 space-y-5">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-2xl font-bold text-slate-900">Dialysis Active Patients</div>
          <div className="text-sm text-slate-600">Eligible patients with an active plan, weekly remaining sessions, and next schedule.</div>
        </div>
        <div className="flex gap-2">
          <button className="btn-outline-navy" onClick={()=>navigate('/hospital/dialysis')}>Back</button>
          <button className="btn-outline-navy" onClick={load} disabled={loading}>{loading ? 'Loading...' : 'Refresh'}</button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
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

        <div className="grid gap-3 md:grid-cols-3">
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm text-slate-700">Search (MRN / Name / Phone)</label>
            <input value={q} onChange={e=>setQ(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Type to search..." />
          </div>
          <div className="flex items-end justify-end">
            <button className="btn-outline-navy" onClick={()=>navigate('/hospital/dialysis/reports')}>Reports</button>
          </div>
        </div>

        <div className="border rounded-md overflow-auto">
          <table className="min-w-[1100px] w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left">MRN</th>
                <th className="px-3 py-2 text-left">Name</th>
                <th className="px-3 py-2 text-left">Phone</th>
                <th className="px-3 py-2 text-left">Age/Gender</th>
                <th className="px-3 py-2 text-right">Plan/Wk</th>
                <th className="px-3 py-2 text-right">Done (Wk)</th>
                <th className="px-3 py-2 text-right">Remain (Wk)</th>
                <th className="px-3 py-2 text-left">Next Session</th>
                <th className="px-3 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={9} className="px-3 py-6 text-slate-500">Loading...</td></tr>
              )}
              {!loading && rows.length === 0 && (
                <tr><td colSpan={9} className="px-3 py-6 text-slate-500">No active patients.</td></tr>
              )}
              {!loading && rows.map((r: any) => (
                <tr key={String(r.dialysisPatientId)} className="border-t">
                  <td className="px-3 py-2 font-medium text-slate-900">{r.mrn || '-'}</td>
                  <td className="px-3 py-2">{r.fullName || '-'}</td>
                  <td className="px-3 py-2">{r.phoneNormalized || '-'}</td>
                  <td className="px-3 py-2">{String(r.age ?? '-')} / {String(r.gender ?? '-')}</td>
                  <td className="px-3 py-2 text-right">{r.frequencyPerWeek != null ? String(r.frequencyPerWeek) : '-'}</td>
                  <td className="px-3 py-2 text-right">{r.completedThisWeek != null ? String(r.completedThisWeek) : '-'}</td>
                  <td className="px-3 py-2 text-right">{r.remainingThisWeek != null ? String(r.remainingThisWeek) : '-'}</td>
                  <td className="px-3 py-2">{r.nextSessionAt ? `${fmtDT(r.nextSessionAt)}${r.nextMachineId ? ` (${r.nextMachineId})` : ''}` : '-'}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-2 justify-end">
                      <button className="btn-outline-navy text-xs" onClick={()=>navigate(`/hospital/dialysis/patient/${encodeURIComponent(String(r.dialysisPatientId))}`)}>Open</button>
                      {r.nextSessionId && (
                        <button className="btn-outline-navy text-xs" onClick={()=>navigate(`/hospital/dialysis/session/${encodeURIComponent(String(r.nextSessionId))}`)}>Next Session</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
