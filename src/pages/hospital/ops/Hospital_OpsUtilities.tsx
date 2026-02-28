import { useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import Hospital_WorkflowList from '../hospital_WorkflowList'

export default function Hospital_OpsUtilities() {
  const [params, setParams] = useSearchParams()

  useEffect(() => {
    if (params.get('type') !== 'utility') {
      const next = new URLSearchParams(params)
      next.set('type', 'utility')
      setParams(next, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div>
      <div className="px-6 pt-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Utilities Daily Logs</h1>
          <p className="text-sm text-gray-600 mt-1">Generator, oxygen, water, UPS, HVAC and safety checks</p>
        </div>
        <Link
          to="/hospital/workflow/new?type=utility"
          className="px-3 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
        >
          New Log
        </Link>
      </div>
      <Hospital_WorkflowList />
    </div>
  )
}
