import { useEffect, useMemo, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Menu, X, ClipboardList, LayoutDashboard, LogOut, ShieldCheck, Users, Wrench } from 'lucide-react'
import { loadSession, seedIfNeeded } from './task_store'

type NavItem = { to: string; label: string; icon: any; adminOnly?: boolean }

export default function Task_Layout(){
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [session, setSession] = useState<any>(null)
  const [collapsed, setCollapsed] = useState<boolean>(()=>{
    try { return localStorage.getItem('task.sidebar_collapsed') === '1' } catch { return false }
  })

  useEffect(()=>{
    try { seedIfNeeded() } catch {}
    const s = loadSession()
    setSession(s)
    if (!s) navigate('/task/login', { replace: true })
  }, [navigate])

  useEffect(()=>{
    try { localStorage.setItem('task.sidebar_collapsed', collapsed ? '1' : '0') } catch {}
  }, [collapsed])

  const isAdmin = !!session?.isAdmin

  const navItems = useMemo<NavItem[]>(()=>[
    { to: '/task', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/task/tasks', label: 'My Tasks', icon: ClipboardList },
    { to: '/task/assign', label: 'Assign', icon: ShieldCheck, adminOnly: true },
    { to: '/task/templates', label: 'Templates', icon: Wrench, adminOnly: true },
    { to: '/task/maintenance/assets', label: 'Maintenance', icon: Wrench, adminOnly: true },
  ], [])

  const visibleNav = navItems.filter(n => !n.adminOnly || isAdmin)

  const logout = ()=>{
    try { localStorage.removeItem('task.session') } catch {}
    navigate('/task/login')
  }

  const linkBase = collapsed
    ? 'flex items-center justify-center rounded-xl px-3 py-2 text-sm font-medium'
    : 'flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium'
  const linkActive = 'bg-slate-900 text-white'
  const linkInactive = 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'

  return (
    <div className="h-dvh bg-slate-50 text-slate-900">
      <div className="sticky top-0 z-20 w-full md:border-b" style={{ background: 'linear-gradient(180deg, var(--navy) 0%, var(--navy-700) 100%)', borderColor: 'rgba(255,255,255,0.12)' }}>
        <div className="px-4 md:px-6">
          <div className="flex h-14 items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={()=>setCollapsed(v=>!v)}
                className="hidden md:inline-flex items-center justify-center rounded-lg border border-white/20 bg-white/10 px-2.5 py-2 text-white hover:bg-white/15"
                title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {collapsed ? <Menu className="size-4" /> : <X className="size-4" />}
              </button>
              <div className="h-9 w-9 rounded-xl bg-white/10 border border-white/15" />
              <div className="leading-tight">
                <div className="text-sm font-extrabold tracking-tight text-white">Task Portal</div>
                <div className="text-[11px] text-white/70">{session?.fullName || session?.username || ''}{isAdmin ? ' · Admin' : ''}</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={logout} className="hidden md:inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/15">
                <LogOut className="size-4" />
                Logout
              </button>
              <button onClick={logout} className="md:hidden inline-flex items-center justify-center rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/15">
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex">
        <aside className={collapsed ? 'hidden md:block w-20 shrink-0' : 'hidden md:block w-72 shrink-0'}>
            <div className="sticky top-14">
              <div className="h-[calc(100dvh-56px)] bg-white border-r border-slate-200 rounded-none md:rounded-r-2xl overflow-hidden shadow-sm">
                <div className="p-4 border-b border-slate-100">
                  <div className={collapsed ? 'text-[10px] font-semibold uppercase tracking-wide text-slate-500 text-center' : 'text-xs font-semibold uppercase tracking-wide text-slate-500'}>
                    {collapsed ? 'Menu' : 'Navigation'}
                  </div>
                </div>

                <nav className="p-3 space-y-1">
                  {visibleNav.map(n => {
                    const Icon = n.icon
                    return (
                      <NavLink
                        key={n.to}
                        to={n.to}
                        end={n.to === '/task'}
                        className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`}
                      >
                        <Icon className="size-4" />
                        {!collapsed && <span className="truncate">{n.label}</span>}
                      </NavLink>
                    )
                  })}

                  {isAdmin && (
                    <div className="pt-3">
                      {!collapsed && (
                        <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Staff Management</div>
                      )}
                      <div className="space-y-1">
                        <NavLink
                          to="/task/staff/dashboard"
                          className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`}
                        >
                          <Users className="size-4" />
                          {!collapsed && <span className="truncate">Staff Dashboard</span>}
                        </NavLink>

                        <NavLink
                          to="/task/staff/attendance"
                          className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`}
                        >
                          <Users className="size-4" />
                          {!collapsed && <span className="truncate">Staff Attendance</span>}
                        </NavLink>

                        <NavLink
                          to="/task/staff/monthly"
                          className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`}
                        >
                          <Users className="size-4" />
                          {!collapsed && <span className="truncate">Staff Monthly</span>}
                        </NavLink>

                        <NavLink
                          to="/task/staff/settings"
                          className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`}
                        >
                          <Users className="size-4" />
                          {!collapsed && <span className="truncate">Staff Settings</span>}
                        </NavLink>

                        <NavLink
                          to="/task/staff/management"
                          className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`}
                        >
                          <Users className="size-4" />
                          {!collapsed && <span className="truncate">Staff Management</span>}
                        </NavLink>
                      </div>
                      {!collapsed && pathname.startsWith('/task/staff') && (
                        <div className="px-3 pt-2 text-[11px] text-slate-400">Using Hospital staff backend APIs.</div>
                      )}
                    </div>
                  )}
                </nav>

                <div className="p-3 border-t border-slate-100">
                  <button onClick={logout} className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50">
                    <LogOut className="size-4" />
                    {!collapsed && 'Logout'}
                  </button>
                </div>
              </div>
            </div>
          </aside>

        <main className={collapsed ? 'w-full flex-1 py-6 px-4 md:px-6' : 'w-full flex-1 py-6 px-4 md:px-6'}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
