import { Navigate, Route, Routes } from 'react-router-dom'
import Task_Layout from './task_Layout'
import Task_Dashboard from './task_dashboard'
import Task_Tasks from './task_tasks'
import Task_AdminAssign from './task_adminAssign'
import Task_AdminStaff from './task_adminStaff'
import Task_AdminTemplates from './task_adminTemplates'
import Task_StaffDashboard from './task_staffDashboard'
import Task_StaffAttendance from './task_staffAttendance'
import Task_StaffMonthly from './task_staffMonthly'
import Task_StaffSettings from './task_staffSettings'
import Task_StaffManagement from './task_staffManagement'
import Task_MaintenanceAssets from './task_maintenanceAssets'
import Task_MaintenancePlans from './task_maintenancePlans'
import Task_MaintenanceTasks from './task_maintenanceTasks'

export default function Task_Router(){
  return (
    <Routes>
      <Route element={<Task_Layout />}>
        <Route index element={<Task_Dashboard />} />
        <Route path="tasks" element={<Task_Tasks />} />
        <Route path="assign" element={<Task_AdminAssign />} />
        <Route path="staff" element={<Task_AdminStaff />} />
        <Route path="templates" element={<Task_AdminTemplates />} />
        <Route path="staff/dashboard" element={<Task_StaffDashboard />} />
        <Route path="staff/attendance" element={<Task_StaffAttendance />} />
        <Route path="staff/monthly" element={<Task_StaffMonthly />} />
        <Route path="staff/settings" element={<Task_StaffSettings />} />
        <Route path="staff/management" element={<Task_StaffManagement />} />
        <Route path="maintenance/assets" element={<Task_MaintenanceAssets />} />
        <Route path="maintenance/plans" element={<Task_MaintenancePlans />} />
        <Route path="maintenance/tasks" element={<Task_MaintenanceTasks />} />
        <Route path="*" element={<Navigate to="." replace />} />
      </Route>
    </Routes>
  )
}
