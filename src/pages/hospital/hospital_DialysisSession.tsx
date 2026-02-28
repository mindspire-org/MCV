import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { hospitalApi } from '../../utils/api'

function fmtDT(d?: any){
  try {
    if (!d) return '-'
    const dt = new Date(d)
    if (isNaN(dt.getTime())) return '-'
    return dt.toLocaleString()
  } catch { return '-' }
}

export default function Hospital_DialysisSession(){
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [session, setSession] = useState<any>(null)
  const [monitoring, setMonitoring] = useState<any[]>([])
  const [billing, setBilling] = useState<any>(null)
  const [consumables, setConsumables] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [startBusy, setStartBusy] = useState(false)

  const [departments, setDepartments] = useState<any[]>([])
  const [locations, setLocations] = useState<any[]>([])
  const [items, setItems] = useState<any[]>([])
  const [itemQ, setItemQ] = useState('')

  const [startForm, setStartForm] = useState({
    weightKg: '',
    bp: '',
    temperatureC: '',
    locationId: '',
    departmentId: '',
    itemId: '',
    qty: '1',
    refNo: '',
  })
  const [consLines, setConsLines] = useState<Array<{ itemId: string; qty: string }>>([])

  const [monForm, setMonForm] = useState({ bp: '', pulse: '', ufRate: '' })

  const [completeForm, setCompleteForm] = useState({ postWeightKg: '', finalBp: '', condition: '', sessionCharge: '0' })

  const status = String(session?.status || '')
  const canStart = useMemo(()=> status === 'scheduled', [status])
  const canMonitor = useMemo(()=> status === 'running', [status])
  const canComplete = useMemo(()=> status === 'running', [status])

  useEffect(()=>{
    if (!id) return
    refresh()
    loadLookups()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  useEffect(()=>{
    let active = true
    const t = setTimeout(async()=>{
      try {
        const q = itemQ.trim()
        if (!q) { if (active) setItems([]); return }
        const res: any = await hospitalApi.storeListItems({ q, active: true, limit: 50 } as any).catch(()=>({ items: [] }))
        const arr = Array.isArray(res?.items) ? res.items : []
        if (active) setItems(arr)
      } catch {
        if (active) setItems([])
      }
    }, 250)
    return ()=>{ active = false; clearTimeout(t) }
  }, [itemQ])

  async function loadLookups(){
    try {
      const deps: any = await hospitalApi.listDepartments().catch(()=>({ departments: [] }))
      const depRows = Array.isArray(deps?.departments) ? deps.departments : (Array.isArray(deps) ? deps : [])
      setDepartments(depRows)
    } catch { setDepartments([]) }

    try {
      const locs: any = await hospitalApi.storeListLocations({ active: true, limit: 1000 } as any).catch(()=>({ items: [] }))
      const locRows = Array.isArray(locs?.items) ? locs.items : (Array.isArray(locs) ? locs : [])
      setLocations(locRows)
    } catch { setLocations([]) }
  }

  async function startSession(){
    if (!id) return
    if (!canStart){
      try { window.alert('Session is not in Scheduled state. Please refresh and ensure status is Scheduled before starting.') } catch {}
      return
    }
    if (!startForm.locationId){
      try { window.alert('Please select Store Location.') } catch {}
      return
    }
    if (!startForm.departmentId){
      try { window.alert('Please select Department.') } catch {}
      return
    }

    const lines = [...consLines]
    if (startForm.itemId.trim()) lines.unshift({ itemId: startForm.itemId.trim(), qty: startForm.qty || '1' })

    const cleanLines = lines
      .filter(l => String(l.itemId || '').trim())
      .map(l => ({ itemId: String(l.itemId).trim(), qty: Number(l.qty || 0) || 0 }))
      .filter(l => l.qty > 0)

    if (cleanLines.length === 0){
      try { window.alert('Please add at least one consumable item with qty > 0.') } catch {}
      return
    }

    const body: any = {
      pre: {
        weightKg: Number(startForm.weightKg || 0),
        bp: startForm.bp || undefined,
        temperatureC: startForm.temperatureC ? Number(startForm.temperatureC) : undefined,
        recordedAt: new Date().toISOString(),
      },
      consumables: {
        locationId: startForm.locationId,
        departmentId: startForm.departmentId,
        date: new Date().toISOString().slice(0,10),
        referenceNo: startForm.refNo || undefined,
        lines: cleanLines.map(l => ({ itemId: l.itemId, qty: l.qty })),
      },
    }
    try {
      setStartBusy(true)
      await hospitalApi.dialysisStartSession(String(id), body)
      setStartForm(v=>({ ...v, itemId: '', qty: '1' }))
      setConsLines([])
      await refresh()
    } catch (e: any) {
      try { window.alert(e?.message || 'Failed to start session.') } catch {}
    } finally {
      setStartBusy(false)
    }
  }

  async function refresh(){
    if (!id) return
    setLoading(true)
    try {
      const sRes: any = await hospitalApi.dialysisGetSession(String(id)).catch(()=>null)
      setSession(sRes?.session || null)
      setConsumables(Array.isArray(sRes?.consumables) ? sRes.consumables : [])
      setBilling(sRes?.billing || null)

      const m: any = await hospitalApi.dialysisListMonitoring(String(id), { limit: 200 }).catch(()=>({ monitoring: [] }))
      setMonitoring(Array.isArray(m?.monitoring) ? m.monitoring : [])
    } finally {
      setLoading(false)
    }
  }

  async function addMonitoring(){
    if (!id) return
    const body: any = {
      recordedAt: new Date().toISOString(),
      bp: monForm.bp || undefined,
      pulse: monForm.pulse ? Number(monForm.pulse) : undefined,
      ufRate: monForm.ufRate ? Number(monForm.ufRate) : undefined,
    }
    await hospitalApi.dialysisAddMonitoring(String(id), body)
    setMonForm({ bp: '', pulse: '', ufRate: '' })
    await refresh()
  }

  async function complete(){
    if (!id) return
    const body: any = {
      completion: {
        postWeightKg: Number(completeForm.postWeightKg || 0),
        finalBp: completeForm.finalBp || undefined,
        condition: completeForm.condition || undefined,
        recordedAt: new Date().toISOString(),
      },
      charges: { sessionCharge: Number(completeForm.sessionCharge || 0) },
    }
    await hospitalApi.dialysisCompleteSession(String(id), body)
    await refresh()
  }

  function addLine(){
    setConsLines(v=> [...v, { itemId: '', qty: '1' }])
  }

  function setLine(i: number, patch: any){
    setConsLines(v=> v.map((r,idx)=> idx===i ? { ...r, ...patch } : r))
  }

  function removeLine(i: number){
    setConsLines(v=> v.filter((_,idx)=>idx!==i))
  }

  return (
    <div className="w-full px-4 md:px-6 py-6 space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-2xl font-bold text-slate-900">Dialysis Session</div>
          <div className="text-sm text-slate-600">Status: <span className="font-semibold text-slate-900">{status || '-'}</span></div>
        </div>
        <div className="flex gap-2">
          <button className="btn-outline-navy" onClick={()=>navigate('/hospital/dialysis')}>Back</button>
          <button className="btn-outline-navy" onClick={refresh}>Refresh</button>
        </div>
      </div>

      {loading && (
        <div className="text-sm text-slate-600">Loading...</div>
      )}

      {session && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 grid gap-2 md:grid-cols-3 text-sm">
          <div><span className="text-slate-500">Machine:</span> <span className="font-medium">{session.machineId}</span></div>
          <div><span className="text-slate-500">Scheduled:</span> <span className="font-medium">{fmtDT(session.scheduledStartAt)} - {fmtDT(session.scheduledEndAt)}</span></div>
          <div><span className="text-slate-500">Nurse:</span> <span className="font-medium">{session.nurseId || '-'}</span></div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
          <div className="text-base font-semibold text-slate-900">Start Session (Pre-Dialysis + Consumables)</div>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-slate-700">Pre Weight (kg)</label>
              <input value={startForm.weightKg} onChange={e=>setStartForm(v=>({ ...v, weightKg: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-700">Pre BP</label>
              <input value={startForm.bp} onChange={e=>setStartForm(v=>({ ...v, bp: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="120/80" />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-700">Temperature (C)</label>
              <input value={startForm.temperatureC} onChange={e=>setStartForm(v=>({ ...v, temperatureC: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-700">Reference No</label>
              <input value={startForm.refNo} onChange={e=>setStartForm(v=>({ ...v, refNo: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-700">Store Location ID</label>
              <select value={startForm.locationId} onChange={e=>setStartForm(v=>({ ...v, locationId: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
                <option value="">Select location</option>
                {locations.map(l => (
                  <option key={String(l?._id || l?.id)} value={String(l?._id || l?.id)}>{l?.name || l?._id || l?.id}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-700">Department ID</label>
              <select value={startForm.departmentId} onChange={e=>setStartForm(v=>({ ...v, departmentId: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
                <option value="">Select department</option>
                {departments.map(d => (
                  <option key={String(d?._id || d?.id)} value={String(d?._id || d?.id)}>{d?.name || d?._id || d?.id}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="rounded-md border border-slate-200 p-3 space-y-2">
            <div className="text-sm font-semibold text-slate-900">Consumables Lines</div>
            <div className="grid gap-2">
              <div className="grid gap-2 md:grid-cols-5">
                <div className="md:col-span-3">
                  <input value={itemQ} onChange={e=>setItemQ(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Search item by name" />
                  <select value={startForm.itemId} onChange={e=>setStartForm(v=>({ ...v, itemId: e.target.value }))} className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
                    <option value="">Select item</option>
                    {items.map(it => (
                      <option key={String(it?._id || it?.id)} value={String(it?._id || it?.id)}>{it?.name || it?._id || it?.id}{it?.code ? ` (${it.code})` : ''}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <input value={startForm.qty} onChange={e=>setStartForm(v=>({ ...v, qty: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Qty" />
                </div>
                <div className="flex justify-end">
                  <button className="btn-outline-navy" onClick={()=>{ if (!startForm.itemId.trim()) return; setConsLines(v=>[...v, { itemId: startForm.itemId.trim(), qty: startForm.qty || '1' }]); setStartForm(x=>({ ...x, itemId: '', qty: '1' })) }}>Add Line</button>
                </div>
              </div>

              {consLines.map((l, i) => (
                <div key={i} className="grid gap-2 md:grid-cols-5 items-center">
                  <div className="md:col-span-3">
                    <input value={l.itemId} onChange={e=>setLine(i, { itemId: e.target.value })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Item ID" />
                  </div>
                  <div>
                    <input value={l.qty} onChange={e=>setLine(i, { qty: e.target.value })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Qty" />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button className="btn-outline-navy" onClick={()=>removeLine(i)}>Remove</button>
                  </div>
                </div>
              ))}

              <div className="flex justify-end">
                <button className="btn-outline-navy" onClick={addLine}>Add Empty Row</button>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button className="btn" onClick={startSession} disabled={!canStart || startBusy}>{startBusy ? 'Starting...' : 'Start Session'}</button>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
          <div className="text-base font-semibold text-slate-900">Monitoring (Nurse)</div>
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm text-slate-700">BP</label>
              <input value={monForm.bp} onChange={e=>setMonForm(v=>({ ...v, bp: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="120/80" />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-700">Pulse</label>
              <input value={monForm.pulse} onChange={e=>setMonForm(v=>({ ...v, pulse: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-700">UF Rate</label>
              <input value={monForm.ufRate} onChange={e=>setMonForm(v=>({ ...v, ufRate: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="flex justify-end">
            <button className="btn" onClick={addMonitoring} disabled={!canMonitor}>Add Monitoring</button>
          </div>

          <div className="border rounded-md overflow-auto">
            <table className="min-w-[600px] w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-left">Time</th>
                  <th className="px-3 py-2 text-left">BP</th>
                  <th className="px-3 py-2 text-left">Pulse</th>
                  <th className="px-3 py-2 text-left">UF Rate</th>
                </tr>
              </thead>
              <tbody>
                {monitoring.length === 0 && (
                  <tr><td colSpan={4} className="px-3 py-6 text-slate-500">No monitoring yet.</td></tr>
                )}
                {monitoring.map((m, idx) => (
                  <tr key={String(m._id || idx)} className="border-t">
                    <td className="px-3 py-2">{fmtDT(m.recordedAt)}</td>
                    <td className="px-3 py-2">{m.bp || '-'}</td>
                    <td className="px-3 py-2">{m.pulse != null ? String(m.pulse) : '-'}</td>
                    <td className="px-3 py-2">{m.ufRate != null ? String(m.ufRate) : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
          <div className="text-base font-semibold text-slate-900">Complete Session</div>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-slate-700">Post Weight (kg)</label>
              <input value={completeForm.postWeightKg} onChange={e=>setCompleteForm(v=>({ ...v, postWeightKg: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-700">Final BP</label>
              <input value={completeForm.finalBp} onChange={e=>setCompleteForm(v=>({ ...v, finalBp: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="120/80" />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-700">Condition</label>
              <input value={completeForm.condition} onChange={e=>setCompleteForm(v=>({ ...v, condition: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Stable" />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-700">Session Charge</label>
              <input value={completeForm.sessionCharge} onChange={e=>setCompleteForm(v=>({ ...v, sessionCharge: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="flex justify-end">
            <button className="btn" onClick={complete} disabled={!canComplete}>Complete</button>
          </div>
          <div className="text-xs text-slate-500">At least one monitoring entry is required before completion.</div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
          <div className="text-base font-semibold text-slate-900">Billing</div>
          {!billing ? (
            <div className="text-sm text-slate-600">No billing generated yet.</div>
          ) : (
            <>
              <div className="text-sm text-slate-600">Subtotal: <span className="font-semibold text-slate-900">{Number(billing.subtotal || 0).toFixed(2)}</span></div>
              <div className="border rounded-md overflow-auto">
                <table className="min-w-[600px] w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 text-left">Type</th>
                      <th className="px-3 py-2 text-left">Description</th>
                      <th className="px-3 py-2 text-right">Qty</th>
                      <th className="px-3 py-2 text-right">Rate</th>
                      <th className="px-3 py-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(billing.items || []).map((it: any, idx: number) => (
                      <tr key={idx} className="border-t">
                        <td className="px-3 py-2">{it.type}</td>
                        <td className="px-3 py-2">{it.description}</td>
                        <td className="px-3 py-2 text-right">{it.qty}</td>
                        <td className="px-3 py-2 text-right">{Number(it.unitPrice || 0).toFixed(2)}</td>
                        <td className="px-3 py-2 text-right">{Number(it.amount || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
        <div className="text-base font-semibold text-slate-900">Consumables Used (from store issue)</div>
        <div className="border rounded-md overflow-auto">
          <table className="min-w-[900px] w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left">Item</th>
                <th className="px-3 py-2 text-right">Qty</th>
                <th className="px-3 py-2 text-right">Unit Cost</th>
                <th className="px-3 py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {consumables.length === 0 ? (
                <tr><td colSpan={4} className="px-3 py-6 text-slate-500">No consumables recorded.</td></tr>
              ) : consumables.map((c: any, idx: number) => (
                <tr key={String(c._id || idx)} className="border-t">
                  <td className="px-3 py-2">{c.itemName || '-'}</td>
                  <td className="px-3 py-2 text-right">{Number(c.qty || 0)}</td>
                  <td className="px-3 py-2 text-right">{Number(c.unitCost || 0).toFixed(2)}</td>
                  <td className="px-3 py-2 text-right">{Number(c.amount || 0).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
