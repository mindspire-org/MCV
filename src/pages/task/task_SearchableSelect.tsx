import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, Search } from 'lucide-react'

export type SelectOption = { value: string; label: string }

export default function Task_SearchableSelect(props: {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  disabled?: boolean
  searchable?: boolean
  maxListHeightClass?: string
}){
  const {
    value,
    onChange,
    options,
    placeholder = 'Select',
    disabled,
    searchable = true,
    maxListHeightClass = 'max-h-64',
  } = props

  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const rootRef = useRef<HTMLDivElement | null>(null)

  const selected = useMemo(()=> options.find(o => o.value === value) || null, [options, value])

  const filtered = useMemo(()=>{
    const qq = q.trim().toLowerCase()
    if (!qq) return options
    return options.filter(o => String(o.label || '').toLowerCase().includes(qq))
  }, [options, q])

  useEffect(()=>{
    const onDoc = (e: any)=>{
      const el = rootRef.current
      if (!el) return
      if (!el.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return ()=> document.removeEventListener('mousedown', onDoc)
  }, [])

  useEffect(()=>{
    if (!open) setQ('')
  }, [open])

  const pick = (v: string)=>{
    onChange(v)
    setOpen(false)
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        disabled={!!disabled}
        onClick={()=>setOpen(v => !v)}
        className={
          disabled
            ? 'w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-400 flex items-center justify-between'
            : 'w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 flex items-center justify-between hover:bg-slate-50'
        }
      >
        <span className={selected ? 'truncate' : 'truncate text-slate-500'}>{selected ? selected.label : placeholder}</span>
        <ChevronDown className="size-4 text-slate-500 shrink-0" />
      </button>

      {open && !disabled && (
        <div className="absolute z-30 mt-2 w-full rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden">
          {searchable && (
            <div className="p-2 border-b border-slate-100">
              <div className="relative">
                <Search className="size-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={q}
                  onChange={e=>setQ(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 pl-9 pr-3 py-2 text-sm"
                  placeholder="Search..."
                  autoFocus
                />
              </div>
            </div>
          )}

          <div className={`${maxListHeightClass} overflow-auto`}> 
            {filtered.map(o => (
              <button
                key={o.value}
                type="button"
                onClick={()=>pick(o.value)}
                className={
                  o.value === value
                    ? 'w-full text-left px-3 py-2 text-sm bg-slate-900 text-white'
                    : 'w-full text-left px-3 py-2 text-sm hover:bg-slate-100'
                }
              >
                {o.label}
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="px-3 py-3 text-sm text-slate-500">No results</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
