import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Lock, User } from 'lucide-react'

type TaskUser = {
  id: string
  username: string
  password: string
  fullName?: string
  roleId?: string
  isAdmin?: boolean
  active?: boolean
}

type TaskRole = {
  id: string
  name: string
}

const USERS_KEY = 'task.users'
const ROLES_KEY = 'task.roles'

function safeParse<T>(raw: any, fallback: T): T {
  try {
    if (!raw) return fallback
    const v = JSON.parse(raw)
    return (v as any) ?? fallback
  } catch { return fallback }
}

function seedIfNeeded(){
  const users = safeParse<TaskUser[]>(localStorage.getItem(USERS_KEY), [])
  const roles = safeParse<TaskRole[]>(localStorage.getItem(ROLES_KEY), [])

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

  try {
    if (roles.length === 0) localStorage.setItem(ROLES_KEY, JSON.stringify(nextRoles))
    if (users.length === 0 || !hasAdmin) localStorage.setItem(USERS_KEY, JSON.stringify(nextUsers))
  } catch {}
}

export default function Task_Login(){
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const onSubmit = (e: React.FormEvent)=>{
    e.preventDefault()
    const u = username.trim()
    const p = password
    if (!u || !p) { setError('Username and password are required'); return }
    try { seedIfNeeded() } catch {}
    try {
      const users = safeParse<TaskUser[]>(localStorage.getItem(USERS_KEY), [])
      const found = users.find(x => String(x.username || '').toLowerCase() === u.toLowerCase())
      if (!found || found.active === false) { setError('User not found'); return }
      if (String(found.password || '') !== String(p || '')) { setError('Invalid password'); return }
      const session = { ok: true, at: Date.now(), userId: found.id, username: found.username, fullName: found.fullName, roleId: found.roleId, isAdmin: !!found.isAdmin }
      localStorage.setItem('task.session', JSON.stringify(session))
      navigate('/task')
    } catch {
      setError('Login failed')
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950" />
      <div className="absolute -left-24 top-24 h-40 w-40 rotate-45 rounded-3xl bg-sky-700/20 blur-[1px]" />
      <div className="absolute right-28 top-56 h-16 w-16 rotate-45 rounded-2xl bg-slate-200/10" />
      <div className="absolute right-44 bottom-32 h-20 w-20 rotate-45 rounded-2xl bg-sky-500/10" />

      <div className="relative z-10 flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/10 p-6 shadow-2xl backdrop-blur">
          <div className="flex flex-col items-center text-center">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-b from-sky-400 to-indigo-500 shadow-lg" />
            <div className="mt-4 text-2xl font-extrabold tracking-tight text-white">Task Management</div>
            <div className="mt-1 text-xs text-slate-200/80">Hospital Management System</div>
          </div>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <label className="mb-2 block text-xs font-semibold text-slate-200">Username</label>
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-3 py-2">
                <User className="size-4 text-slate-200/70" />
                <input
                  value={username}
                  onChange={(e)=>setUsername(e.target.value)}
                  className="w-full bg-transparent text-sm text-white placeholder:text-slate-200/40 outline-none"
                  placeholder="Enter your username"
                  autoComplete="username"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold text-slate-200">Password</label>
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-3 py-2">
                <Lock className="size-4 text-slate-200/70" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e)=>setPassword(e.target.value)}
                  className="w-full bg-transparent text-sm text-white placeholder:text-slate-200/40 outline-none"
                  placeholder="Enter your password"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={()=>setShowPassword(v=>!v)}
                  className="rounded-md p-1 text-slate-200/70 hover:text-slate-200"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">{error}</div>
            )}

            <button
              type="submit"
              className="w-full rounded-xl bg-gradient-to-r from-sky-500 to-indigo-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg hover:from-sky-400 hover:to-indigo-400"
            >
              Login
            </button>

            <button
              type="button"
              className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-100 hover:bg-white/10"
              onClick={()=>navigate('/')}
            >
              Back to Portal
            </button>
          </form>

          <div className="mt-6 text-center text-[11px] text-slate-200/50">© 2026</div>
        </div>
      </div>
    </div>
  )
}
