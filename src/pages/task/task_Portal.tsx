import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

type TaskSession = {
  ok: boolean
  at: number
  userId: string
  username: string
  fullName?: string
  roleId?: string
  isAdmin?: boolean
}

type TaskRole = {
  id: string
  name: string
}

type TaskUser = {
  id: string
  username: string
  password: string
  fullName?: string
  roleId?: string
  isAdmin?: boolean
  active?: boolean
}

type TaskTemplate = {
  id: string
  category: string
  title: string
  description?: string
  roleId?: string
  recurring?: 'daily' | 'none'
  active?: boolean
}

type TaskItem = {
  id: string
  title: string
  description?: string
  status: 'todo' | 'doing' | 'done'
  createdAt: number
  assignedByUserId?: string
  assignedToUserId?: string
  roleId?: string
  dueDate?: string
  completedAt?: number
}

const TASKS_KEY = 'task.items'
const USERS_KEY = 'task.users'
const ROLES_KEY = 'task.roles'
const TEMPLATES_KEY = 'task.templates'
const DAILY_RUN_KEY = 'task.daily.lastRun'

function safeParse<T>(raw: any, fallback: T): T {
  try {
    if (!raw) return fallback
    const v = JSON.parse(raw)
    return (v as any) ?? fallback
  } catch { return fallback }
}

function todayIso(){
  return new Date().toISOString().slice(0,10)
}

function save<T>(key: string, v: T){
  try { localStorage.setItem(key, JSON.stringify(v)) } catch {}
}

function seedIfNeeded(){
  const roles = safeParse<TaskRole[]>(localStorage.getItem(ROLES_KEY), [])
  const users = safeParse<TaskUser[]>(localStorage.getItem(USERS_KEY), [])
  const templates = safeParse<TaskTemplate[]>(localStorage.getItem(TEMPLATES_KEY), [])

  const nextRoles = roles.length
    ? roles
    : [
        { id: 'role_admin', name: 'Admin' },
        { id: 'role_infra', name: 'Infrastructure & Utilities' },
        { id: 'role_housekeeping', name: 'Housekeeping & Hygiene' },
        { id: 'role_security', name: 'Security & Safety' },
        { id: 'role_fleet', name: 'Vehicles & Fleet' },
        { id: 'role_washroom_cleaner', name: 'Washroom Cleaner' },
      ]

  const hasAdmin = users.some(u => String(u.username || '').toLowerCase() === 'admin')
  const nextUsers = users.length
    ? (hasAdmin ? users : [{ id: 'u_admin', username: 'admin', password: '123', fullName: 'Admin', roleId: 'role_admin', isAdmin: true, active: true }, ...users])
    : [{ id: 'u_admin', username: 'admin', password: '123', fullName: 'Admin', roleId: 'role_admin', isAdmin: true, active: true }]

  const nextTemplates = templates.length
    ? templates
    : [
        { id: 'tpl_infra_1', category: 'Infrastructure & Utilities', title: 'Solar panel cleaning & battery water levels', roleId: 'role_infra', recurring: 'daily', active: true },
        { id: 'tpl_infra_2', category: 'Infrastructure & Utilities', title: 'UPS batteries, generators, daily Sui gas shut-off', roleId: 'role_infra', recurring: 'daily', active: true },
        { id: 'tpl_infra_3', category: 'Infrastructure & Utilities', title: 'Central oxygen checks', roleId: 'role_infra', recurring: 'daily', active: true },
        { id: 'tpl_infra_4', category: 'Infrastructure & Utilities', title: 'Elevator inspections', roleId: 'role_infra', recurring: 'daily', active: true },
        { id: 'tpl_infra_5', category: 'Infrastructure & Utilities', title: 'UV lights, night signboards & external lights ON/OFF', roleId: 'role_infra', recurring: 'daily', active: true },
        { id: 'tpl_infra_6', category: 'Infrastructure & Utilities', title: 'Ensuring extra lights switched off after closure', roleId: 'role_infra', recurring: 'daily', active: true },

        { id: 'tpl_house_1', category: 'Housekeeping & Hygiene', title: 'Dusting schedules', roleId: 'role_housekeeping', recurring: 'daily', active: true },
        { id: 'tpl_house_2', category: 'Housekeeping & Hygiene', title: 'Washroom cleanliness', roleId: 'role_washroom_cleaner', recurring: 'daily', active: true },
        { id: 'tpl_house_3', category: 'Housekeeping & Hygiene', title: 'Waste management', roleId: 'role_housekeeping', recurring: 'daily', active: true },
        { id: 'tpl_house_4', category: 'Housekeeping & Hygiene', title: 'Linen & fumigation logs', roleId: 'role_housekeeping', recurring: 'daily', active: true },

        { id: 'tpl_sec_1', category: 'Security & Safety', title: 'CCTV checks', roleId: 'role_security', recurring: 'daily', active: true },
        { id: 'tpl_sec_2', category: 'Security & Safety', title: 'Doors & access verification after closure', roleId: 'role_security', recurring: 'daily', active: true },
        { id: 'tpl_sec_3', category: 'Security & Safety', title: 'Fire safety inspections', roleId: 'role_security', recurring: 'daily', active: true },

        { id: 'tpl_fleet_1', category: 'Vehicles & Fleet', title: 'Oil & maintenance schedules', roleId: 'role_fleet', recurring: 'daily', active: true },
        { id: 'tpl_fleet_2', category: 'Vehicles & Fleet', title: 'Fuel tracking', roleId: 'role_fleet', recurring: 'daily', active: true },
        { id: 'tpl_fleet_3', category: 'Vehicles & Fleet', title: 'Ambulance readiness', roleId: 'role_fleet', recurring: 'daily', active: true },
        { id: 'tpl_fleet_4', category: 'Vehicles & Fleet', title: 'Vehicle requisition & approvals', roleId: 'role_fleet', recurring: 'daily', active: true },
      ]

  if (roles.length === 0) save(ROLES_KEY, nextRoles)
  if (users.length === 0 || !hasAdmin) save(USERS_KEY, nextUsers)
  if (templates.length === 0) save(TEMPLATES_KEY, nextTemplates)
}

