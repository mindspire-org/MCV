import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import Hospital_WorkflowList from '../hospital_WorkflowList'

export default function Hospital_CqiIncidents() {
  const [params, setParams] = useSearchParams()

  useEffect(() => {
    if (params.get('type') !== 'incident') {
      const next = new URLSearchParams(params)
      next.set('type', 'incident')
      setParams(next, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <Hospital_WorkflowList />
}
