import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

type OutreachItem = {
  id: string
  personName: string
  phone: string
  channel: 'call' | 'sms' | 'whatsapp' | 'visit'
  status: 'new' | 'contacted' | 'converted' | 'not-interested'
  note: string
  createdAt: number
}

const STORAGE_KEY = 'outreach.items'

function loadItems(): OutreachItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveItems(items: OutreachItem[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)) } catch {}
}

export default function Outreach_Portal(){
  const navigate = useNavigate()

  const authed = useMemo(()=>{
    try { return !!localStorage.getItem('outreach.session') } catch { return false }
  }, [])

  const [items, setItems] = useState<OutreachItem[]>([])
  const [personName, setPersonName] = useState('')
  const [phone, setPhone] = useState('')
  const [channel, setChannel] = useState<OutreachItem['channel']>('call')
  const [status, setStatus] = useState<OutreachItem['status']>('new')
  const [note, setNote] = useState('')

  useEffect(()=>{
    if (!authed) navigate('/outreach/login', { replace: true })
  }, [authed, navigate])

  useEffect(()=>{
    setItems(loadItems())
  }, [])

  const add = ()=>{
    const n = personName.trim()
    const p = phone.trim()
    if (!n) return
    const next: OutreachItem = { id: String(Date.now()), personName: n, phone: p, channel, status, note: note.trim(), createdAt: Date.now() }
    const updated = [next, ...items]
    setItems(updated)
    saveItems(updated)
    setPersonName('')
    setPhone('')
    setChannel('call')
    setStatus('new')
    setNote('')
  }

  const update = (id: string, patch: Partial<OutreachItem>)=>{
    const updated = items.map(it => it.id === id ? { ...it, ...patch } : it)
    setItems(updated)
    saveItems(updated)
  }

  const remove = (id: string)=>{
    const updated = items.filter(it => it.id !== id)
    setItems(updated)
    saveItems(updated)
  }

  const logout = ()=>{
    try { localStorage.removeItem('outreach.session') } catch {}
    navigate('/outreach/login')
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 md:px-6 py-6 space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-2xl font-bold text-slate-900">Outreach Portal</div>
            <div className="text-sm text-slate-600">Track outreach leads and follow-ups (stored in this device)</div>
          </div>
          <div className="flex gap-2">
            <button className="rounded-md border border-slate-300 px-3 py-2 text-sm" onClick={()=>navigate('/')}>Home</button>
            <button className="rounded-md border border-slate-300 px-3 py-2 text-sm" onClick={logout}>Logout</button>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-base font-semibold text-slate-900">Add Outreach Entry</div>
          <div className="mt-3 grid gap-3 md:grid-cols-6">
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm text-slate-700">Name</label>
              <input value={personName} onChange={e=>setPersonName(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Person name" />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm text-slate-700">Phone</label>
              <input value={phone} onChange={e=>setPhone(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Optional" />
            </div>
            <div className="md:col-span-1">
              <label className="mb-1 block text-sm text-slate-700">Channel</label>
              <select value={channel} onChange={e=>setChannel(e.target.value as any)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
                <option value="call">Call</option>
                <option value="sms">SMS</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="visit">Visit</option>
              </select>
            </div>
            <div className="md:col-span-1">
              <label className="mb-1 block text-sm text-slate-700">Status</label>
              <select value={status} onChange={e=>setStatus(e.target.value as any)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="converted">Converted</option>
                <option value="not-interested">Not interested</option>
              </select>
            </div>
          </div>
          <div className="mt-3">
            <label className="mb-1 block text-sm text-slate-700">Note</label>
            <input value={note} onChange={e=>setNote(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Optional note" />
          </div>
          <div className="mt-3">
            <button className="btn" onClick={add}>Add</button>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-base font-semibold text-slate-900">Outreach Entries</div>
          {items.length === 0 ? (
            <div className="mt-3 text-sm text-slate-600">No entries yet.</div>
          ) : (
            <div className="mt-3 divide-y divide-slate-100">
              {items.map(it => (
                <div key={it.id} className="py-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-900 truncate">{it.personName}</div>
                    <div className="text-sm text-slate-600 break-words">{it.phone ? `Phone: ${it.phone}` : 'Phone: -'}</div>
                    {it.note && <div className="text-sm text-slate-600 break-words">Note: {it.note}</div>}
                    <div className="text-xs text-slate-500">Created: {new Date(it.createdAt).toLocaleString()}</div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <select value={it.channel} onChange={e=>update(it.id, { channel: e.target.value as any })} className="rounded-md border border-slate-300 px-2 py-2 text-sm">
                      <option value="call">Call</option>
                      <option value="sms">SMS</option>
                      <option value="whatsapp">WhatsApp</option>
                      <option value="visit">Visit</option>
                    </select>
                    <select value={it.status} onChange={e=>update(it.id, { status: e.target.value as any })} className="rounded-md border border-slate-300 px-2 py-2 text-sm">
                      <option value="new">New</option>
                      <option value="contacted">Contacted</option>
                      <option value="converted">Converted</option>
                      <option value="not-interested">Not interested</option>
                    </select>
                    <button className="rounded-md border border-slate-300 px-3 py-2 text-sm" onClick={()=>remove(it.id)}>Delete</button>
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
