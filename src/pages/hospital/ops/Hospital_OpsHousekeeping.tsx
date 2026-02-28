import { useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import Hospital_WorkflowList from '../hospital_WorkflowList'

export default function Hospital_OpsHousekeeping() {
  const [params, setParams] = useSearchParams()

  useEffect(() => {
    if (params.get('type') !== 'housekeeping') {
      const next = new URLSearchParams(params)
      next.set('type', 'housekeeping')
      setParams(next, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div>
      <div className="px-6 pt-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Housekeeping Daily Logs</h1>
          <p className="text-sm text-gray-600 mt-1">Cleaning tasks, schedules and compliance</p>
        </div>
        <Link
          to="/hospital/workflow/new?type=housekeeping"
          className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          New Log
        </Link>
      </div>
      <Hospital_WorkflowList />
    </div>
  )
}