function loadSession(): TaskSession | null {
  const s = safeParse<any>(localStorage.getItem('task.session'), null)
  if (!s?.ok || !s?.userId) return null
  return s as TaskSession
}

function loadTasks(): TaskItem[] {
  const v = safeParse<TaskItem[]>(localStorage.getItem(TASKS_KEY), [])
  return Array.isArray(v) ? v : []
}

function saveTasks(items: TaskItem[]) {
  save(TASKS_KEY, items)
}

function runDailyAutoAssign(currentUserId: string){
  const t = todayIso()
  const last = String(localStorage.getItem(DAILY_RUN_KEY) || '')
  if (last === t) return

  const users = safeParse<TaskUser[]>(localStorage.getItem(USERS_KEY), [])
  const templates = safeParse<TaskTemplate[]>(localStorage.getItem(TEMPLATES_KEY), [])
  const tasks = loadTasks()

  const activeDaily = templates.filter(x => x.active !== false && x.recurring === 'daily')
  if (activeDaily.length === 0) {
    try { localStorage.setItem(DAILY_RUN_KEY, t) } catch {}
    return
  }

  const next: TaskItem[] = [...tasks]
  for (const tpl of activeDaily){
    const roleId = tpl.roleId
    const assignees = roleId ? users.filter(u => u.active !== false && !u.isAdmin && u.roleId === roleId) : []
    for (const u of assignees){
      const exists = next.some(x => x.dueDate === t && x.assignedToUserId === u.id && x.title === tpl.title)
      if (exists) continue
      next.unshift({
        id: `t_${Date.now()}_${Math.random().toString(16).slice(2)}`,
        title: tpl.title,
        description: tpl.description || '',
        status: 'todo',
        createdAt: Date.now(),
        assignedByUserId: currentUserId,
        assignedToUserId: u.id,
        roleId: roleId,
        dueDate: t,
      })
    }
  }

  saveTasks(next)
  try { localStorage.setItem(DAILY_RUN_KEY, t) } catch {}
}

