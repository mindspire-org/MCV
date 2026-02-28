import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { hospitalApi } from '../../utils/api'
import { loadSession, seedIfNeeded } from './task_store'
import { Plus, RefreshCw, Trash2 } from 'lucide-react'
import Task_SearchableSelect from './task_SearchableSelect'

function useQuery(){
  const { search } = useLocation()
  return useMemo(()=> new URLSearchParams(search), [search])
}

export default function Task_MaintenancePlans(){
  const navigate = useNavigate()
  const qs = useQuery()
  const assetIdPrefill = String(qs.get('assetId') || '')

  const [session, setSession] = useState<any>(null)
  const isAdmin = !!session?.isAdmin

  const [cats, setCats] = useState<any[]>([])
  const [assets, setAssets] = useState<any[]>([])
  const [plans, setPlans] = useState<any[]>([])
  const [roleOptions, setRoleOptions] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const loadingRef = useRef(false)

  const [create, setCreate] = useState({
    assetId: assetIdPrefill,
    title: '',
    instructions: '',
    role: '',
    recurrence: 'daily' as 'none'|'daily'|'weekly'|'monthly'|'every_n_days',
    intervalDays: 7,
    assignmentStrategy: 'round_robin' as 'round_robin'|'fixed'|'least_loaded',
    fixedStaffIdsRaw: '',
    enabled: true,
  })

  useEffect(()=>{
    try { seedIfNeeded() } catch {}
    const s = loadSession()
    setSession(s)
    if (!s) { navigate('/task/login', { replace: true }); return }
    if (!s.isAdmin) { navigate('/task', { replace: true }); return }
  }, [navigate])

  async function loadAll(){
    if (loadingRef.current) return
    loadingRef.current = true
    setLoading(true)
    setError(null)
    try{
      const c: any = await hospitalApi.maintenanceListCategories()
      setCats(Array.isArray(c?.items) ? c.items : [])

      const a: any = await hospitalApi.maintenanceListAssets({ limit: 500 })
      setAssets(Array.isArray(a?.items) ? a.items : [])

      const p: any = await hospitalApi.maintenanceListPlans({ assetId: create.assetId || undefined, limit: 500 })
      setPlans(Array.isArray(p?.items) ? p.items : [])

      try {
        const st: any = await (hospitalApi as any).listStaff()
        const rows: any[] = Array.isArray(st?.staff) ? st.staff : (Array.isArray(st?.items) ? st.items : [])
        const roles = Array.from(
          new Set(rows.map(r => String(r?.role || r?.position || '').trim()).filter(Boolean))
        ).sort((x, y) => x.localeCompare(y))
        setRoleOptions(roles)
      } catch {
        setRoleOptions([])
      }
    } catch(e: any){
      const msg = String(e?.message || 'Failed to load')
      if (/unauthorized|forbidden/i.test(msg)) setError('Access denied. Login to Hospital portal or set Admin Key in Backup/Settings.')
      else setError(msg)
    }
    finally{
      setLoading(false)
      loadingRef.current = false
    }
  }

  useEffect(()=>{
    if (!session) return
    if (!isAdmin) return
    void loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, isAdmin, create.assetId])

  const catHint = useMemo(()=>{
    if (!create.assetId) return null
    const a = assets.find(x => String(x?._id||'') === String(create.assetId||''))
    if (!a) return null
    const cat = cats.find(c => String(c?._id||'') === String(a?.categoryId||''))
    return cat || null
  }, [create.assetId, assets, cats])

  const assetName = (id: any)=> assets.find(x => String(x?._id||'') === String(id||''))?.name || '-'
  const assetOptions = useMemo(()=>([
    { value: '', label: 'Select asset' },
    ...assets.map(a => ({ value: String(a._id), label: String(a.name || 'Asset') })),
  ]), [assets])

  const roleSelectOptions = useMemo(() => {
    const seen = new Set<string>()
    const out: Array<{ value: string; label: string }> = [{ value: '', label: 'Select role' }]
    const catDef = String(catHint?.defaultRole || '').trim()
    if (catDef) {
      seen.add(catDef)
      out.push({ value: catDef, label: catDef })
    }
    for (const r of roleOptions) {
      const v = String(r || '').trim()
      if (!v || seen.has(v)) continue
      seen.add(v)
      out.push({ value: v, label: v })
    }
    return out
  }, [catHint?.defaultRole, roleOptions])

  const strategyOptions = useMemo(()=>([
    { value: 'round_robin', label: 'One by one (rotation)' },
    { value: 'least_loaded', label: 'Less work first' },
    { value: 'fixed', label: 'Select specific person' },
  ]), [])

  async function addPlan(){
    if (!create.assetId) { setError('Select asset'); return }
    const title = String(create.title || '').trim()
    if (!title) { setError('Title required'); return }
    const role = String(create.role || '').trim()
    if (!role) { setError('Role required'); return }

    const fixedStaffIds = String(create.fixedStaffIdsRaw || '').split(',').map(s => s.trim()).filter(Boolean)

    setError(null)
    try{
      await hospitalApi.maintenanceCreatePlan({
        assetId: create.assetId,
        title,
        instructions: create.instructions.trim() || undefined,
        role,
        recurrence: create.recurrence,
        intervalDays: create.recurrence === 'every_n_days' ? Number(create.intervalDays || 1) : undefined,
        assignmentStrategy: create.assignmentStrategy,
        fixedStaffIds: create.assignmentStrategy === 'fixed' ? fixedStaffIds : undefined,
        enabled: !!create.enabled,
      })
      setCreate(v => ({ ...v, title: '', instructions: '' }))
      await loadAll()
    } catch(e: any){ setError(String(e?.message || 'Create failed')) }
  }

  async function delPlan(id: string){
    if (!confirm('Delete plan? This will delete its generated tasks.')) return
    setError(null)
    try{ await hospitalApi.maintenanceDeletePlan(id); await loadAll() } catch(e: any){ setError(String(e?.message || 'Delete failed')) }
  }

  if (!session) return null

  return (
    <div className="w-full px-4 md:px-6 py-6 space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-2xl font-extrabold tracking-tight text-slate-900">Maintenance Plans</div>
          <div className="text-sm text-slate-600">Recurring schedules and auto assignment</div>
        </div>
        <div className="flex gap-2">
          <button className="btn-outline-navy" onClick={()=>navigate('/task/maintenance/assets')}>Assets</button>
          <button className="btn-outline-navy" onClick={()=>navigate('/task/maintenance/tasks')}>Tasks</button>
          <button className="btn-outline-navy inline-flex items-center gap-2" onClick={loadAll} disabled={loading}>
            <RefreshCw className="size-4" />
            Refresh
          </button>
        </div>
      </div>

      {!!error && <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</div>}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div className="text-base font-semibold text-slate-900">Create Plan</div>
        <div className="grid gap-3 md:grid-cols-8">
          <div className="md:col-span-3">
            <label className="mb-1 block text-sm text-slate-700">Asset</label>
            <Task_SearchableSelect
              value={create.assetId}
              onChange={(v)=>setCreate(s=>({ ...s, assetId: v }))}
              options={assetOptions}
              placeholder="Select asset"
            />
            {catHint && <div className="mt-1 text-xs text-slate-500">Category: {catHint.name}{catHint.defaultRole ? ` • Default role: ${catHint.defaultRole}` : ''}</div>}
          </div>
          <div className="md:col-span-3">
            <label className="mb-1 block text-sm text-slate-700">Title</label>
            <input value={create.title} onChange={e=>setCreate(v=>({ ...v, title: e.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" placeholder="e.g. Clean washroom" />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm text-slate-700">Role (staff.role)</label>
            <Task_SearchableSelect
              value={create.role}
              onChange={(v)=>setCreate(s=>({ ...s, role: v }))}
              options={roleSelectOptions}
              placeholder="Select role"
            />
          </div>

          <div className="md:col-span-4">
            <label className="mb-1 block text-sm text-slate-700">Instructions</label>
            <input value={create.instructions} onChange={e=>setCreate(v=>({ ...v, instructions: e.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" placeholder="Optional" />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm text-slate-700">Recurrence</label>
            <select value={create.recurrence} onChange={e=>setCreate(v=>({ ...v, recurrence: e.target.value as any }))} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm">
              <option value="none">None</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="every_n_days">Every N days</option>
            </select>
          </div>
          <div className="md:col-span-1">
            <label className="mb-1 block text-sm text-slate-700">N days</label>
            <input value={String(create.intervalDays)} onChange={e=>setCreate(v=>({ ...v, intervalDays: Number(e.target.value || 1) }))} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" disabled={create.recurrence !== 'every_n_days'} />
          </div>
          <div className="md:col-span-1">
            <label className="mb-1 block text-sm text-slate-700">Enabled</label>
            <select value={create.enabled ? '1' : '0'} onChange={e=>setCreate(v=>({ ...v, enabled: e.target.value === '1' }))} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm">
              <option value="1">Yes</option>
              <option value="0">No</option>
            </select>
          </div>

          <div className="md:col-span-3">
            <label className="mb-1 block text-sm text-slate-700">Assignment Strategy</label>
            <Task_SearchableSelect
              value={create.assignmentStrategy}
              onChange={(v)=>setCreate(s=>({ ...s, assignmentStrategy: v as any }))}
              options={strategyOptions}
              placeholder="Select strategy"
              searchable={false}
            />
          </div>
          <div className="md:col-span-5">
            <label className="mb-1 block text-sm text-slate-700">Fixed Staff IDs (comma-separated)</label>
            <input value={create.fixedStaffIdsRaw} onChange={e=>setCreate(v=>({ ...v, fixedStaffIdsRaw: e.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" disabled={create.assignmentStrategy !== 'fixed'} placeholder="e.g. 65a... , 65b..." />
          </div>
        </div>

        <div className="flex justify-end">
          <button className="btn-navy inline-flex items-center gap-2" onClick={addPlan} disabled={!isAdmin}>
            <Plus className="size-4" />
            Add Plan
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="text-base font-semibold text-slate-900">Plans</div>
          <div className="text-sm text-slate-600">{plans.length}</div>
        </div>
        <div className="mt-3 divide-y">
          {plans.map(p => (
            <div key={String(p._id)} className="py-3 flex items-start justify-between gap-4">
              <div>
                <div className="font-semibold text-slate-900">{p.title}</div>
                <div className="text-xs text-slate-600">Asset: {assetName(p.assetId)} • Role: {p.role} • Recurrence: {p.recurrence}{p.recurrence==='every_n_days' ? `(${p.intervalDays || 0})` : ''}</div>
                {p.instructions && <div className="text-xs text-slate-500 mt-1">{p.instructions}</div>}
              </div>
              <div className="flex items-center gap-2">
                <button className="btn-outline-navy" onClick={()=>navigate(`/task/maintenance/tasks?planId=${encodeURIComponent(String(p._id))}`)}>Tasks</button>
                <button className="inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100" onClick={()=>delPlan(String(p._id))}>
                  <Trash2 className="size-4" />
                  Delete
                </button>
              </div>
            </div>
          ))}
          {!plans.length && <div className="py-3 text-sm text-slate-500">No plans yet.</div>}
        </div>
      </div>
    </div>
  )
}
