import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Hospital_StaffAttendance from '../hospital/hospital_StaffAttendance'
import { loadSession } from './task_store'

export default function Task_StaffAttendance(){
  const navigate = useNavigate()

  useEffect(()=>{
    const s = loadSession()
    if (!s) { navigate('/task/login', { replace: true }); return }
    if (!s.isAdmin) { navigate('/task', { replace: true }) }
  }, [navigate])

  return <Hospital_StaffAttendance />
}
