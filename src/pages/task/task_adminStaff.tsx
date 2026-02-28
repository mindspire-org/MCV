import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { loadRoles, loadSession, loadUsers, save, seedIfNeeded, USERS_KEY } from './task_store'

export default function Task_AdminStaff(){
  const navigate = useNavigate()
  const [session, setSession] = useState<any>(null)
  const [users, setUsers] = useState<any[]>([])
  const [roles, setRoles] = useState<any[]>([])
  const [msg, setMsg] = useState<{ type: 'info'|'error'|'success'; text: string } | null>(null)

  const [createUser, setCreateUser] = useState({ username: '', password: '123', fullName: '', roleId: 'role_housekeeping', active: true })

  useEffect(()=>{
    try { seedIfNeeded() } catch {}
    const s = loadSession()
    setSession(s)
    if (!s) { navigate('/task/login', { replace: true }); return }
    if (!s.isAdmin) { navigate('/task', { replace: true }); return }
    setUsers(loadUsers())
    setRoles(loadRoles())
  }, [navigate])

  function showMessage(type: 'info'|'error'|'success', text: string){
    setMsg({ type, text })
    try {
      window.clearTimeout((showMessage as any)._t)
      ;(showMessage as any)._t = window.setTimeout(()=>setMsg(null), 3500)
    } catch {}
  }

  const staff = useMemo(()=> users.filter(u => !u.isAdmin), [users])

  const selectableRoles = useMemo(() => {
    const allowed = new Set([
      'role_operational_staff',
      'role_fleet_manager',
      'role_security_officer',
      'role_infra',
      'role_housekeeping',
      'role_security',
      'role_fleet',
      'role_washroom_cleaner',
    ])
    return roles.filter((r: any) => allowed.has(String(r.id || '')))
  }, [roles])

  const roleName = (roleId?: string)=> roles.find(r => r.id === roleId)?.name || '-'

  const createStaffUser = ()=>{
    const u = createUser.username.trim()
    const p = String(createUser.password || '').trim()
    if (!u || !p) { showMessage('error', 'Username and password required'); return }
    if (users.some(x => String(x.username || '').toLowerCase() === u.toLowerCase())) { showMessage('error', 'Username already exists'); return }

    const next = {
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
    showMessage('success', 'Staff created')
  }

  const toggleUserActive = (id: string)=>{
    const updated = users.map(u => u.id === id ? { ...u, active: u.active === false ? true : false } : u)
    setUsers(updated)
    save(USERS_KEY, updated)
  }

  return (
    <div className="mx-auto max-w-6xl px-4 md:px-6 py-6 space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-2xl font-bold text-slate-900">Staff</div>
          <div className="text-sm text-slate-600">Create users and assign roles</div>
        </div>
        <div className="flex gap-2">
          <button className="btn-outline-navy" onClick={()=>navigate('/task/templates')}>Templates</button>
          <button className="btn-outline-navy" onClick={()=>navigate('/task/assign')}>Assign</button>
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

      <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
        <div className="text-base font-semibold text-slate-900">Create Staff</div>
        <div className="grid gap-3 md:grid-cols-4">
          <div>
            <label className="mb-1 block text-sm text-slate-700">Username</label>
            <input value={createUser.username} onChange={e=>setCreateUser(v=>({ ...v, username: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="e.g. washroom1" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-700">Full Name</label>
            <input value={createUser.fullName} onChange={e=>setCreateUser(v=>({ ...v, fullName: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Name" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-700">Role</label>
            <select value={createUser.roleId} onChange={e=>setCreateUser(v=>({ ...v, roleId: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
              {selectableRoles.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-700">Password</label>
            <input value={createUser.password} onChange={e=>setCreateUser(v=>({ ...v, password: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="123" />
          </div>
        </div>
        <div className="flex justify-end">
          <button className="btn" onClick={createStaffUser}>Create</button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
        <div className="text-base font-semibold text-slate-900">Staff List</div>
        <div className="border rounded-md overflow-auto">
          <table className="min-w-[800px] w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left">User</th>
                <th className="px-3 py-2 text-left">Role</th>
                <th className="px-3 py-2 text-left">Active</th>
                <th className="px-3 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {staff.length === 0 && (
                <tr><td colSpan={4} className="px-3 py-6 text-slate-500">No staff users.</td></tr>
              )}
              {staff.map(u => (
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
    </div>
  )
}
