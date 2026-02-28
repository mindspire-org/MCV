import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell, Megaphone, MessageSquare, Users, TrendingUp, Calendar } from 'lucide-react'
import { hospitalApi } from '../../../utils/api'

interface CommunicationStats {
  totalNotifications: number
  totalAnnouncements: number
  totalFeedback: number
  recentActivity: number
}

export default function Hospital_CommunicationOverview() {
  const [stats, setStats] = useState<CommunicationStats>({
    totalNotifications: 0,
    totalAnnouncements: 0,
    totalFeedback: 0,
    recentActivity: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      // This would typically call real API endpoints
      // For now, we'll simulate with placeholder data
      const mockStats: CommunicationStats = {
        totalNotifications: 24,
        totalAnnouncements: 12,
        totalFeedback: 8,
        recentActivity: 15
      }
      setStats(mockStats)
    } catch (e) {
      console.error('Failed to load communication stats', e)
    } finally {
      setLoading(false)
    }
  }

  const statCards = [
    {
      title: 'Total Notifications',
      value: stats.totalNotifications,
      icon: <Bell className="w-5 h-5" />,
      color: 'bg-blue-50 text-blue-700 border-blue-200',
      link: '/hospital/communication/notifications'
    },
    {
      title: 'Announcements',
      value: stats.totalAnnouncements,
      icon: <Megaphone className="w-5 h-5" />,
      color: 'bg-green-50 text-green-700 border-green-200',
      link: '/hospital/communication/announcements'
    },
    {
      title: 'Feedback Received',
      value: stats.totalFeedback,
      icon: <MessageSquare className="w-5 h-5" />,
      color: 'bg-purple-50 text-purple-700 border-purple-200',
      link: '/hospital/communication/feedback'
    },
    {
      title: 'Recent Activity',
      value: stats.recentActivity,
      icon: <TrendingUp className="w-5 h-5" />,
      color: 'bg-orange-50 text-orange-700 border-orange-200',
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
        <h1 className="text-2xl font-bold text-gray-900">Communication Overview</h1>
        <p className="text-gray-600 mt-1">Manage notifications, announcements, and feedback</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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
      <div className="bg-white rounded-lg border p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            to="/hospital/communication/notifications"
            className="flex items-center p-4 border rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Bell className="w-5 h-5 text-blue-600 mr-3" />
            <div>
              <p className="font-medium text-gray-900">Send Notifications</p>
              <p className="text-sm text-gray-600">Create and send notifications</p>
            </div>
          </Link>
          <Link
            to="/hospital/communication/announcements"
            className="flex items-center p-4 border rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Megaphone className="w-5 h-5 text-green-600 mr-3" />
            <div>
              <p className="font-medium text-gray-900">Manage Announcements</p>
              <p className="text-sm text-gray-600">Create hospital announcements</p>
            </div>
          </Link>
          <Link
            to="/hospital/communication/feedback"
            className="flex items-center p-4 border rounded-lg hover:bg-gray-50 transition-colors"
          >
            <MessageSquare className="w-5 h-5 text-purple-600 mr-3" />
            <div>
              <p className="font-medium text-gray-900">View Feedback</p>
              <p className="text-sm text-gray-600">Review patient and staff feedback</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
        <div className="space-y-4">
          <div className="flex items-center p-3 bg-gray-50 rounded-lg">
            <div className="p-2 bg-blue-100 rounded-full mr-3">
              <Bell className="w-4 h-4 text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">New notification sent</p>
              <p className="text-xs text-gray-500">System maintenance scheduled for tonight</p>
            </div>
            <div className="text-xs text-gray-500">2 hours ago</div>
          </div>
          <div className="flex items-center p-3 bg-gray-50 rounded-lg">
            <div className="p-2 bg-green-100 rounded-full mr-3">
              <Megaphone className="w-4 h-4 text-green-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">New announcement posted</p>
              <p className="text-xs text-gray-500">New doctor joining the cardiology department</p>
            </div>
            <div className="text-xs text-gray-500">5 hours ago</div>
          </div>
          <div className="flex items-center p-3 bg-gray-50 rounded-lg">
            <div className="p-2 bg-purple-100 rounded-full mr-3">
              <MessageSquare className="w-4 h-4 text-purple-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">New feedback received</p>
              <p className="text-xs text-gray-500">Patient satisfaction survey response</p>
            </div>
            <div className="text-xs text-gray-500">1 day ago</div>
          </div>
        </div>
      </div>
    </div>
  )
}