export default function Task_Portal(){
  const navigate = useNavigate()

  const authed = useMemo(()=>{
    try { return !!loadSession() } catch { return false }
  }, [])

  const [session, setSession] = useState<TaskSession | null>(null)
  const [roles, setRoles] = useState<TaskRole[]>([])
  const [users, setUsers] = useState<TaskUser[]>([])
  const [templates, setTemplates] = useState<TaskTemplate[]>([])
  const [items, setItems] = useState<TaskItem[]>([])
  const [msg, setMsg] = useState<{ type: 'info'|'error'|'success'; text: string } | null>(null)

  const isAdmin = !!session?.isAdmin

  const [createUser, setCreateUser] = useState({ username: '', password: '123', fullName: '', roleId: 'role_housekeeping', active: true })
  const [createRoleName, setCreateRoleName] = useState('')
  const [createTpl, setCreateTpl] = useState({ category: 'Housekeeping & Hygiene', title: '', description: '', roleId: 'role_housekeeping', recurring: 'daily' as 'daily'|'none', active: true })
  const [assign, setAssign] = useState({ toUserId: '', templateId: '', dueDate: todayIso() })

  useEffect(()=>{
    if (!authed) navigate('/task/login', { replace: true })
  }, [authed, navigate])

  useEffect(()=>{
    try { seedIfNeeded() } catch {}
    const s = loadSession()
    setSession(s)
    const r = safeParse<TaskRole[]>(localStorage.getItem(ROLES_KEY), [])
    const u = safeParse<TaskUser[]>(localStorage.getItem(USERS_KEY), [])
    const t = safeParse<TaskTemplate[]>(localStorage.getItem(TEMPLATES_KEY), [])
    setRoles(Array.isArray(r) ? r : [])
    setUsers(Array.isArray(u) ? u : [])
    setTemplates(Array.isArray(t) ? t : [])

    if (s?.userId) {
      try { runDailyAutoAssign(s.userId) } catch {}
    }
    setItems(loadTasks())
  }, [])

  function showMessage(type: 'info'|'error'|'success', text: string){
    setMsg({ type, text })
    try {
      window.clearTimeout((showMessage as any)._t)
      ;(showMessage as any)._t = window.setTimeout(()=>setMsg(null), 3500)
    } catch {}
  }

  const visibleItems = useMemo(()=>{
    if (isAdmin) return items
    const uid = session?.userId
    if (!uid) return []
    return items.filter(x => x.assignedToUserId === uid)
  }, [isAdmin, items, session?.userId])

  const counts = useMemo(()=>{
    const c = { todo: 0, doing: 0, done: 0 }
    for (const it of visibleItems) c[it.status]++
    return c
  }, [visibleItems])

  const update = (id: string, patch: Partial<TaskItem>)=>{
    const updated = items.map(it => it.id === id ? { ...it, ...patch } : it)
    setItems(updated)
    saveTasks(updated)
  }

  const remove = (id: string)=>{
    const updated = items.filter(it => it.id !== id)
    setItems(updated)
    saveTasks(updated)
  }

  const roleName = (roleId?: string)=> roles.find(r => r.id === roleId)?.name || '-'
  const userName = (userId?: string)=>{
    const u = users.find(x => x.id === userId)
    return u?.fullName || u?.username || '-'
  }

  const createRole = ()=>{
    const name = createRoleName.trim()
    if (!name) return
    const id = `role_${Date.now()}`
    const next = [{ id, name }, ...roles]
    setRoles(next)
    save(ROLES_KEY, next)
    setCreateRoleName('')
    showMessage('success', 'Role created')
  }

  const createStaffUser = ()=>{
    const u = createUser.username.trim()
    const p = String(createUser.password || '').trim()
    if (!u || !p) { showMessage('error', 'Username and password required'); return }
    if (users.some(x => String(x.username || '').toLowerCase() === u.toLowerCase())) { showMessage('error', 'Username already exists'); return }
    const next: TaskUser = {
      id: `u_${Date.now()}`,
      username: u,
      password: p,
      fullName: createUser.fullName.trim() || u,
      roleId: createUser.roleId,
      isAdmin: false,
      active: !!createUser.active,
    }
    const updated = [next, ...users]
    setUsers(updated)
    save(USERS_KEY, updated)
    setCreateUser(v => ({ ...v, username: '', fullName: '' }))
    showMessage('success', 'Staff user created')
  }

  const toggleUserActive = (id: string)=>{
    const updated = users.map(u => u.id === id ? { ...u, active: u.active === false ? true : false } : u)
    setUsers(updated)
    save(USERS_KEY, updated)
  }

  const addTemplate = ()=>{
    const title = createTpl.title.trim()
    if (!title) { showMessage('error', 'Template title required'); return }
    const next: TaskTemplate = {
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

  const assignTaskFromTemplate = ()=>{
    const toUserId = String(assign.toUserId || '').trim()
    const templateId = String(assign.templateId || '').trim()
    const dueDate = String(assign.dueDate || '').trim() || todayIso()
    if (!toUserId || !templateId) { showMessage('error', 'Select staff and task'); return }
    const tpl = templates.find(t => t.id === templateId)
    if (!tpl) { showMessage('error', 'Template not found'); return }
    const next: TaskItem = {
      id: `t_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      title: tpl.title,
      description: tpl.description,
      status: 'todo',
      createdAt: Date.now(),
      assignedByUserId: session?.userId,
      assignedToUserId: toUserId,
      roleId: tpl.roleId,
      dueDate,
    }
    const updated = [next, ...items]
    setItems(updated)
    saveTasks(updated)
    showMessage('success', 'Task assigned')
  }

  const logout = ()=>{
    try { localStorage.removeItem('task.session') } catch {}
    navigate('/task/login')
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 md:px-6 py-6 space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-2xl font-bold text-slate-900">Task Management</div>
            <div className="text-sm text-slate-600">{isAdmin ? 'Admin Dashboard' : 'My Tasks'} · {session?.fullName || session?.username || ''}</div>
          </div>
          <div className="flex gap-2">
            <button className="rounded-md border border-slate-300 px-3 py-2 text-sm" onClick={()=>navigate('/')}>Home</button>
            <button className="rounded-md border border-slate-300 px-3 py-2 text-sm" onClick={logout}>Logout</button>
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

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-sm text-slate-600">Todo</div>
            <div className="mt-1 text-2xl font-semibold text-slate-900">{counts.todo}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-sm text-slate-600">Doing</div>
            <div className="mt-1 text-2xl font-semibold text-slate-900">{counts.doing}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-sm text-slate-600">Done</div>
            <div className="mt-1 text-2xl font-semibold text-slate-900">{counts.done}</div>
          </div>
        </div>

        {isAdmin && (
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
              <div className="text-base font-semibold text-slate-900">Staff Management</div>
              <div className="grid gap-3 md:grid-cols-4">
                <div>
                  <label className="mb-1 block text-sm text-slate-700">Username</label>
                  <input value={createUser.username} onChange={e=>setCreateUser(v=>({ ...v, username: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="e.g. ali" />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-slate-700">Full Name</label>
                  <input value={createUser.fullName} onChange={e=>setCreateUser(v=>({ ...v, fullName: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Ali" />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-slate-700">Role</label>
                  <select value={createUser.roleId} onChange={e=>setCreateUser(v=>({ ...v, roleId: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
                    {roles.filter(r=>r.id !== 'role_admin').map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm text-slate-700">Password</label>
                  <input value={createUser.password} onChange={e=>setCreateUser(v=>({ ...v, password: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="123" />
                </div>
              </div>
              <div className="flex justify-end">
                <button className="btn" onClick={createStaffUser}>Create Staff</button>
              </div>
              <div className="border rounded-md overflow-auto">
                <table className="min-w-[700px] w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 text-left">User</th>
                      <th className="px-3 py-2 text-left">Role</th>
                      <th className="px-3 py-2 text-left">Active</th>
                      <th className="px-3 py-2">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.filter(u=>!u.isAdmin).length === 0 && (
                      <tr><td colSpan={4} className="px-3 py-6 text-slate-500">No staff users.</td></tr>
                    )}
                    {users.filter(u=>!u.isAdmin).map(u => (
                      <tr key={u.id} className="border-t">
                        <td className="px-3 py-2">{u.fullName || u.username}</td>
                        <td className="px-3 py-2">{roleName(u.roleId)}</td>
                        <td className="px-3 py-2">{u.active === false ? 'No' : 'Yes'}</td>
                        <td className="px-3 py-2">
                          <div className="flex justify-end gap-2">
                            <button className="rounded-md border border-slate-300 px-3 py-2 text-sm" onClick={()=>toggleUserActive(u.id)}>{u.active === false ? 'Enable' : 'Disable'}</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
              <div className="text-base font-semibold text-slate-900">Roles & Templates</div>
              <div className="grid gap-3 md:grid-cols-5">
                <div className="md:col-span-3">
                  <label className="mb-1 block text-sm text-slate-700">New Role Name</label>
                  <input value={createRoleName} onChange={e=>setCreateRoleName(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="e.g. Lab Cleaner" />
                </div>
                <div className="md:col-span-2 flex items-end justify-end">
                  <button className="btn-outline-navy" onClick={createRole}>Add Role</button>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2">
                <div className="text-sm font-semibold text-slate-900">Create Template</div>
                <div className="grid gap-3 md:grid-cols-6">
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-sm text-slate-700">Category</label>
                    <input value={createTpl.category} onChange={e=>setCreateTpl(v=>({ ...v, category: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-sm text-slate-700">Title</label>
                    <input value={createTpl.title} onChange={e=>setCreateTpl(v=>({ ...v, title: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-sm text-slate-700">Role</label>
                    <select value={createTpl.roleId} onChange={e=>setCreateTpl(v=>({ ...v, roleId: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
                      {roles.filter(r=>r.id !== 'role_admin').map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                  </div>
                  <div className="md:col-span-4">
                    <label className="mb-1 block text-sm text-slate-700">Description</label>
                    <input value={createTpl.description} onChange={e=>setCreateTpl(v=>({ ...v, description: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Optional" />
                  </div>
                  <div className="md:col-span-1">
                    <label className="mb-1 block text-sm text-slate-700">Recurring</label>
                    <select value={createTpl.recurring} onChange={e=>setCreateTpl(v=>({ ...v, recurring: e.target.value as any }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
                      <option value="daily">Daily</option>
                      <option value="none">None</option>
                    </select>
                  </div>
                  <div className="md:col-span-1 flex items-end justify-end">
                    <button className="btn" onClick={addTemplate}>Add</button>
                  </div>
                </div>
              </div>

              <div className="border rounded-md overflow-auto">
                <table className="min-w-[900px] w-full text-sm">
                  <thead className="bg-slate-50">
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
                      <tr key={t.id} className="border-t">
                        <td className="px-3 py-2">{t.category}</td>
                        <td className="px-3 py-2">{t.title}</td>
                        <td className="px-3 py-2">{roleName(t.roleId)}</td>
                        <td className="px-3 py-2">{t.recurring || 'none'}</td>
                        <td className="px-3 py-2">{t.active === false ? 'No' : 'Yes'}</td>
                        <td className="px-3 py-2">
                          <div className="flex justify-end gap-2">
                            <button className="rounded-md border border-slate-300 px-3 py-2 text-sm" onClick={()=>toggleTemplateActive(t.id)}>{t.active === false ? 'Enable' : 'Disable'}</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {isAdmin && (
          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
            <div className="text-base font-semibold text-slate-900">Assign Task</div>
            <div className="grid gap-3 md:grid-cols-6">
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm text-slate-700">Staff</label>
                <select value={assign.toUserId} onChange={e=>setAssign(v=>({ ...v, toUserId: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
                  <option value="">Select staff...</option>
                  {users.filter(u=>!u.isAdmin && u.active !== false).map(u => <option key={u.id} value={u.id}>{u.fullName || u.username}</option>)}
                </select>
              </div>
              <div className="md:col-span-3">
                <label className="mb-1 block text-sm text-slate-700">Task Template</label>
                <select value={assign.templateId} onChange={e=>setAssign(v=>({ ...v, templateId: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
                  <option value="">Select task...</option>
                  {templates.filter(t=>t.active !== false).map(t => <option key={t.id} value={t.id}>{t.category}: {t.title}</option>)}
                </select>
              </div>
              <div className="md:col-span-1">
                <label className="mb-1 block text-sm text-slate-700">Due Date</label>
                <input type="date" value={assign.dueDate} onChange={e=>setAssign(v=>({ ...v, dueDate: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button className="btn-outline-navy" onClick={()=>{ if (session?.userId) { runDailyAutoAssign(session.userId); setItems(loadTasks()); showMessage('success','Daily tasks generated for today'); } }}>Generate Today (Auto)</button>
              <button className="btn" onClick={assignTaskFromTemplate}>Assign</button>
            </div>
            <div className="text-xs text-slate-500">Auto daily assignment generates tasks for active staff users based on their role.</div>
          </div>
        )}

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-base font-semibold text-slate-900">Tasks</div>
          {visibleItems.length === 0 ? (
            <div className="mt-3 text-sm text-slate-600">No tasks yet.</div>
          ) : (
            <div className="mt-3 divide-y divide-slate-100">
              {visibleItems.map(it => (
                <div key={it.id} className="py-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-900 truncate">{it.title}</div>
                    {it.description && <div className="text-sm text-slate-600 break-words">{it.description}</div>}
                    <div className="text-xs text-slate-500">Assigned to: {userName(it.assignedToUserId)} · Role: {roleName(it.roleId)} · Due: {it.dueDate || '-'} · By: {userName(it.assignedByUserId)}</div>
                    <div className="text-xs text-slate-500">Created: {new Date(it.createdAt).toLocaleString()}</div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <select value={it.status} onChange={e=>update(it.id, { status: e.target.value as any })} className="rounded-md border border-slate-300 px-2 py-2 text-sm">
                      <option value="todo">Todo</option>
                      <option value="doing">Doing</option>
                      <option value="done">Done</option>
                    </select>
                    {it.status === 'done' ? (
                      <div className="text-xs text-emerald-700">Completed{it.completedAt ? `: ${new Date(it.completedAt).toLocaleString()}` : ''}</div>
                    ) : (
                      <button
                        className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                        onClick={()=>update(it.id, { status: 'done', completedAt: Date.now() })}
                      >
                        Mark Done
                      </button>
                    )}
                    {isAdmin && (
                      <button className="rounded-md border border-slate-300 px-3 py-2 text-sm" onClick={()=>remove(it.id)}>Delete</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
