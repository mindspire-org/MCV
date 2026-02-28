import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { loadRoles, loadSession, loadTasks, loadUsers, runDailyAutoAssign, seedIfNeeded, todayIso } from './task_store'
import { hospitalApi } from '../../utils/api'
import { BarChart3, CalendarDays, CheckCircle2, ClipboardList, Clock3, TrendingUp, Users } from 'lucide-react'

export default function Task_Dashboard(){
  const navigate = useNavigate()
  const [session, setSession] = useState<any>(null)
  const [items, setItems] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [roles, setRoles] = useState<any[]>([])
  const [staffToday, setStaffToday] = useState<{ total: number; present: number; absent: number; leave: number } | null>(null)
  const [staffTodayLoading, setStaffTodayLoading] = useState(false)

  useEffect(()=>{
    try { seedIfNeeded() } catch {}
    const s = loadSession()
    setSession(s)
    if (!s) { navigate('/task/login', { replace: true }); return }
    if (s?.userId) {
      try { runDailyAutoAssign(s.userId) } catch {}
    }
    setItems(loadTasks())
    setUsers(loadUsers())
    setRoles(loadRoles())
  }, [navigate])

  const isAdmin = !!session?.isAdmin

  const hasHospitalToken = useMemo(()=>{
    try { return !!(localStorage.getItem('hospital.token') || localStorage.getItem('token')) } catch { return false }
  }, [])

  const visible = useMemo(()=>{
    if (isAdmin) return items
    const uid = session?.userId
    if (!uid) return []
    return items.filter(x => x.assignedToUserId === uid)
  }, [isAdmin, items, session?.userId])

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

  const todays = useMemo(()=>{
    const t = todayIso()
    return visible.filter(x => (x.dueDate || '') === t)
  }, [visible])

  const last7 = useMemo(()=>{
    const end = new Date()
    const days: string[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(end)
      d.setDate(d.getDate() - i)
      days.push(d.toISOString().slice(0, 10))
    }
    const byDay = new Map<string, { total: number; done: number }>()
    for (const day of days) byDay.set(day, { total: 0, done: 0 })
    for (const it of visible) {
      const day = String(it.dueDate || '')
      if (!byDay.has(day)) continue
      const row = byDay.get(day)!
      row.total += 1
      if (String(it.status || '') === 'done') row.done += 1
    }
    return days.map(day => ({ day, ...(byDay.get(day) || { total: 0, done: 0 }) }))
  }, [visible])

  const donut = useMemo(()=>{
    const total = Math.max(1, counts.todo + counts.doing + counts.done)
    return {
      total,
      todo: counts.todo,
      doing: counts.doing,
      done: counts.done,
    }
  }, [counts])

  const staffOnly = useMemo(()=> users.filter(u => !u.isAdmin && u.active !== false), [users])

  useEffect(()=>{
    if (!isAdmin) return
    if (!hasHospitalToken) {
      setStaffToday(null)
      return
    }
    const run = async ()=>{
      setStaffTodayLoading(true)
      try{
        const date = todayIso()
        const [staffRes, attRes]: any[] = await Promise.all([
          (hospitalApi as any).listStaff(),
          (hospitalApi as any).listAttendance({ date, limit: 1000 }),
        ])
        const staffRows: any[] = (staffRes?.staff || staffRes?.items || staffRes || [])
        const total = staffRows.length
        const attItems: any[] = (attRes?.items || [])
        const byStaff = new Map<string, any>()
        for (const a of attItems) {
          const sid = String(a?.staffId || '')
          if (!sid) continue
          if (!byStaff.has(sid)) byStaff.set(sid, a)
        }
        let present = 0
        let absent = 0
        let leave = 0
        for (const s of staffRows) {
          const sid = String(s?._id || s?.id || '')
          const rec = byStaff.get(sid)
          const st = String(rec?.status || '')
          if (st === 'present') present += 1
          else if (st === 'absent') absent += 1
          else if (st === 'leave') leave += 1
        }
        setStaffToday({ total, present, absent, leave })
      } catch {
        setStaffToday(null)
      } finally {
        setStaffTodayLoading(false)
      }
    }
    run()
  }, [hasHospitalToken, isAdmin])

  const staffSummaryToday = useMemo(()=>{
    const t = todayIso()
    const rows = [] as Array<{ userId: string; todo: number; doing: number; done: number; total: number }>
    for (const u of staffOnly){
      const its = items.filter(x => x.assignedToUserId === u.id && (x.dueDate || '') === t)
      const c = { todo: 0, doing: 0, done: 0 }
      for (const it of its) {
        const s = String(it.status || '')
        if (s === 'todo') c.todo++
        else if (s === 'doing') c.doing++
        else if (s === 'done') c.done++
      }
      rows.push({ userId: u.id, ...c, total: its.length })
    }
    return rows.sort((a,b)=> (b.total - a.total) || (b.done - a.done))
  }, [items, staffOnly])

  const staffSummaryAll = useMemo(()=>{
    const rows = [] as Array<{ userId: string; todo: number; doing: number; done: number; total: number }>
    for (const u of staffOnly){
      const its = items.filter(x => x.assignedToUserId === u.id)
      const c = { todo: 0, doing: 0, done: 0 }
      for (const it of its) {
        const s = String(it.status || '')
        if (s === 'todo') c.todo++
        else if (s === 'doing') c.doing++
        else if (s === 'done') c.done++
      }
      rows.push({ userId: u.id, ...c, total: its.length })
    }
    return rows.sort((a,b)=> (b.total - a.total) || (b.done - a.done))
  }, [items, staffOnly])

  const roleName = (roleId?: string)=> roles.find(r => r.id === roleId)?.name || '-'
  const userName = (userId?: string)=>{
    const u = users.find(x => x.id === userId)
    return u?.fullName || u?.username || '-'
  }

  const statusBadge = (status: string)=>{
    const s = String(status || '').toLowerCase()
    if (s === 'done') return 'inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700'
    if (s === 'doing') return 'inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700'
    return 'inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700'
  }

  return (
    <div className="w-full px-4 md:px-6 py-6 space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-2xl font-extrabold tracking-tight text-slate-900">Dashboard</div>
          <div className="text-sm text-slate-600">{isAdmin ? 'Overview of all tasks' : 'Your task summary'} · {session?.fullName || session?.username || ''}</div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-violet-50 text-violet-700 flex items-center justify-center">
                <BarChart3 className="size-5" />
              </div>
              <div>
                <div className="text-base font-semibold text-slate-900">Last 7 Days</div>
                <div className="text-xs text-slate-500">Completion trend (Done vs Total by due date)</div>
              </div>
            </div>
            <div className="inline-flex items-center gap-2 text-xs text-slate-500">
              <TrendingUp className="size-4" />
              {last7.reduce((a,b)=>a+b.done,0)}/{last7.reduce((a,b)=>a+b.total,0)} done
            </div>
          </div>

          <div className="mt-4">
            <div className="grid grid-cols-7 gap-2 items-end">
              {last7.map(d => {
                const pct = d.total ? (d.done / d.total) : 0
                const h = 72
                const bar = Math.max(6, Math.round(pct * h))
                return (
                  <div key={d.day} className="text-center">
                    <div className="h-[84px] flex items-end justify-center">
                      <div className="w-full max-w-[32px] rounded-xl bg-slate-100 overflow-hidden">
                        <div className="w-full rounded-xl bg-emerald-600" style={{ height: `${bar}px` }} />
                      </div>
                    </div>
                    <div className="mt-2 text-[11px] text-slate-500">{d.day.slice(5)}</div>
                    <div className="text-[11px] font-semibold text-slate-700">{d.done}/{d.total}</div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="size-5" />
            </div>
            <div>
              <div className="text-base font-semibold text-slate-900">Status Mix</div>
              <div className="text-xs text-slate-500">Todo / Doing / Done</div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4 items-center">
            <div className="relative mx-auto" style={{ width: 120, height: 120 }}>
              <svg width="120" height="120" viewBox="0 0 120 120" className="block">
                <circle cx="60" cy="60" r="46" fill="none" stroke="#e2e8f0" strokeWidth="12" />
                {(() => {
                  const r = 46
                  const c = 2 * Math.PI * r
                  const seg1 = (donut.todo / donut.total) * c
                  const seg2 = (donut.doing / donut.total) * c
                  const seg3 = (donut.done / donut.total) * c
                  const o1 = 0
                  const o2 = seg1
                  const o3 = seg1 + seg2
                  return (
                    <>
                      <circle cx="60" cy="60" r={r} fill="none" stroke="#334155" strokeWidth="12" strokeLinecap="round" strokeDasharray={`${seg1} ${c-seg1}`} strokeDashoffset={-o1} transform="rotate(-90 60 60)" />
                      <circle cx="60" cy="60" r={r} fill="none" stroke="#d97706" strokeWidth="12" strokeLinecap="round" strokeDasharray={`${seg2} ${c-seg2}`} strokeDashoffset={-o2} transform="rotate(-90 60 60)" />
                      <circle cx="60" cy="60" r={r} fill="none" stroke="#059669" strokeWidth="12" strokeLinecap="round" strokeDasharray={`${seg3} ${c-seg3}`} strokeDashoffset={-o3} transform="rotate(-90 60 60)" />
                    </>
                  )
                })()}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-2xl font-extrabold text-slate-900">{counts.done}</div>
                <div className="text-xs text-slate-500">done</div>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-slate-700" />Todo</span>
                <span className="font-semibold text-slate-900">{counts.todo}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-amber-600" />Doing</span>
                <span className="font-semibold text-slate-900">{counts.doing}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-600" />Done</span>
                <span className="font-semibold text-slate-900">{counts.done}</span>
              </div>
              <div className="pt-2 text-xs text-slate-500">Total: {counts.todo + counts.doing + counts.done}</div>
            </div>
          </div>
        </div>
      </div>

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
          <div className="mt-3 h-1.5 w-full rounded-full bg-slate-100">
            <div className="h-1.5 rounded-full bg-slate-700" style={{ width: `${Math.min(100, (counts.todo + counts.doing + counts.done) ? (counts.todo / (counts.todo + counts.doing + counts.done)) * 100 : 0)}%` }} />
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-slate-600">Doing</div>
              <div className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900">{counts.doing}</div>
            </div>
            <div className="h-11 w-11 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <Clock3 className="size-5" />
            </div>
          </div>
          <div className="mt-3 h-1.5 w-full rounded-full bg-slate-100">
            <div className="h-1.5 rounded-full bg-amber-600" style={{ width: `${Math.min(100, (counts.todo + counts.doing + counts.done) ? (counts.doing / (counts.todo + counts.doing + counts.done)) * 100 : 0)}%` }} />
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
          <div className="mt-3 h-1.5 w-full rounded-full bg-slate-100">
            <div className="h-1.5 rounded-full bg-emerald-600" style={{ width: `${Math.min(100, (counts.todo + counts.doing + counts.done) ? (counts.done / (counts.todo + counts.doing + counts.done)) * 100 : 0)}%` }} />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center">
              <CalendarDays className="size-5" />
            </div>
            <div>
              <div className="text-base font-semibold text-slate-900">Today</div>
              <div className="text-xs text-slate-500">{todayIso()}</div>
            </div>
          </div>
          <button className="btn-outline-navy text-xs" onClick={()=>navigate('/task/tasks')}>View all</button>
        </div>

        {todays.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4">
            <div className="text-sm font-semibold text-slate-900">No tasks due today</div>
            <div className="mt-1 text-sm text-slate-600">You’re all clear for today. Use “Open Tasks” to view everything assigned.</div>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {todays.slice(0, 8).map((it: any) => (
              <div key={it.id} className="py-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="font-semibold text-slate-900 truncate">{it.title}</div>
                    <span className={statusBadge(it.status)}>{String(it.status || '').toUpperCase()}</span>
                  </div>
                  <div className="text-xs text-slate-500">Assigned to: {userName(it.assignedToUserId)} · Role: {roleName(it.roleId)}</div>
                </div>
                <div className="text-xs text-slate-500">Created: {new Date(it.createdAt).toLocaleString()}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {isAdmin && (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <Users className="size-5" />
              </div>
              <div>
                <div className="text-base font-semibold text-slate-900">Today Staff</div>
                <div className="text-xs text-slate-500">Present / Absent (Hospital attendance)</div>
              </div>
            </div>

            {!hasHospitalToken ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4">
                <div className="text-sm font-semibold text-slate-900">Hospital token not found</div>
                <div className="mt-1 text-sm text-slate-600">Login to Hospital portal once to enable attendance stats on this dashboard.</div>
              </div>
            ) : staffTodayLoading ? (
              <div className="text-sm text-slate-600">Loading attendance...</div>
            ) : staffToday ? (
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="text-xs text-slate-500">Present</div>
                  <div className="mt-1 text-2xl font-extrabold text-emerald-700">{staffToday.present}</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="text-xs text-slate-500">Absent</div>
                  <div className="mt-1 text-2xl font-extrabold text-rose-700">{staffToday.absent}</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="text-xs text-slate-500">Leave</div>
                  <div className="mt-1 text-2xl font-extrabold text-amber-700">{staffToday.leave}</div>
                </div>
                <div className="col-span-3 text-xs text-slate-500">Total staff: {staffToday.total} · {todayIso()}</div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4">
                <div className="text-sm font-semibold text-slate-900">Attendance not available</div>
                <div className="mt-1 text-sm text-slate-600">Check backend or permissions for `/api/hospital/attendance`.</div>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
                <Users className="size-5" />
              </div>
              <div className="text-base font-semibold text-slate-900">Staff Status (Today)</div>
            </div>
            <div className="border rounded-xl overflow-auto">
              <table className="min-w-[700px] w-full text-sm">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left">Staff</th>
                    <th className="px-3 py-2 text-right">Todo</th>
                    <th className="px-3 py-2 text-right">Doing</th>
                    <th className="px-3 py-2 text-right">Done</th>
                    <th className="px-3 py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {staffSummaryToday.length === 0 && (
                    <tr><td colSpan={5} className="px-3 py-10 text-slate-500">No staff users. Create staff from Task Portal “Staff” page.</td></tr>
                  )}
                  {staffSummaryToday.map(r => (
                    <tr key={r.userId} className="border-t hover:bg-slate-50">
                      <td className="px-3 py-2 font-medium text-slate-900">{userName(r.userId)} <span className="text-xs text-slate-500">({roleName(users.find(u=>u.id===r.userId)?.roleId)})</span></td>
                      <td className="px-3 py-2 text-right">{r.todo}</td>
                      <td className="px-3 py-2 text-right">{r.doing}</td>
                      <td className="px-3 py-2 text-right">{r.done}</td>
                      <td className="px-3 py-2 text-right font-semibold">{r.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
                <Users className="size-5" />
              </div>
              <div className="text-base font-semibold text-slate-900">Staff Status (All)</div>
            </div>
            <div className="border rounded-xl overflow-auto">
              <table className="min-w-[700px] w-full text-sm">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left">Staff</th>
                    <th className="px-3 py-2 text-right">Todo</th>
                    <th className="px-3 py-2 text-right">Doing</th>
                    <th className="px-3 py-2 text-right">Done</th>
                    <th className="px-3 py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {staffSummaryAll.length === 0 && (
                    <tr><td colSpan={5} className="px-3 py-10 text-slate-500">No staff users. Create staff from Task Portal “Staff” page.</td></tr>
                  )}
                  {staffSummaryAll.map(r => (
                    <tr key={r.userId} className="border-t hover:bg-slate-50">
                      <td className="px-3 py-2 font-medium text-slate-900">{userName(r.userId)} <span className="text-xs text-slate-500">({roleName(users.find(u=>u.id===r.userId)?.roleId)})</span></td>
                      <td className="px-3 py-2 text-right">{r.todo}</td>
                      <td className="px-3 py-2 text-right">{r.doing}</td>
                      <td className="px-3 py-2 text-right">{r.done}</td>
                      <td className="px-3 py-2 text-right font-semibold">{r.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
