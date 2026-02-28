import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { loadSession, loadTemplates, loadUsers, runDailyAutoAssign, save, saveTasks, seedIfNeeded, todayIso, loadTasks, USERS_KEY } from './task_store'
import { CalendarDays, ClipboardList, Sparkles, UserRound } from 'lucide-react'
import { hospitalApi } from '../../utils/api'

export default function Task_AdminAssign(){
  const navigate = useNavigate()
  const [session, setSession] = useState<any>(null)
  const [users, setUsers] = useState<any[]>([])
  const [templates, setTemplates] = useState<any[]>([])
  const [msg, setMsg] = useState<{ type: 'info'|'error'|'success'; text: string } | null>(null)
  const [staffSyncing, setStaffSyncing] = useState(false)
  const [staffSyncError, setStaffSyncError] = useState<string>('')

  const [assign, setAssign] = useState({ toUserId: '', templateId: '', dueDate: todayIso() })

  const mapHospitalRoleToTaskRoleId = (roleRaw: any): string => {
    const s = String(roleRaw || '').trim().toLowerCase()
    if (!s) return 'role_operational_staff'
    if (s.includes('infra')) return 'role_infra'
    if (s.includes('house')) return 'role_housekeeping'
    if (s.includes('wash')) return 'role_washroom_cleaner'
    if (s.includes('vehicle') || s.includes('fleet')) return 'role_fleet'
    if (s.includes('security')) return 'role_security'
    if (s.includes('officer')) return 'role_security_officer'
    if (s.includes('supervisor')) return 'role_supervisor'
    if (s.includes('department')) return 'role_department_head'
    if (s.includes('administrator')) return 'role_administrator'
    if (s === 'admin') return 'role_admin'
    return 'role_operational_staff'
  }

  const syncStaffFromHospital = async (existingUsers: any[], mountedRef: { current: boolean }) => {
    setStaffSyncError('')
    setStaffSyncing(true)
    try {
      const res: any = await (hospitalApi as any).listStaff()
      const raw: any[] = (res?.staff || res?.items || res || [])
      if (!mountedRef.current) return
      if (!Array.isArray(raw) || raw.length === 0) return

      const byId = new Map(existingUsers.map(u => [String(u.id || ''), u]))

      for (const st of raw) {
        const sid = String(st?._id || st?.id || '').trim()
        if (!sid) continue
        const id = `h_${sid}`
        const fullName = String(st?.name || st?.fullName || '').trim() || `Staff ${sid.slice(-6)}`
        const username = String(st?.username || '').trim() || `staff_${sid.slice(-6)}`
        const active = st?.active === false ? false : (String(st?.status || '').toLowerCase() === 'inactive' ? false : true)
        const roleId = mapHospitalRoleToTaskRoleId(st?.role || st?.position)

        const prev = byId.get(id)
        const next = {
          ...(prev || {}),
          id,
          username,
          password: prev?.password || '123',
          fullName,
          roleId,
          isAdmin: false,
          active,
          hospitalStaffId: sid,
        }
        byId.set(id, next)
      }

      const out = Array.from(byId.values())
      save(USERS_KEY, out)
      setUsers(out)
    } catch (e: any) {
      if (!mountedRef.current) return
      const m = String(e?.message || '')
      setStaffSyncError(m || 'Failed to load staff from Staff Management')
    } finally {
      if (mountedRef.current) setStaffSyncing(false)
    }
  }

  useEffect(()=>{
    try { seedIfNeeded() } catch {}
    const s = loadSession()
    setSession(s)
    if (!s) { navigate('/task/login', { replace: true }); return }
    if (!s.isAdmin) { navigate('/task', { replace: true }); return }
    const existing = loadUsers()
    setUsers(existing)
    setTemplates(loadTemplates())

    const mountedRef = { current: true }
    void syncStaffFromHospital(existing, mountedRef)
    return () => { mountedRef.current = false }
  }, [navigate])

  function showMessage(type: 'info'|'error'|'success', text: string){
    setMsg({ type, text })
    try {
      window.clearTimeout((showMessage as any)._t)
      ;(showMessage as any)._t = window.setTimeout(()=>setMsg(null), 3500)
    } catch {}
  }

  const staff = useMemo(()=>{
    return users.filter(u => {
      if (u?.isAdmin) return false
      if (u?.active === false) return false
      const id = String(u?.id || '')
      // Only show users that are synced from Hospital Staff Management
      // (prevents random local task users from appearing in dropdown)
      return !!u?.hospitalStaffId || id.startsWith('h_')
    })
  }, [users])
  const activeTemplates = useMemo(()=> templates.filter(t => t.active !== false), [templates])
  const selectedTemplate = useMemo(()=> templates.find(t => t.id === assign.templateId) || null, [assign.templateId, templates])
  const selectedStaff = useMemo(()=> users.find(u => u.id === assign.toUserId) || null, [assign.toUserId, users])

  const assignNow = ()=>{
    const toUserId = String(assign.toUserId || '').trim()
    const templateId = String(assign.templateId || '').trim()
    const dueDate = String(assign.dueDate || '').trim() || todayIso()
    if (!toUserId || !templateId) { showMessage('error', 'Select staff and template'); return }
    const tpl = templates.find(t => t.id === templateId)
    if (!tpl) { showMessage('error', 'Template not found'); return }

    const next = {
      id: `t_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      title: tpl.title,
      description: tpl.description || '',
      status: 'todo' as const,
      createdAt: Date.now(),
      assignedByUserId: session?.userId,
      assignedToUserId: toUserId,
      roleId: tpl.roleId,
      dueDate,
    }

    const updated = [next, ...loadTasks()]
    saveTasks(updated)
    showMessage('success', 'Task assigned')
  }

  const generateToday = ()=>{
    if (!session?.userId) return
    runDailyAutoAssign(session.userId)
    showMessage('success', 'Today tasks generated')
  }

  return (
    <div className="w-full px-4 md:px-6 py-6 space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-2xl font-extrabold tracking-tight text-slate-900">Assign Tasks</div>
          <div className="text-sm text-slate-600">Create a task for a staff member or generate daily recurring tasks</div>
        </div>
        <div className="flex gap-2">
          <button className="btn-outline-navy" onClick={()=>navigate('/task/templates')}>Templates</button>
          <button className="btn" onClick={generateToday}>Generate Today (Auto)</button>
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

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <div className="text-base font-semibold text-slate-900">Manual Assignment</div>

          {!staffSyncing && staff.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4">
              <div className="text-sm font-semibold text-slate-900">No staff users found</div>
              <div className="mt-1 text-sm text-slate-600">Add staff in Staff Management, then reload this page.</div>
              <div className="mt-3 flex justify-end">
                <button className="btn-outline-navy" onClick={()=>navigate('/task/staff/management')}>Open Staff Management</button>
              </div>
            </div>
          )}

          {staffSyncing && (
            <div className="text-sm text-slate-600">Loading staff from Staff Management...</div>
          )}

          {!staffSyncing && staffSyncError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
              <div className="text-sm font-semibold text-rose-900">Staff not loaded</div>
              <div className="mt-1 text-sm text-rose-800">{staffSyncError}</div>
              <div className="mt-3 flex justify-end">
                <button className="btn-outline-navy" onClick={()=>syncStaffFromHospital(loadUsers(), { current: true })}>Retry</button>
              </div>
            </div>
          )}

          <div className="grid gap-3 md:grid-cols-6">
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm text-slate-700">Staff</label>
              <div className="relative">
                <UserRound className="size-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <select value={assign.toUserId} onChange={e=>setAssign(v=>({ ...v, toUserId: e.target.value }))} className="w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 py-2 text-sm">
                  <option value="">Select staff...</option>
                  {staff.map(u => <option key={u.id} value={u.id}>{u.fullName || u.username}</option>)}
                </select>
              </div>
            </div>

            <div className="md:col-span-3">
              <label className="mb-1 block text-sm text-slate-700">Template</label>
              <div className="relative">
                <ClipboardList className="size-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <select value={assign.templateId} onChange={e=>setAssign(v=>({ ...v, templateId: e.target.value }))} className="w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 py-2 text-sm">
                  <option value="">Select task...</option>
                  {activeTemplates.map(t => <option key={t.id} value={t.id}>{t.category}: {t.title}</option>)}
                </select>
              </div>
            </div>

            <div className="md:col-span-1">
              <label className="mb-1 block text-sm text-slate-700">Due Date</label>
              <div className="relative">
                <CalendarDays className="size-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input type="date" value={assign.dueDate} onChange={e=>setAssign(v=>({ ...v, dueDate: e.target.value }))} className="w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 py-2 text-sm" />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-xs text-slate-500">Tip: Use “Generate Today (Auto)” to create daily tasks per role.</div>
            <button className="btn" onClick={assignNow}>Assign</button>
          </div>
        </div>

        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <Sparkles className="size-5" />
            </div>
            <div className="text-base font-semibold text-slate-900">Preview</div>
          </div>

          {!selectedTemplate && !selectedStaff ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4">
              <div className="text-sm font-semibold text-slate-900">Select staff and a template</div>
              <div className="mt-1 text-sm text-slate-600">You’ll see a quick summary here before assigning.</div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="text-xs text-slate-500">Staff</div>
                <div className="mt-1 font-semibold text-slate-900">{selectedStaff?.fullName || selectedStaff?.username || '-'}</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="text-xs text-slate-500">Task Template</div>
                <div className="mt-1 font-semibold text-slate-900">{selectedTemplate?.title || '-'}</div>
                <div className="mt-1 text-sm text-slate-600">{selectedTemplate?.description || 'No description'}</div>
                <div className="mt-2 text-xs text-slate-500">Category: {selectedTemplate?.category || '-'} · Recurring: {selectedTemplate?.recurring || 'none'}</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="text-xs text-slate-500">Due</div>
                <div className="mt-1 font-semibold text-slate-900">{assign.dueDate || todayIso()}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
