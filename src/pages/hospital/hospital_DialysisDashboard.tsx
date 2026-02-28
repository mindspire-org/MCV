import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { hospitalApi } from '../../utils/api'

export default function Hospital_DialysisDashboard(){
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [openingId, setOpeningId] = useState<string>('')

  const trimmed = useMemo(()=> q.trim(), [q])

  useEffect(()=>{
    let active = true
    if (!trimmed){ setRows([]); return }
    setLoading(true)
    ;(async()=>{
      try {
        const digits = trimmed.replace(/\D/g, '')
        const looksLikePhone = digits.length >= 7
        const looksLikeMrn = /^mrn\s*[:#-]?\s*/i.test(trimmed) || /^(mr[-_ ]?\d+|\d{1,8})$/i.test(trimmed)
        const params = looksLikePhone
          ? { phone: trimmed, limit: 20 }
          : looksLikeMrn
            ? { mrn: trimmed, limit: 20 }
            : { name: trimmed, limit: 20 }

        const res: any = await hospitalApi.searchPatients(params as any).catch(()=>({ patients: [] }))
        const pats = Array.isArray(res?.patients) ? res.patients : []
        if (!active) return
        setRows(pats)
      } finally {
        if (active) setLoading(false)
      }
    })()
    return ()=>{ active = false }
  }, [trimmed])

  async function openPatient(p: any){
    const id = String(p?._id || '')
    if (!id) return
    setOpeningId(id)
    try {
      const up: any = await hospitalApi.dialysisUpsertPatient({ patientId: id, mrn: p?.mrn })
      const dp = up?.dialysisPatient
      if (dp?._id) {
        navigate(`/hospital/dialysis/patient/${encodeURIComponent(String(dp._id))}`)
        return
      }
      try { console.error('dialysisUpsertPatient unexpected response', up) } catch {}
      try { window.alert('Unable to open dialysis patient record. Please restart backend and try again.') } catch {}
    } catch (e: any) {
      try { console.error('dialysisUpsertPatient failed', e) } catch {}
      const msg = String(e?.message || e?.error || 'Failed to open')
      try { window.alert(msg) } catch {}
    } finally {
      setOpeningId('')
    }
  }

  return (
    <div className="w-full px-4 md:px-6 py-6 space-y-5">
      <div className="flex flex-col gap-1">
        <div className="text-2xl font-bold text-slate-900">Dialysis</div>
        <div className="text-sm text-slate-600">Search a patient to start screening, approval, plan and sessions.</div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm text-slate-700">Search (MRN / Name / Phone)</label>
            <input value={q} onChange={e=>setQ(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Type to search..." />
          </div>
          <div className="flex items-end justify-end">
            <button className="btn-outline-navy" onClick={()=>navigate('/hospital/dialysis/reports')}>Reports</button>
          </div>
        </div>

        <div className="border rounded-md overflow-auto">
          <table className="min-w-[800px] w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left">MRN</th>
                <th className="px-3 py-2 text-left">Name</th>
                <th className="px-3 py-2 text-left">Phone</th>
                <th className="px-3 py-2 text-left">Age/Gender</th>
                <th className="px-3 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={5} className="px-3 py-6 text-slate-500">Loading...</td></tr>
              )}
              {!loading && rows.length === 0 && trimmed && (
                <tr><td colSpan={5} className="px-3 py-6 text-slate-500">No patients found.</td></tr>
              )}
              {!loading && rows.map(p => (
                <tr key={String(p._id)} className="border-t">
                  <td className="px-3 py-2 font-medium text-slate-900">{p.mrn || '-'}</td>
                  <td className="px-3 py-2">{p.fullName || '-'}</td>
                  <td className="px-3 py-2">{p.phoneNormalized || '-'}</td>
                  <td className="px-3 py-2">{String(p.age || '-')} / {String(p.gender || '-')}</td>
                  <td className="px-3 py-2">
                    <button
                      className="btn-outline-navy text-xs"
                      onClick={()=>openPatient(p)}
                      disabled={openingId === String(p._id)}
                    >
                      {openingId === String(p._id) ? 'Opening...' : 'Open'}
                    </button>
                  </td>
                </tr>
              ))}
              {!trimmed && (
                <tr><td colSpan={5} className="px-3 py-6 text-slate-500">Start by searching a patient.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
