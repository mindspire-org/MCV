import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { hospitalApi } from '../../utils/api'

export default function Hospital_DialysisReports(){
  const navigate = useNavigate()
  const [mrn, setMrn] = useState('')
  const [history, setHistory] = useState<any[]>([])

  const [msg, setMsg] = useState<{ type: 'info' | 'error' | 'success'; text: string } | null>(null)

  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [completed, setCompleted] = useState<number | null>(null)
  const [remaining, setRemaining] = useState<number | null>(null)

  const [cons, setCons] = useState<any[]>([])

  useEffect(()=>{
    setHistory([])
  }, [])

  function showMessage(type: 'info' | 'error' | 'success', text: string){
    setMsg({ type, text })
    try {
      window.clearTimeout((showMessage as any)._t)
      ;(showMessage as any)._t = window.setTimeout(() => setMsg(null), 4000)
    } catch {}
  }

  async function loadHistory(){
    const m = mrn.trim()
    if (!m){
      showMessage('info', 'Please enter MRN to load patient history.')
      return
    }
    try {
      const res: any = await hospitalApi.dialysisReportPatientHistory({ mrn: m || undefined })
      setHistory(Array.isArray(res?.sessions) ? res.sessions : [])
      showMessage('success', 'Patient history loaded.')
    } catch (e: any){
      showMessage('error', e?.message || 'Failed to load history')
      setHistory([])
    }
  }

  async function loadCompleted(){
    try {
      const m = mrn.trim()
      const res: any = await hospitalApi.dialysisReportSessionsCompleted({ from: from || undefined, to: to || undefined, mrn: m || undefined } as any)
      setCompleted(res?.totalCompleted != null ? Number(res.totalCompleted) : null)
      setRemaining(res?.totalRemaining != null ? Number(res.totalRemaining) : null)
      showMessage('success', 'Sessions count loaded.')
    } catch (e: any){
      showMessage('error', e?.message || 'Failed to load sessions count')
      setCompleted(null)
      setRemaining(null)
    }
  }

  async function loadConsumables(){
    try {
      const res: any = await hospitalApi.dialysisReportConsumablesUsed({ from: from || undefined, to: to || undefined, mrn: mrn.trim() || undefined, limit: 200 })
      setCons(Array.isArray(res?.items) ? res.items : [])
      showMessage('success', 'Consumables loaded.')
    } catch (e: any){
      showMessage('error', e?.message || 'Failed to load consumables')
      setCons([])
    }
  }

  return (
    <div className="w-full px-4 md:px-6 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-2xl font-bold text-slate-900">Dialysis Reports</div>
          <div className="text-sm text-slate-600">Patient history, sessions completed and consumables used.</div>
        </div>
        <button className="btn-outline-navy" onClick={()=>navigate('/hospital/dialysis')}>Back</button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
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
          <div>
            <label className="mb-1 block text-sm text-slate-700">MRN</label>
            <input value={mrn} onChange={e=>setMrn(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="MRN" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-700">From (optional)</label>
            <input type="date" value={from} onChange={e=>setFrom(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-700">To (optional)</label>
            <input type="date" value={to} onChange={e=>setTo(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </div>
        </div>

        <div className="flex flex-wrap gap-2 justify-end">
          <button className="btn-outline-navy" onClick={loadCompleted}>Sessions Completed</button>
          <button className="btn-outline-navy" onClick={loadHistory}>Patient History</button>
          <button className="btn-outline-navy" onClick={loadConsumables}>Consumables Used</button>
        </div>

        {(completed != null || remaining != null) && (
          <div className="text-sm text-slate-700">
            {completed != null && (
              <span>Completed Sessions: <span className="font-semibold text-slate-900">{completed}</span></span>
            )}
            {remaining != null && (
              <span className={completed != null ? 'ml-4' : ''}>Remaining Sessions: <span className="font-semibold text-slate-900">{remaining}</span></span>
            )}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
        <div className="text-base font-semibold text-slate-900">Patient Dialysis History</div>
        <div className="border rounded-md overflow-auto">
          <table className="min-w-[900px] w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Machine</th>
                <th className="px-3 py-2 text-left">Scheduled</th>
                <th className="px-3 py-2 text-left">Started</th>
                <th className="px-3 py-2 text-left">Completed</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr><td colSpan={5} className="px-3 py-6 text-slate-500">No history loaded.</td></tr>
              ) : history.map((s: any) => (
                <tr key={String(s._id)} className="border-t">
                  <td className="px-3 py-2">{s.status}</td>
                  <td className="px-3 py-2">{s.machineId}</td>
                  <td className="px-3 py-2">{new Date(s.scheduledStartAt).toLocaleString()}</td>
                  <td className="px-3 py-2">{s.startedAt ? new Date(s.startedAt).toLocaleString() : '-'}</td>
                  <td className="px-3 py-2">{s.completedAt ? new Date(s.completedAt).toLocaleString() : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
        <div className="text-base font-semibold text-slate-900">Consumables Used</div>
        <div className="border rounded-md overflow-auto">
          <table className="min-w-[900px] w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left">Session</th>
                <th className="px-3 py-2 text-left">Item</th>
                <th className="px-3 py-2 text-right">Qty</th>
                <th className="px-3 py-2 text-right">Unit Cost</th>
                <th className="px-3 py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {cons.length === 0 ? (
                <tr><td colSpan={5} className="px-3 py-6 text-slate-500">No consumables loaded.</td></tr>
              ) : cons.map((c: any) => (
                <tr key={String(c._id)} className="border-t">
                  <td className="px-3 py-2">{String(c.sessionId || '-')}</td>
                  <td className="px-3 py-2">{c.itemName || '-'}</td>
                  <td className="px-3 py-2 text-right">{Number(c.qty || 0)}</td>
                  <td className="px-3 py-2 text-right">{Number(c.unitCost || 0).toFixed(2)}</td>
                  <td className="px-3 py-2 text-right">{Number(c.amount || 0).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
