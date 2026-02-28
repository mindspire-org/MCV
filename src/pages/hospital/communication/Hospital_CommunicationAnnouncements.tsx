import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Megaphone, Plus, Search, Calendar, Users, Eye, Pin } from 'lucide-react'
import { hospitalApi } from '../../../utils/api'

interface Announcement {
  _id: string
  title: string
  content: string
  category: 'general' | 'medical' | 'administrative' | 'emergency' | 'policy'
  priority: 'low' | 'medium' | 'high'
  status: 'draft' | 'published' | 'archived'
  publishDate?: string
  expiryDate?: string
  author: string
  viewCount: number
  isPinned: boolean
}

export default function Hospital_CommunicationAnnouncements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')

  useEffect(() => {
    fetchAnnouncements()
  }, [])

  const fetchAnnouncements = async () => {
    try {
      // This would typically call a real API endpoint
      // For now, we'll simulate with mock data
      const mockAnnouncements: Announcement[] = [
        {
          _id: '1',
          title: 'New Cardiology Department Opening',
          content: 'We are pleased to announce the opening of our new state-of-the-art cardiology department with advanced diagnostic facilities.',
          category: 'medical',
          priority: 'high',
          status: 'published',
          publishDate: new Date(Date.now() - 86400000).toISOString().split('T')[0],
          expiryDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
          author: 'Hospital Administration',
          viewCount: 156,
          isPinned: true
        },
        {
          _id: '2',
          title: 'Updated Visitor Guidelines',
          content: 'Please note the updated visitor guidelines for patient safety. All visitors must follow the new protocols.',
          category: 'policy',
          priority: 'medium',
          status: 'published',
          publishDate: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0],
          expiryDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
          author: 'Security Department',
          viewCount: 89,
          isPinned: false
        }
      ]
      setAnnouncements(mockAnnouncements)
    } catch (error) {
      console.error('Failed to fetch announcements:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredAnnouncements = announcements.filter(announcement => {
    const matchesSearch = announcement.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         announcement.content.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || announcement.status === statusFilter
    const matchesCategory = categoryFilter === 'all' || announcement.category === categoryFilter
    return matchesSearch && matchesStatus && matchesCategory
  })

  const getCategoryBadge = (category: string) => {
    const styles = {
      general: 'bg-gray-100 text-gray-800',
      medical: 'bg-blue-100 text-blue-800',
      administrative: 'bg-green-100 text-green-800',
      emergency: 'bg-red-100 text-red-800',
      policy: 'bg-purple-100 text-purple-800'
    }
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[category as keyof typeof styles] || styles.general}`}>
        {category.toUpperCase()}
      </span>
    )
  }

  const getPriorityBadge = (priority: string) => {
    const styles = {
      low: 'bg-gray-100 text-gray-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-red-100 text-red-800'
    }
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[priority as keyof typeof styles] || styles.medium}`}>
        {priority.toUpperCase()}
      </span>
    )
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      draft: 'bg-gray-100 text-gray-800',
      published: 'bg-green-100 text-green-800',
      archived: 'bg-orange-100 text-orange-800'
    }
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status as keyof typeof styles] || styles.draft}`}>
        {status.toUpperCase()}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Announcements</h1>
          <p className="text-gray-600 mt-1">Create and manage hospital announcements</p>
        </div>
        <Link
          to="/hospital/communication/announcements/new"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Announcement
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Megaphone className="w-5 h-5 text-green-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Published</p>
              <p className="text-xl font-bold text-gray-900">
                {announcements.filter(a => a.status === 'published').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center">
            <div className="p-2 bg-gray-100 rounded-lg">
              <Pin className="w-5 h-5 text-gray-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Pinned</p>
              <p className="text-xl font-bold text-gray-900">
                {announcements.filter(a => a.isPinned).length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Eye className="w-5 h-5 text-blue-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Total Views</p>
              <p className="text-xl font-bold text-gray-900">
                {announcements.reduce((sum, a) => sum + a.viewCount, 0)}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Calendar className="w-5 h-5 text-orange-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Expiring Soon</p>
              <p className="text-xl font-bold text-gray-900">
                {announcements.filter(a => {
                  if (!a.expiryDate) return false
                  const daysUntilExpiry = Math.ceil((new Date(a.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                  return daysUntilExpiry <= 7 && daysUntilExpiry > 0
                }).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search announcements..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500 w-full"
              />
            </div>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
          >
            <option value="all">All Categories</option>
            <option value="general">General</option>
            <option value="medical">Medical</option>
            <option value="administrative">Administrative</option>
            <option value="emergency">Emergency</option>
            <option value="policy">Policy</option>
          </select>
        </div>
      </div>

      {/* Announcements List */}
      <div className="bg-white rounded-lg border">
        {filteredAnnouncements.length === 0 ? (
          <div className="text-center py-12">
            <Megaphone className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No announcements found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || statusFilter !== 'all' || categoryFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Get started by creating a new announcement'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Announcement
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Publish Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Views
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAnnouncements.map((announcement) => (
                  <tr key={announcement._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-start">
                        {announcement.isPinned && (
                          <Pin className="w-4 h-4 text-orange-500 mr-2 mt-0.5 flex-shrink-0" />
                        )}
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900">
                            {announcement.title}
                          </div>
                          <div className="text-sm text-gray-500 truncate max-w-xs">
                            {announcement.content}
                          </div>
                          <div className="text-xs text-gray-400 mt-1">
                            By {announcement.author}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getCategoryBadge(announcement.category)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getPriorityBadge(announcement.priority)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(announcement.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {announcement.publishDate || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        <Eye className="w-4 h-4 text-gray-400 mr-1" />
                        {announcement.viewCount}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Link
                        to={`/hospital/communication/announcements/${announcement._id}`}
                        className="text-green-600 hover:text-green-900"
                      >
                        View Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
