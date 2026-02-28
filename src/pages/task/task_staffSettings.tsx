import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Hospital_StaffSettings from '../hospital/hospital_StaffSettings'
import { loadSession } from './task_store'

export default function Task_StaffSettings(){
  const navigate = useNavigate()

  useEffect(()=>{
    const s = loadSession()
    if (!s) { navigate('/task/login', { replace: true }); return }
    if (!s.isAdmin) { navigate('/task', { replace: true }) }
  }, [navigate])

  return <Hospital_StaffSettings />
}
