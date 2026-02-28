import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { loadRoles, loadSession, loadTemplates, save, seedIfNeeded, TEMPLATES_KEY } from './task_store'
import { ClipboardList, Plus, Wrench } from 'lucide-react'

export default function Task_AdminTemplates(){
  const navigate = useNavigate()
  const [roles, setRoles] = useState<any[]>([])
  const [templates, setTemplates] = useState<any[]>([])
  const [msg, setMsg] = useState<{ type: 'info'|'error'|'success'; text: string } | null>(null)

  const [createTpl, setCreateTpl] = useState({ category: 'Housekeeping & Hygiene', title: '', description: '', roleId: 'role_housekeeping', recurring: 'daily' as 'daily'|'none', active: true })

  useEffect(()=>{
    try { seedIfNeeded() } catch {}
    const s = loadSession()
    if (!s) { navigate('/task/login', { replace: true }); return }
    if (!s.isAdmin) { navigate('/task', { replace: true }); return }
    setRoles(loadRoles())
    setTemplates(loadTemplates())
  }, [navigate])

  function showMessage(type: 'info'|'error'|'success', text: string){
    setMsg({ type, text })
    try {
      window.clearTimeout((showMessage as any)._t)
      ;(showMessage as any)._t = window.setTimeout(()=>setMsg(null), 3500)
    } catch {}
  }

  const roleName = (roleId?: string)=> roles.find(r => r.id === roleId)?.name || '-'

  const addTemplate = ()=>{
    const title = createTpl.title.trim()
    if (!title) { showMessage('error', 'Template title required'); return }

    const next = {
      id: `tpl_${Date.now()}`,
      category: createTpl.category.trim() || 'General',
      title,
      description: createTpl.description.trim() || undefined,
      roleId: createTpl.roleId || undefined,
      recurring: createTpl.recurring,
      active: !!createTpl.active,
    }

    const updated = [next, ...templates]
    setTemplates(updated)
    save(TEMPLATES_KEY, updated)
    setCreateTpl(v => ({ ...v, title: '', description: '' }))
    showMessage('success', 'Template created')
  }

  const toggleTemplateActive = (id: string)=>{
    const updated = templates.map(t => t.id === id ? { ...t, active: t.active === false ? true : false } : t)
    setTemplates(updated)
    save(TEMPLATES_KEY, updated)
  }

  const activeTemplates = useMemo(()=> templates.filter(t => t.active !== false), [templates])

  const activeBadge = (active: any) =>
    active === false
      ? 'inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700'
      : 'inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700'

  const recurringBadge = (rec: any) =>
    String(rec || 'none') === 'daily'
      ? 'inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700'
      : 'inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700'

  return (
    <div className="w-full px-4 md:px-6 py-6 space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-2xl font-extrabold tracking-tight text-slate-900">Templates</div>
          <div className="text-sm text-slate-600">Create and manage role-based task templates</div>
        </div>
        <div className="flex gap-2">
          <button className="btn-outline-navy" onClick={()=>navigate('/task/assign')}>Assign</button>
          <button className="btn-outline-navy" onClick={()=>navigate('/task/staff')}>Staff</button>
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

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center">
              <Wrench className="size-5" />
            </div>
            <div className="text-base font-semibold text-slate-900">Create Template</div>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-6">
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm text-slate-700">Category</label>
            <input value={createTpl.category} onChange={e=>setCreateTpl(v=>({ ...v, category: e.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm text-slate-700">Title</label>
            <input value={createTpl.title} onChange={e=>setCreateTpl(v=>({ ...v, title: e.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" placeholder="e.g. Clean dialysis area" />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm text-slate-700">Role</label>
            <select value={createTpl.roleId} onChange={e=>setCreateTpl(v=>({ ...v, roleId: e.target.value }))} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm">
              {roles.filter(r=>r.id !== 'role_admin').map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <div className="md:col-span-4">
            <label className="mb-1 block text-sm text-slate-700">Description</label>
            <input value={createTpl.description} onChange={e=>setCreateTpl(v=>({ ...v, description: e.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" placeholder="Optional" />
          </div>
          <div className="md:col-span-1">
            <label className="mb-1 block text-sm text-slate-700">Recurring</label>
            <select value={createTpl.recurring} onChange={e=>setCreateTpl(v=>({ ...v, recurring: e.target.value as any }))} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm">
              <option value="daily">Daily</option>
              <option value="none">None</option>
            </select>
          </div>
          <div className="md:col-span-1 flex items-end justify-end">
            <button className="btn inline-flex items-center gap-2" onClick={addTemplate}>
              <Plus className="size-4" />
              Add
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <ClipboardList className="size-5" />
            </div>
            <div className="text-base font-semibold text-slate-900">All Templates</div>
          </div>
          <div className="text-xs text-slate-500">Active: {activeTemplates.length} / {templates.length}</div>
        </div>
        <div className="border rounded-xl overflow-auto">
          <table className="min-w-[1000px] w-full text-sm">
            <thead className="bg-slate-50 sticky top-0">
              <tr>
                <th className="px-3 py-2 text-left">Category</th>
                <th className="px-3 py-2 text-left">Title</th>
                <th className="px-3 py-2 text-left">Role</th>
                <th className="px-3 py-2 text-left">Recurring</th>
                <th className="px-3 py-2 text-left">Active</th>
                <th className="px-3 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {templates.length === 0 && (
                <tr><td colSpan={6} className="px-3 py-6 text-slate-500">No templates.</td></tr>
              )}
              {templates.map(t => (
                <tr key={t.id} className="border-t hover:bg-slate-50">
                  <td className="px-3 py-2">{t.category}</td>
                  <td className="px-3 py-2">
                    <div className="font-semibold text-slate-900">{t.title}</div>
                    {t.description && <div className="text-xs text-slate-500 truncate max-w-[520px]">{t.description}</div>}
                  </td>
                  <td className="px-3 py-2">{roleName(t.roleId)}</td>
                  <td className="px-3 py-2"><span className={recurringBadge(t.recurring)}>{t.recurring || 'none'}</span></td>
                  <td className="px-3 py-2"><span className={activeBadge(t.active)}>{t.active === false ? 'Disabled' : 'Active'}</span></td>
                  <td className="px-3 py-2">
                    <div className="flex justify-end gap-2">
                      <button className="rounded-xl border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50" onClick={()=>toggleTemplateActive(t.id)}>{t.active === false ? 'Enable' : 'Disable'}</button>
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
