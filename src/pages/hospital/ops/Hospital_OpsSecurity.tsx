import { useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import Hospital_WorkflowList from '../hospital_WorkflowList'

export default function Hospital_OpsSecurity() {
  const [params, setParams] = useSearchParams()

  useEffect(() => {
    if (params.get('type') !== 'security') {
      const next = new URLSearchParams(params)
      next.set('type', 'security')
      setParams(next, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div>
      <div className="px-6 pt-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Security & Safety</h1>
          <p className="text-sm text-gray-600 mt-1">Security rounds, incidents, inspections and safety actions</p>
        </div>
        <Link
          to="/hospital/workflow/new?type=security"
          className="px-3 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
        >
          New Entry
        </Link>
      </div>
      <Hospital_WorkflowList />
    </div>
  )
}
