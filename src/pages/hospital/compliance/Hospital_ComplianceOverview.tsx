import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, CheckCircle, Clock, FileText, TrendingUp } from 'lucide-react'
import { hospitalApi } from '../../../utils/api'

type ComplianceStats = {
  byType: Record<string, Record<string, number>>
  overdueTasksAll: number
  overdueTasksCapa: number
}

export default function Hospital_ComplianceOverview() {
  const [stats, setStats] = useState<ComplianceStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetch = async () => {
      try {
        const res: any = await hospitalApi.getWorkflowCqiStats()
        setStats(res)
      } catch (e) {
        console.error('Failed to load compliance stats', e)
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [])

  const getStat = (type: string, status: string) => 
    stats?.byType?.[type]?.[status] || 0

  const openComplaints = getStat('complaint', 'submitted') + getStat('complaint', 'in_review') + getStat('complaint', 'in_progress')
  const openIncidents = getStat('incident', 'submitted') + getStat('incident', 'in_review') + getStat('incident', 'in_progress')
  const openCapa = getStat('capa', 'submitted') + getStat('capa', 'in_review') + getStat('capa', 'in_progress')
  const totalClosed = getStat('complaint', 'closed') + getStat('incident', 'closed') + getStat('capa', 'closed')

  const statCards = [
    {
      title: 'Open Complaints',
      value: openComplaints,
      icon: <FileText className="w-5 h-5" />,
      color: 'bg-blue-50 text-blue-700 border-blue-200',
      link: '/hospital/compliance/complaints'
    },
    {
      title: 'Open Incidents',
      value: openIncidents,
      icon: <AlertTriangle className="w-5 h-5" />,
      color: 'bg-orange-50 text-orange-700 border-orange-200',
      link: '/hospital/compliance/incidents'
    },
    {
      title: 'Open CAPA',
      value: openCapa,
      icon: <TrendingUp className="w-5 h-5" />,
      color: 'bg-green-50 text-green-700 border-green-200',
      link: '/hospital/compliance/capa'
    },
    {
      title: 'Closed Items',
      value: totalClosed,
      icon: <CheckCircle className="w-5 h-5" />,
      color: 'bg-gray-50 text-gray-700 border-gray-200',
      link: '#'
    },
    {
      title: 'Overdue Tasks',
      value: stats?.overdueTasksAll || 0,
      icon: <Clock className="w-5 h-5" />,
      color: 'bg-red-50 text-red-700 border-red-200',
      link: '#'
    }
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Compliance Overview</h1>
        <p className="text-gray-600 mt-1">Monitor complaints, incidents, and corrective actions</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-8">
        {statCards.map((card, index) => (
          <Link
            key={index}
            to={card.link}
            className="bg-white rounded-lg border p-4 hover:shadow-md transition-shadow duration-200"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{card.title}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{card.value}</p>
              </div>
              <div className={`p-3 rounded-full border ${card.color}`}>
                {card.icon}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            to="/hospital/compliance/complaints"
            className="flex items-center p-4 border rounded-lg hover:bg-gray-50 transition-colors"
          >
            <FileText className="w-5 h-5 text-blue-600 mr-3" />
            <div>
              <p className="font-medium text-gray-900">Manage Complaints</p>
              <p className="text-sm text-gray-600">View and manage patient complaints</p>
            </div>
          </Link>
          <Link
            to="/hospital/compliance/incidents"
            className="flex items-center p-4 border rounded-lg hover:bg-gray-50 transition-colors"
          >
            <AlertTriangle className="w-5 h-5 text-orange-600 mr-3" />
            <div>
              <p className="font-medium text-gray-900">Track Incidents</p>
              <p className="text-sm text-gray-600">Log and track safety incidents</p>
            </div>
          </Link>
          <Link
            to="/hospital/compliance/capa"
            className="flex items-center p-4 border rounded-lg hover:bg-gray-50 transition-colors"
          >
            <TrendingUp className="w-5 h-5 text-green-600 mr-3" />
            <div>
              <p className="font-medium text-gray-900">CAPA Management</p>
              <p className="text-sm text-gray-600">Corrective and preventive actions</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}
