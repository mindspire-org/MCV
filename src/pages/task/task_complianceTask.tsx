import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { hospitalApi } from '../../utils/api'
import { loadSession, seedIfNeeded, todayIso } from './task_store'
import { Camera, CheckCircle2, Upload } from 'lucide-react'

function hasHospitalToken(){
  try { return !!(localStorage.getItem('hospital.token') || localStorage.getItem('token')) } catch { return false }
}

function readAsDataUrl(file: File){
  return new Promise<string>((resolve, reject)=>{
    try{
      const r = new FileReader()
      r.onload = () => resolve(String(r.result || ''))
      r.onerror = () => reject(new Error('read-failed'))
      r.readAsDataURL(file)
    }catch(e){ reject(e as any) }
  })
}

export default function Task_ComplianceTask(){
  const { id } = useParams()
  const taskId = String(id || '')
  const navigate = useNavigate()

  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [task, setTask] = useState<any>(null)
  const [template, setTemplate] = useState<any>(null)
  const [submission, setSubmission] = useState<any>(null)

  const [area, setArea] = useState('')
  const [answers, setAnswers] = useState<Record<string, any>>({})
  const [evidenceSingle, setEvidenceSingle] = useState<string | null>(null)
  const [evidenceBefore, setEvidenceBefore] = useState<string | null>(null)
  const [evidenceAfter, setEvidenceAfter] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(()=>{
    try { seedIfNeeded() } catch {}
    const s = loadSession()
    setSession(s)
    if (!s) { navigate('/task/login', { replace: true }); return }
  }, [navigate])

  useEffect(()=>{
    if (!session) return
    if (!hasHospitalToken()) {
      setError('Hospital login token not found. Please login to Hospital portal first.')
      return
    }
    const run = async ()=>{
      setLoading(true)
      setError(null)
      try{
        const data: any = await hospitalApi.complianceGetTask(taskId)
        setTask(data?.task || null)
        setTemplate(data?.template || null)
        setSubmission(data?.submission || null)
      }catch(e: any){
        setError(e?.message || 'Failed to load task')
      }finally{
        setLoading(false)
      }
    }
    run()
  }, [session, taskId])

  const checklist = useMemo(()=> Array.isArray(template?.checklist) ? template.checklist : [], [template])
  const critical = !!template?.critical
  const requireBeforeAfter = !!template?.requireBeforeAfter
  const canSubmit = !!task && String(task?.status || '') === 'pending'

  const onUploadSingle = async (f: File)=>{
    const url = await readAsDataUrl(f)
    setEvidenceSingle(url)
  }
  const onUploadBefore = async (f: File)=>{
    const url = await readAsDataUrl(f)
    setEvidenceBefore(url)
  }
  const onUploadAfter = async (f: File)=>{
    const url = await readAsDataUrl(f)
    setEvidenceAfter(url)
  }

  const submit = async ()=>{
    if (!canSubmit) return
    setSaving(true)
    setMsg(null)
    setError(null)
    try{
      const checklistAnswers = checklist.map((f: any)=>({ key: String(f.key || ''), value: (answers as any)[String(f.key || '')] }))
      const evidence: any[] = []
      const capturedAt = new Date().toISOString()
      if (requireBeforeAfter) {
        if (evidenceBefore) evidence.push({ kind: 'before', dataUrl: evidenceBefore, capturedAt })
        if (evidenceAfter) evidence.push({ kind: 'after', dataUrl: evidenceAfter, capturedAt })
      } else {
        if (evidenceSingle) evidence.push({ kind: 'single', dataUrl: evidenceSingle, capturedAt })
      }

      await hospitalApi.complianceSubmitTask(taskId, { area: area.trim() || undefined, checklistAnswers, evidence })
      setMsg('Submitted successfully. Waiting for admin review.')
      const data: any = await hospitalApi.complianceGetTask(taskId)
      setTask(data?.task || null)
      setTemplate(data?.template || null)
      setSubmission(data?.submission || null)
    }catch(e: any){
      setError(e?.message || 'Submit failed')
    }finally{
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 md:px-6 py-6 space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-2xl font-extrabold tracking-tight text-slate-900">{task?.name || 'Compliance Task'}</div>
          <div className="text-sm text-slate-600">Due: {task?.deadlineIso || todayIso()} · Category: {task?.category || '-'}</div>
        </div>
        <div className="flex gap-2">
          <button className="btn-outline-navy" onClick={()=>navigate('/task/compliance')}>Back</button>
        </div>
      </div>

      {loading && <div className="text-sm text-slate-600">Loading...</div>}
      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>}
      {msg && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{msg}</div>}

      {submission && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="text-base font-semibold text-slate-900">Submission</div>
            <div className={submission.adminStatus === 'approved'
              ? 'inline-flex items-center gap-1 text-xs font-semibold text-emerald-700'
              : submission.adminStatus === 'rejected'
                ? 'inline-flex items-center gap-1 text-xs font-semibold text-rose-700'
                : 'inline-flex items-center gap-1 text-xs font-semibold text-slate-700'}>
              <CheckCircle2 className="size-4" />
              {String(submission.adminStatus || 'pending').toUpperCase()}
            </div>
          </div>
          {submission.rejectReason && <div className="mt-2 text-sm text-rose-700">Reject reason: {submission.rejectReason}</div>}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <div className="text-base font-semibold text-slate-900">Checklist</div>

          <div>
            <label className="mb-1 block text-sm text-slate-700">Area / Zone</label>
            <input value={area} onChange={e=>setArea(e.target.value)} disabled={!canSubmit} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm" placeholder="e.g. OPD corridor" />
          </div>

          {checklist.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">No checklist fields for this task.</div>
          ) : (
            <div className="space-y-3">
              {checklist.map((f: any) => {
                const key = String(f.key || '')
                const type = String(f.type || 'text')
                return (
                  <div key={key}>
                    <label className="mb-1 block text-sm text-slate-700">{f.label}{f.required ? ' *' : ''}</label>
                    {type === 'select' ? (
                      <select disabled={!canSubmit} value={(answers as any)[key] ?? ''} onChange={e=>setAnswers(v=>({ ...v, [key]: e.target.value }))} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm">
                        <option value="">Select...</option>
                        {(Array.isArray(f.options) ? f.options : []).map((op: string) => <option key={op} value={op}>{op}</option>)}
                      </select>
                    ) : type === 'number' ? (
                      <input disabled={!canSubmit} type="number" value={(answers as any)[key] ?? ''} onChange={e=>setAnswers(v=>({ ...v, [key]: e.target.value }))} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm" />
                    ) : type === 'boolean' ? (
                      <select disabled={!canSubmit} value={(answers as any)[key] ?? ''} onChange={e=>setAnswers(v=>({ ...v, [key]: e.target.value === 'true' }))} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm">
                        <option value="">Select...</option>
                        <option value="true">Yes</option>
                        <option value="false">No</option>
                      </select>
                    ) : type === 'date' ? (
                      <input disabled={!canSubmit} type="date" value={(answers as any)[key] ?? ''} onChange={e=>setAnswers(v=>({ ...v, [key]: e.target.value }))} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm" />
                    ) : (
                      <input disabled={!canSubmit} value={(answers as any)[key] ?? ''} onChange={e=>setAnswers(v=>({ ...v, [key]: e.target.value }))} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm" />
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-base font-semibold text-slate-900">Evidence</div>
            <div className="text-xs text-slate-500">{critical ? 'Required' : 'Optional'}</div>
          </div>

          {requireBeforeAfter ? (
            <div className="space-y-4">
              <div>
                <div className="text-sm font-semibold text-slate-900">Before</div>
                <div className="mt-2 flex items-center gap-3">
                  <label className={canSubmit ? 'inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50 cursor-pointer' : 'inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-400'}>
                    <Upload className="size-4" /> Upload
                    <input disabled={!canSubmit} type="file" accept="image/*" className="hidden" onChange={async e=>{ const f = e.target.files?.[0]; if (f) await onUploadBefore(f) }} />
                  </label>
                  {evidenceBefore && <span className="text-xs text-emerald-700">Selected</span>}
                </div>
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-900">After</div>
                <div className="mt-2 flex items-center gap-3">
                  <label className={canSubmit ? 'inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50 cursor-pointer' : 'inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-400'}>
                    <Upload className="size-4" /> Upload
                    <input disabled={!canSubmit} type="file" accept="image/*" className="hidden" onChange={async e=>{ const f = e.target.files?.[0]; if (f) await onUploadAfter(f) }} />
                  </label>
                  {evidenceAfter && <span className="text-xs text-emerald-700">Selected</span>}
                </div>
              </div>
            </div>
          ) : (
            <div>
              <div className="text-sm text-slate-600">Upload one image as proof (timestamp is auto captured on submit).</div>
              <div className="mt-3 flex items-center gap-3">
                <label className={canSubmit ? 'inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50 cursor-pointer' : 'inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-400'}>
                  <Camera className="size-4" /> Choose image
                  <input disabled={!canSubmit} type="file" accept="image/*" className="hidden" onChange={async e=>{ const f = e.target.files?.[0]; if (f) await onUploadSingle(f) }} />
                </label>
                {evidenceSingle && <span className="text-xs text-emerald-700">Selected</span>}
              </div>
            </div>
          )}

          <div className="pt-2">
            <button disabled={!canSubmit || saving} className={(!canSubmit || saving) ? 'w-full rounded-xl bg-slate-200 px-3 py-2 text-sm font-semibold text-slate-600' : 'w-full btn'} onClick={submit}>
              {saving ? 'Submitting...' : 'Submit for Review'}
            </button>
            {!canSubmit && (
              <div className="mt-2 text-xs text-slate-500">Task can be submitted only when status is PENDING.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
