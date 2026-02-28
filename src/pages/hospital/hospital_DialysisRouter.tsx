import { Navigate, Route, Routes } from 'react-router-dom'
import Hospital_DialysisDashboard from './hospital_DialysisDashboard'
import Hospital_DialysisActivePatients from './hospital_DialysisActivePatients'
import Hospital_DialysisPatient from './hospital_DialysisPatient'
import Hospital_DialysisPatientHistory from './hospital_DialysisPatientHistory'
import Hospital_DialysisSession from './hospital_DialysisSession'
import Hospital_DialysisReports from './hospital_DialysisReports'

export default function Hospital_DialysisRouter(){
  return (
    <Routes>
      <Route index element={<Hospital_DialysisDashboard />} />
      <Route path="active" element={<Hospital_DialysisActivePatients />} />
      <Route path="patient/:id" element={<Hospital_DialysisPatient />} />
      <Route path="patient/:id/history" element={<Hospital_DialysisPatientHistory />} />
      <Route path="session/:id" element={<Hospital_DialysisSession />} />
      <Route path="reports" element={<Hospital_DialysisReports />} />
      <Route path="*" element={<Navigate to="." replace />} />
    </Routes>
  )
}
