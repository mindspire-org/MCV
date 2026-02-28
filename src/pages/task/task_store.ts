export type TaskSession = {
  ok: boolean
  at: number
  userId: string
  username: string
  fullName?: string
  roleId?: string
  isAdmin?: boolean
}

export type TaskRole = {
  id: string
  name: string
}

export type TaskUser = {
  id: string
  username: string
  password: string
  fullName?: string
  roleId?: string
  isAdmin?: boolean
  active?: boolean
}

export type TaskTemplate = {
  id: string
  category: string
  title: string
  description?: string
  roleId?: string
  recurring?: 'daily' | 'none'
  active?: boolean
}

export type TaskItem = {
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

export const TASKS_KEY = 'task.items'
export const USERS_KEY = 'task.users'
export const ROLES_KEY = 'task.roles'
export const TEMPLATES_KEY = 'task.templates'
export const DAILY_RUN_KEY = 'task.daily.lastRun'

export function safeParse<T>(raw: any, fallback: T): T {
  try {
    if (!raw) return fallback
    const v = JSON.parse(raw)
    return (v as any) ?? fallback
  } catch { return fallback }
}

export function save<T>(key: string, v: T){
  try { localStorage.setItem(key, JSON.stringify(v)) } catch {}
}

export function todayIso(){
  return new Date().toISOString().slice(0,10)
}

export function seedIfNeeded(){
  const roles = safeParse<TaskRole[]>(localStorage.getItem(ROLES_KEY), [])
  const users = safeParse<TaskUser[]>(localStorage.getItem(USERS_KEY), [])
  const templates = safeParse<TaskTemplate[]>(localStorage.getItem(TEMPLATES_KEY), [])

  const defaultRoles: TaskRole[] = [
    { id: 'role_admin', name: 'Admin' },
    { id: 'role_administrator', name: 'Administrator' },
    { id: 'role_department_head', name: 'Department Head' },
    { id: 'role_supervisor', name: 'Supervisor' },
    { id: 'role_operational_staff', name: 'Operational Staff' },
    { id: 'role_fleet_manager', name: 'Fleet Manager' },
    { id: 'role_security_officer', name: 'Security Officer' },
    { id: 'role_infra', name: 'Infrastructure & Utilities' },
    { id: 'role_housekeeping', name: 'Housekeeping & Hygiene' },
    { id: 'role_security', name: 'Security & Safety' },
    { id: 'role_fleet', name: 'Vehicles & Fleet' },
    { id: 'role_washroom_cleaner', name: 'Washroom Cleaner' },
  ]

  const byId = new Map<string, TaskRole>()
  for (const r of (Array.isArray(roles) ? roles : [])) {
    const id = String((r as any)?.id || '').trim()
    if (!id) continue
    byId.set(id, r)
  }
  let rolesChanged = false
  for (const r of defaultRoles) {
    if (!byId.has(r.id)) { byId.set(r.id, r); rolesChanged = true }
  }
  const nextRoles = Array.from(byId.values())

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

  if (roles.length === 0 || rolesChanged) save(ROLES_KEY, nextRoles)
  if (users.length === 0 || !hasAdmin) save(USERS_KEY, nextUsers)
  if (templates.length === 0) save(TEMPLATES_KEY, nextTemplates)
}

export function loadSession(): TaskSession | null {
  const s = safeParse<any>(localStorage.getItem('task.session'), null)
  if (!s?.ok || !s?.userId) return null
  return s as TaskSession
}

export function loadRoles(): TaskRole[] {
  const r = safeParse<TaskRole[]>(localStorage.getItem(ROLES_KEY), [])
  return Array.isArray(r) ? r : []
}

export function loadUsers(): TaskUser[] {
  const u = safeParse<TaskUser[]>(localStorage.getItem(USERS_KEY), [])
  return Array.isArray(u) ? u : []
}

export function loadTemplates(): TaskTemplate[] {
  const t = safeParse<TaskTemplate[]>(localStorage.getItem(TEMPLATES_KEY), [])
  return Array.isArray(t) ? t : []
}

export function loadTasks(): TaskItem[] {
  const v = safeParse<TaskItem[]>(localStorage.getItem(TASKS_KEY), [])
  return Array.isArray(v) ? v : []
}

export function saveTasks(items: TaskItem[]) {
  save(TASKS_KEY, items)
}

export function runDailyAutoAssign(currentUserId: string){
  const t = todayIso()
  const last = String(localStorage.getItem(DAILY_RUN_KEY) || '')
  if (last === t) return

  const users = loadUsers()
  const templates = loadTemplates()
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
