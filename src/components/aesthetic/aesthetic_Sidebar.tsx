import { NavLink, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { LayoutDashboard, CalendarCheck, Users, Settings as Cog, Sparkles, History, FileText, Boxes, Truck, Receipt, UserCog, ScrollText, Bell, ChevronDown, ChevronRight } from 'lucide-react'
import { aestheticApi } from '../../utils/api'

type Item = { to: string; label: string; end?: boolean; icon: any }
const nav: Item[] = [
  { to: '/aesthetic', label: 'Dashboard', end: true, icon: LayoutDashboard },
  { to: '/aesthetic/token-generator', label: 'Token Generation', icon: CalendarCheck },
  { to: '/aesthetic/token-history', label: 'Token History', icon: History },
  { to: '/aesthetic/procedure-catalog', label: 'Procedure Catalog', icon: Sparkles },
  { to: '/aesthetic/reports', label: 'Reports', icon: FileText },
  { to: '/aesthetic/patients', label: 'Patients', icon: Users },
  { to: '/aesthetic/inventory', label: 'Inventory', icon: Boxes },
  { to: '/aesthetic/suppliers', label: 'Suppliers', icon: Truck },
  { to: '/aesthetic/supplier-returns', label: 'Supplier Returns', icon: FileText },
  { to: '/aesthetic/purchase-history', label: 'Purchase History', icon: History },
  { to: '/aesthetic/return-history', label: 'Return History', icon: History },
  { to: '/aesthetic/expenses', label: 'Expenses', icon: Receipt },
  { to: '/aesthetic/doctor-management', label: 'Doctor Management', icon: Users },
  { to: '/aesthetic/doctor-finance', label: 'Doctor Finance', icon: FileText },
  { to: '/aesthetic/doctor-payouts', label: 'Doctor Payouts', icon: Receipt },
  { to: '/aesthetic/staff-attendance', label: 'Staff Attendance', icon: CalendarCheck },
  { to: '/aesthetic/staff-management', label: 'Staff Management', icon: UserCog },
  { to: '/aesthetic/staff-settings', label: 'Staff Settings', icon: Cog },
  { to: '/aesthetic/staff-monthly', label: 'Staff Monthly', icon: CalendarCheck },
  { to: '/aesthetic/audit-logs', label: 'Audit Logs', icon: ScrollText },
  { to: '/aesthetic/user-management', label: 'User Management', icon: UserCog },
  { to: '/aesthetic/notifications', label: 'Notifications', icon: Bell },
  { to: '/aesthetic/consent-templates', label: 'Consent Templates', icon: FileText },
  { to: '/aesthetic/sidebar-permissions', label: 'Sidebar Permissions', icon: Cog },
  
  { to: '/aesthetic/settings', label: 'Settings', icon: Cog },
]

export const aestheticSidebarNav = nav

export default function Aesthetic_Sidebar({ collapsed = false }: { collapsed?: boolean }) {
  const navigate = useNavigate()
  const [username, setUsername] = useState<string>('')
  const [role, setRole] = useState<string>('admin')
  const [items, setItems] = useState(nav)
  const [doctorOpen, setDoctorOpen] = useState<boolean>(()=>{ try { return localStorage.getItem('aesthetic.sidebar.doctorOpen') !== 'false' } catch { return true } })
  const [staffOpen, setStaffOpen] = useState<boolean>(()=>{ try { return localStorage.getItem('aesthetic.sidebar.staffOpen') !== 'false' } catch { return true } })
  useEffect(()=>{ try { localStorage.setItem('aesthetic.sidebar.doctorOpen', String(doctorOpen)) } catch {} }, [doctorOpen])
  useEffect(()=>{ try { localStorage.setItem('aesthetic.sidebar.staffOpen', String(staffOpen)) } catch {} }, [staffOpen])
  useEffect(()=>{
    try {
      const raw = localStorage.getItem('aesthetic.session')
      if (raw) {
        const s = JSON.parse(raw||'{}')
        setUsername(String(s?.username||''))
        if (s?.role) setRole(String(s.role).toLowerCase())
      }
    } catch {}
  }, [])
  const logout = async () => {
    try { await aestheticApi.logout() } catch {}
    try {
      localStorage.removeItem('aesthetic.session')
      localStorage.removeItem('aesthetic.token')
      localStorage.removeItem('token')
    } catch {}
    navigate('/aesthetic/login')
  }
  useEffect(()=>{
    let mounted = true
    ;(async()=>{
      try{
        const res: any = await (aestheticApi as any).listSidebarPermissions(role)
        const doc = Array.isArray(res) ? res[0] : res
        const map = new Map<string, any>()
        const perms = (doc?.permissions || []) as Array<{ path: string; visible?: boolean; order?: number }>
        for (const p of perms) map.set(p.path, p)
        const computed = nav
          .filter(item => {
            if (item.to === '/aesthetic/sidebar-permissions' && String(role||'').toLowerCase() !== 'admin') return false
            const perm = map.get(item.to)
            return perm ? perm.visible !== false : true
          })
          .sort((a,b)=>{
            const oa = map.get(a.to)?.order ?? Number.MAX_SAFE_INTEGER
            const ob = map.get(b.to)?.order ?? Number.MAX_SAFE_INTEGER
            if (oa !== ob) return oa - ob
            const ia = nav.findIndex(n => n.to === a.to)
            const ib = nav.findIndex(n => n.to === b.to)
            return ia - ib
          })
        if (mounted) setItems(computed)
      } catch { if (mounted) setItems(nav) }
    })()
    return ()=>{ mounted = false }
  }, [role])
  const width = collapsed ? 'md:w-16' : 'md:w-64'
  const doctorSet = new Set<string>(['/aesthetic/doctor-management','/aesthetic/doctor-finance','/aesthetic/doctor-payouts'])
  const staffSet = new Set<string>(['/aesthetic/staff-management','/aesthetic/staff-attendance','/aesthetic/staff-settings','/aesthetic/staff-monthly'])

  const renderLink = (item: Item) => {
    const Icon = item.icon
    return (
      <NavLink
        key={item.to}
        to={item.to}
        title={collapsed ? item.label : undefined}
        className={({ isActive }) => `rounded-md px-3 py-2 text-sm font-medium flex items-center ${collapsed?'justify-center gap-0':'gap-2'} ${isActive ? 'bg-white/10 text-white' : 'text-white/80 hover:bg-white/5'}`}
        end={item.end}
      >
        <Icon className="h-4 w-4" />
        {!collapsed && <span>{item.label}</span>}
      </NavLink>
    )
  }

  const renderGroup = (key: 'doctor'|'staff', label: string, IconComp: any, open: boolean, setOpenFn: (v: boolean)=>void, groupItems: Item[]) => {
    if (groupItems.length === 0) return null
    return (
      <div key={`grp-${key}`}>
        <button type="button" onClick={()=> setOpenFn(!open)} className={`w-full rounded-md px-3 py-2 text-sm font-medium flex items-center ${collapsed?'justify-center gap-0':'gap-2'} text-white/80 hover:bg-white/5`}>
          <IconComp className="h-4 w-4" />
          {!collapsed && (
            <>
              <span className="flex-1 text-left">{label}</span>
              {open ? <ChevronDown className="h-4 w-4 opacity-80" /> : <ChevronRight className="h-4 w-4 opacity-80" />}
            </>
          )}
        </button>
        {!collapsed && open && (
          <div className="ml-6 space-y-1">
            {groupItems.map(it => (
              <NavLink
                key={it.to}
                to={it.to}
                className={({ isActive }) => `rounded-md px-3 py-2 text-sm font-medium flex items-center gap-2 ${isActive ? 'bg-white/10 text-white' : 'text-white/80 hover:bg-white/5'}`}
                end={it.end}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-white/60" />
                <span>{it.label}</span>
              </NavLink>
            ))}
          </div>
        )}
      </div>
    )
  }
  return (
    <aside
      className={`hidden md:flex ${width} md:flex-col md:border-r md:text-white h-dvh overflow-hidden`}
      style={{ background: 'linear-gradient(180deg, var(--navy) 0%, var(--navy-700) 100%)', borderColor: 'rgba(255,255,255,0.12)' }}
    >
      <div className="h-16 px-4 flex items-center border-b" style={{ borderColor: 'rgba(255,255,255,0.12)' }}>
        {!collapsed && <div className="font-semibold">Aesthetic</div>}
        <div className={`ml-auto text-xs opacity-80 ${collapsed?'hidden':''}`}>{username || 'user'}</div>
      </div>
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {(() => {
          const out: any[] = []
          let printedDoctor = false
          let printedStaff = false
          const doctorItems = items.filter(it => doctorSet.has(it.to))
          const staffItems = items.filter(it => staffSet.has(it.to))
          for (const it of items){
            if (doctorSet.has(it.to)){
              if (!printedDoctor){ out.push(renderGroup('doctor', 'Doctor Management', Users, doctorOpen, setDoctorOpen, doctorItems)); printedDoctor = true }
              continue
            }
            if (staffSet.has(it.to)){
              if (!printedStaff){ out.push(renderGroup('staff', 'Staff Management', UserCog, staffOpen, setStaffOpen, staffItems)); printedStaff = true }
              continue
            }
            out.push(renderLink(it))
          }
          return out
        })()}
      </nav>
      <div className="p-3">
        <button onClick={logout} className="w-full inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium" style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.14)' }}>Logout</button>
      </div>
    </aside>
  )
}
