import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { loadRoles, loadSession, loadTasks, loadUsers, saveTasks, seedIfNeeded } from './task_store'
import { CalendarDays, CheckCircle2, ClipboardList, Filter, Search, UserRound } from 'lucide-react'

export default function Task_Tasks(){
  const navigate = useNavigate()
  const [session, setSession] = useState<any>(null)
  const [items, setItems] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [roles, setRoles] = useState<any[]>([])

  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all'|'todo'|'doing'|'done'>('all')

  useEffect(()=>{
    try { seedIfNeeded() } catch {}
    const s = loadSession()
    setSession(s)
    if (!s) { navigate('/task/login', { replace: true }); return }
    setItems(loadTasks())
    setUsers(loadUsers())
    setRoles(loadRoles())
  }, [navigate])

  const isAdmin = !!session?.isAdmin

  const visible = useMemo(()=>{
    if (isAdmin) return items
    const uid = session?.userId
    if (!uid) return []
    return items.filter(x => x.assignedToUserId === uid)
  }, [isAdmin, items, session?.userId])

  const roleName = (roleId?: string)=> roles.find(r => r.id === roleId)?.name || '-'
  const userName = (userId?: string)=>{
    const u = users.find(x => x.id === userId)
    return u?.fullName || u?.username || '-'
  }

  const update = (id: string, patch: any)=>{
    const updated = items.map(it => it.id === id ? { ...it, ...patch } : it)
    setItems(updated)
    saveTasks(updated)
  }

  const remove = (id: string)=>{
    const updated = items.filter(it => it.id !== id)
    setItems(updated)
    saveTasks(updated)
  }

  const counts = useMemo(()=>{
    const c = { todo: 0, doing: 0, done: 0 }
    for (const it of visible) {
      const s = String(it.status || '')
      if (s === 'todo') c.todo++
      else if (s === 'doing') c.doing++
      else if (s === 'done') c.done++
    }
    return c
  }, [visible])

  const badge = (status: 'todo'|'doing'|'done') =>
    status === 'done'
      ? 'inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700'
      : status === 'doing'
        ? 'inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700'
        : 'inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700'

  const filtered = useMemo(()=>{
    const qq = q.trim().toLowerCase()
    return visible.filter((it: any) => {
      if (statusFilter !== 'all' && String(it.status || '') !== statusFilter) return false
      if (!qq) return true
      const hay = `${it.title || ''} ${it.description || ''} ${userName(it.assignedToUserId)} ${roleName(it.roleId)} ${it.dueDate || ''}`.toLowerCase()
      return hay.includes(qq)
    })
  }, [q, roleName, statusFilter, userName, visible])

  const statusLabel = (s: any) => {
    const v = String(s || '').toLowerCase()
    if (v === 'done') return 'Done'
    if (v === 'doing') return 'Doing'
    return 'Todo'
  }

  return (
    <div className="w-full px-4 md:px-6 py-6 space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-2xl font-extrabold tracking-tight text-slate-900">{isAdmin ? 'All Tasks' : 'My Tasks'}</div>
          <div className="text-sm text-slate-600">Search, filter, and update task progress</div>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <button className="btn-outline-navy" onClick={()=>navigate('/task/assign')}>Assign</button>
            <button className="btn-outline-navy" onClick={()=>navigate('/task/staff')}>Staff</button>
          </div>
        )}
      </div>

      {isAdmin && (
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-slate-600">Todo</div>
                <div className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900">{counts.todo}</div>
              </div>
              <div className="h-11 w-11 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center">
                <ClipboardList className="size-5" />
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-slate-600">Doing</div>
                <div className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900">{counts.doing}</div>
              </div>
              <div className="h-11 w-11 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center">
                <Filter className="size-5" />
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-slate-600">Done</div>
                <div className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900">{counts.done}</div>
              </div>
              <div className="h-11 w-11 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <CheckCircle2 className="size-5" />
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div className="grid gap-3 md:grid-cols-12">
          <div className="md:col-span-8">
            <div className="relative">
              <Search className="size-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={q}
                onChange={e=>setQ(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 py-2 text-sm"
                placeholder="Search tasks by title, staff, role, due date..."
              />
            </div>
          </div>
          <div className="md:col-span-4">
            <div className="relative">
              <Filter className="size-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <select
                value={statusFilter}
                onChange={e=>setStatusFilter(e.target.value as any)}
                className="w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 py-2 text-sm"
              >
                <option value="all">All statuses</option>
                <option value="todo">Todo</option>
                <option value="doing">Doing</option>
                <option value="done">Done</option>
              </select>
            </div>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5">
            <div className="text-sm font-semibold text-slate-900">No tasks found</div>
            <div className="mt-1 text-sm text-slate-600">Try clearing filters or search by a different keyword.</div>
          </div>
        ) : (
          <div className="grid gap-4">
            {filtered.map((it: any) => (
              <div key={it.id} className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className={
                  String(it.status || '') === 'done'
                    ? 'h-1 bg-emerald-500'
                    : String(it.status || '') === 'doing'
                      ? 'h-1 bg-amber-500'
                      : 'h-1 bg-slate-400'
                } />

                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="font-semibold text-slate-900 truncate">{it.title}</div>
                        <span className={badge(it.status)}>{statusLabel(it.status)}</span>
                      </div>
                      {it.description && <div className="mt-1 text-sm text-slate-600 break-words line-clamp-2">{it.description}</div>}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-1 text-slate-700">
                      <UserRound className="size-3" />
                      {userName(it.assignedToUserId)}
                    </span>
                    <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2 py-1 text-slate-700">
                      {roleName(it.roleId)}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-1 text-slate-700">
                      <CalendarDays className="size-3" />
                      {it.dueDate || '-'}
                    </span>
                    {isAdmin && (
                      <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-slate-600">
                        By: {userName(it.assignedByUserId)}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <div className="text-xs text-slate-500">Created: {new Date(it.createdAt).toLocaleString()}</div>
                    {it.status === 'done' && (
                      <div className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                        <CheckCircle2 className="size-4" />
                        Completed
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                    <select
                      value={it.status}
                      onChange={e=>update(it.id, { status: e.target.value })}
                      className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                    >
                      <option value="todo">Todo</option>
                      <option value="doing">Doing</option>
                      <option value="done">Done</option>
                    </select>

                    {it.status !== 'done' ? (
                      <button
                        className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                        onClick={()=>update(it.id, { status: 'done', completedAt: Date.now() })}
                      >
                        Mark Done
                      </button>
                    ) : (
                      <button
                        className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50"
                        onClick={()=>update(it.id, { status: 'todo', completedAt: undefined })}
                      >
                        Reopen
                      </button>
                    )}

                    {isAdmin && (
                      <button
                        className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 hover:bg-rose-100"
                        onClick={()=>remove(it.id)}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
