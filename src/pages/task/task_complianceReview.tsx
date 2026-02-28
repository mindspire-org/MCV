import { useEffect, useMemo, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { hospitalApi } from '../../utils/api'
import { loadSession, seedIfNeeded } from './task_store'
import { CheckCircle2, Search, XCircle } from 'lucide-react'

function hasHospitalToken(){
  try { return !!(localStorage.getItem('hospital.token') || localStorage.getItem('token')) } catch { return false }
}

export default function Task_ComplianceReview(){
  const navigate = useNavigate()
  const [session, setSession] = useState<any>(null)
  const [q, setQ] = useState('')
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [actionId, setActionId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  useEffect(()=>{
    try { seedIfNeeded() } catch {}
    const s = loadSession()
    setSession(s)
    if (!s) { navigate('/task/login', { replace: true }); return }
    if (!s.isAdmin) { navigate('/task', { replace: true }); return }
  }, [navigate])

  useEffect(()=>{
    if (!session) return
    if (!hasHospitalToken()) {
      setError('Hospital login token not found. Please login to Hospital portal first.')
      return
    }
    const run = async ()=>{
      setLoading(true)
      setError(null)
      try{
        const data: any = await hospitalApi.complianceListTasks({ status: 'submitted' })
        setItems(Array.isArray(data?.items) ? data.items : [])
      }catch(e: any){
        setError(e?.message || 'Failed to load submissions')
      }finally{
        setLoading(false)
      }
    }
    run()
  }, [session])

  const filtered = useMemo(()=>{
    const qq = q.trim().toLowerCase()
    if (!qq) return items
    return items.filter(it => (`${it.name||''} ${it.category||''} ${it.assignedToUsername||''}`).toLowerCase().includes(qq))
  }, [items, q])

  const approve = async (taskId: string)=>{
    setActionId(taskId)
    setError(null)
    try{
      await hospitalApi.complianceReviewTask(taskId, { status: 'approved' })
      const data: any = await hospitalApi.complianceListTasks({ status: 'submitted' })
      setItems(Array.isArray(data?.items) ? data.items : [])
    }catch(e: any){
      setError(e?.message || 'Approve failed')
    }finally{
      setActionId(null)
    }
  }

  const reject = async (taskId: string)=>{
    const reason = rejectReason.trim()
    if (!reason) { setError('Reject reason is required'); return }
    setActionId(taskId)
    setError(null)
    try{
      await hospitalApi.complianceReviewTask(taskId, { status: 'rejected', reason })
      setRejectReason('')
      const data: any = await hospitalApi.complianceListTasks({ status: 'submitted' })
      setItems(Array.isArray(data?.items) ? data.items : [])
    }catch(e: any){
      setError(e?.message || 'Reject failed')
    }finally{
      setActionId(null)
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 md:px-6 py-6 space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-2xl font-extrabold tracking-tight text-slate-900">Evidence Review</div>
          <div className="text-sm text-slate-600">Approve or reject submitted checklists (reason required for rejection)</div>
        </div>
        <div className="flex gap-2">
          <button className="btn-outline-navy" onClick={()=>navigate('/task/compliance')}>Compliance Tasks</button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div className="relative">
          <Search className="size-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={q} onChange={e=>setQ(e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 py-2 text-sm" placeholder="Search submissions..." />
        </div>

        <div>
          <label className="mb-1 block text-sm text-slate-700">Reject reason (required)</label>
          <input value={rejectReason} onChange={e=>setRejectReason(e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm" placeholder="e.g. Image not clear / checklist incomplete" />
        </div>

        {loading ? (
          <div className="text-sm text-slate-600">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5">
            <div className="text-sm font-semibold text-slate-900">No submitted tasks</div>
            <div className="mt-1 text-sm text-slate-600">When staff submits tasks, they appear here for review.</div>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((it: any) => (
              <div key={it._id} className="py-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <div className="font-semibold text-slate-900 truncate">{it.name}</div>
                  <div className="text-xs text-slate-500">Assigned to: {it.assignedToUsername || it.assignedToId} · Due: {it.deadlineIso}</div>
                  <div className="mt-2">
                    <NavLink to={`/task/compliance/tasks/${it._id}`} className="btn-outline-navy text-sm">Open submission</NavLink>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2">
                  <button disabled={actionId === it._id} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50" onClick={()=>approve(String(it._id))}>
                    <CheckCircle2 className="size-4 text-emerald-700" />
                    Approve
                  </button>
                  <button disabled={actionId === it._id} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50" onClick={()=>reject(String(it._id))}>
                    <XCircle className="size-4 text-rose-700" />
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
