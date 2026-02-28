import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { hospitalApi } from '../../utils/api'
import { loadSession, seedIfNeeded } from './task_store'
import { Plus, RefreshCw, Search, Trash2 } from 'lucide-react'
import Task_SearchableSelect from './task_SearchableSelect'

export default function Task_MaintenanceAssets(){
  const navigate = useNavigate()
  const [session, setSession] = useState<any>(null)
  const isAdmin = !!session?.isAdmin

  const [catItems, setCatItems] = useState<any[]>([])
  const [assetItems, setAssetItems] = useState<any[]>([])
  const [assetTotal, setAssetTotal] = useState<number>(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [q, setQ] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [condition, setCondition] = useState<'all'|'ok'|'needs_service'|'broken'>('all')

  const [createCat, setCreateCat] = useState({ name: '', defaultRole: '', active: true })
  const [createAsset, setCreateAsset] = useState({ name: '', categoryId: '', location: '', condition: 'ok' as 'ok'|'needs_service'|'broken', notes: '', active: true })

  const [roleOptions, setRoleOptions] = useState<string[]>([])

  useEffect(()=>{
    try { seedIfNeeded() } catch {}
    const s = loadSession()
    setSession(s)
    if (!s) { navigate('/task/login', { replace: true }); return }
    if (!s.isAdmin) { navigate('/task', { replace: true }); return }
  }, [navigate])

  async function loadAll(){
    setLoading(true)
    setError(null)
    try{
      const cats: any = await hospitalApi.maintenanceListCategories()
      setCatItems(Array.isArray(cats?.items) ? cats.items : [])

      const assets: any = await hospitalApi.maintenanceListAssets({ q: q.trim() || undefined, categoryId: categoryId || undefined, condition: condition === 'all' ? undefined : condition, limit: 500 })
      setAssetItems(Array.isArray(assets?.items) ? assets.items : [])
      setAssetTotal(Number(assets?.total || 0))

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
      if (/unauthorized|forbidden/i.test(msg)) {
        setError('Access denied. Login to Hospital portal or set Admin Key in Backup/Settings.')
      } else {
        setError(msg)
      }
    } finally { setLoading(false) }
  }

  useEffect(()=>{
    if (!session) return
    if (!isAdmin) return
    void loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, isAdmin])

  async function addCategory(){
    const name = String(createCat.name || '').trim()
    if (!name) { setError('Category name required'); return }
    setError(null)
    try{
      await hospitalApi.maintenanceCreateCategory({ name, defaultRole: createCat.defaultRole || undefined, active: !!createCat.active })
      setCreateCat({ name: '', defaultRole: '', active: true })
      await loadAll()
    } catch(e: any){ setError(String(e?.message || 'Create failed')) }
  }

  async function deleteCategory(id: string){
    if (!confirm('Delete category?')) return
    setError(null)
    try{ await hospitalApi.maintenanceDeleteCategory(id); await loadAll() } catch(e: any){ setError(String(e?.message || 'Delete failed')) }
  }

  async function addAsset(){
    const name = String(createAsset.name || '').trim()
    if (!name) { setError('Asset name required'); return }
    if (!createAsset.categoryId) { setError('Select category'); return }
    setError(null)
    try{
      await hospitalApi.maintenanceCreateAsset({
        name,
        categoryId: createAsset.categoryId,
        location: createAsset.location || undefined,
        condition: createAsset.condition,
        notes: createAsset.notes || undefined,
        active: !!createAsset.active,
      })
      setCreateAsset(v => ({ ...v, name: '', location: '', notes: '' }))
      await loadAll()
    } catch(e: any){ setError(String(e?.message || 'Create failed')) }
  }

  async function deleteAsset(id: string){
    if (!confirm('Delete asset? This will delete its plans and tasks.')) return
    setError(null)
    try{ await hospitalApi.maintenanceDeleteAsset(id); await loadAll() } catch(e: any){ setError(String(e?.message || 'Delete failed')) }
  }

  const categoryName = (id: any)=> catItems.find(c => String(c?._id||'') === String(id||''))?.name || '-'

  const categoryOptions = useMemo(()=>([
    { value: '', label: 'Select category' },
    ...catItems.map(c => ({ value: String(c._id), label: String(c.name || 'Category') })),
  ]), [catItems])

  const categoryFilterOptions = useMemo(()=>([
    { value: '', label: 'All' },
    ...catItems.map(c => ({ value: String(c._id), label: String(c.name || 'Category') })),
  ]), [catItems])

  if (!session) return null

  return (
    <div className="w-full px-4 md:px-6 py-6 space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-2xl font-extrabold tracking-tight text-slate-900">Maintenance Assets</div>
          <div className="text-sm text-slate-600">Categories and asset inventory</div>
        </div>
        <div className="flex gap-2">
          <button className="btn-outline-navy" onClick={()=>navigate('/task/maintenance/plans')}>Plans</button>
          <button className="btn-outline-navy" onClick={()=>navigate('/task/maintenance/tasks')}>Tasks</button>
          <button className="btn-outline-navy inline-flex items-center gap-2" onClick={loadAll} disabled={loading}>
            <RefreshCw className="size-4" />
            Refresh
          </button>
        </div>
      </div>

      {!!error && (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
          <div className="text-base font-semibold text-slate-900">Categories</div>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm text-slate-700">Name</label>
              <input value={createCat.name} onChange={e=>setCreateCat(v=>({ ...v, name: e.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-700">Default Role</label>
              <Task_SearchableSelect
                value={createCat.defaultRole}
                onChange={(v)=>setCreateCat(s=>({ ...s, defaultRole: v }))}
                options={[
                  { value: '', label: 'None' },
                  ...roleOptions.map(r => ({ value: r, label: r })),
                ]}
                placeholder="Select role"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button className="btn-navy inline-flex items-center gap-2" onClick={addCategory} disabled={!isAdmin}>
              <Plus className="size-4" />
              Add Category
            </button>
          </div>

          <div className="divide-y">
            {catItems.map(c => (
              <div key={String(c._id)} className="py-2 flex items-center justify-between gap-3">
                <div>
                  <div className="font-semibold text-slate-900">{c.name}</div>
                  <div className="text-xs text-slate-600">Role: {c.defaultRole || '-'}</div>
                </div>
                <button className="inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100" onClick={()=>deleteCategory(String(c._id))}>
                  <Trash2 className="size-4" />
                  Delete
                </button>
              </div>
            ))}
            {!catItems.length && <div className="py-3 text-sm text-slate-500">No categories yet.</div>}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
          <div className="text-base font-semibold text-slate-900">Create Asset</div>

          <div className="grid gap-3 md:grid-cols-6">
            <div className="md:col-span-3">
              <label className="mb-1 block text-sm text-slate-700">Asset Name</label>
              <input value={createAsset.name} onChange={e=>setCreateAsset(v=>({ ...v, name: e.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" placeholder="e.g. Generator 1" />
            </div>
            <div className="md:col-span-3">
              <label className="mb-1 block text-sm text-slate-700">Category</label>
              <Task_SearchableSelect
                value={createAsset.categoryId}
                onChange={(v)=>setCreateAsset(s=>({ ...s, categoryId: v }))}
                options={categoryOptions}
                placeholder="Select category"
              />
            </div>
            <div className="md:col-span-3">
              <label className="mb-1 block text-sm text-slate-700">Location</label>
              <input value={createAsset.location} onChange={e=>setCreateAsset(v=>({ ...v, location: e.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" placeholder="e.g. Basement" />
            </div>
            <div className="md:col-span-3">
              <label className="mb-1 block text-sm text-slate-700">Condition</label>
              <select value={createAsset.condition} onChange={e=>setCreateAsset(v=>({ ...v, condition: e.target.value as any }))} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm">
                <option value="ok">OK</option>
                <option value="needs_service">Needs service</option>
                <option value="broken">Broken</option>
              </select>
            </div>
            <div className="md:col-span-6">
              <label className="mb-1 block text-sm text-slate-700">Notes</label>
              <input value={createAsset.notes} onChange={e=>setCreateAsset(v=>({ ...v, notes: e.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" placeholder="Optional" />
            </div>
          </div>

          <div className="flex justify-end">
            <button className="btn-navy inline-flex items-center gap-2" onClick={addAsset} disabled={!isAdmin}>
              <Plus className="size-4" />
              Add Asset
            </button>
          </div>

          <div className="pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between gap-3">
              <div className="text-base font-semibold text-slate-900">Assets</div>
              <div className="text-sm text-slate-600">Total: {assetTotal}</div>
            </div>

            <div className="mt-3 grid gap-3 md:grid-cols-6">
              <div className="md:col-span-3">
                <label className="mb-1 block text-sm text-slate-700">Search</label>
                <div className="relative">
                  <Search className="size-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input value={q} onChange={e=>setQ(e.target.value)} className="w-full rounded-xl border border-slate-300 pl-9 pr-3 py-2 text-sm" placeholder="name / location" />
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm text-slate-700">Category</label>
                <Task_SearchableSelect
                  value={categoryId}
                  onChange={setCategoryId}
                  options={categoryFilterOptions}
                  placeholder="All"
                />
              </div>
              <div className="md:col-span-1">
                <label className="mb-1 block text-sm text-slate-700">Condition</label>
                <select value={condition} onChange={e=>setCondition(e.target.value as any)} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm">
                  <option value="all">All</option>
                  <option value="ok">OK</option>
                  <option value="needs_service">Needs</option>
                  <option value="broken">Broken</option>
                </select>
              </div>
            </div>
            <div className="mt-3 flex justify-end">
              <button className="btn-outline-navy" onClick={loadAll} disabled={loading}>Apply</button>
            </div>

            <div className="mt-3 divide-y">
              {assetItems.map(a => (
                <div key={String(a._id)} className="py-3 flex items-start justify-between gap-4">
                  <div>
                    <div className="font-semibold text-slate-900">{a.name}</div>
                    <div className="text-xs text-slate-600">{categoryName(a.categoryId)}{a.location ? ` • ${a.location}` : ''}</div>
                    {a.notes && <div className="text-xs text-slate-500 mt-1">{a.notes}</div>}
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="btn-outline-navy" onClick={()=>navigate(`/task/maintenance/plans?assetId=${encodeURIComponent(String(a._id))}`)}>Plans</button>
                    <button className="inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100" onClick={()=>deleteAsset(String(a._id))}>
                      <Trash2 className="size-4" />
                      Delete
                    </button>
                  </div>
                </div>
              ))}
              {!assetItems.length && <div className="py-3 text-sm text-slate-500">No assets yet.</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
