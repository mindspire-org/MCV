import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { MessageSquare, Search, Star, Calendar, User, Filter, TrendingUp } from 'lucide-react'
import { hospitalApi } from '../../../utils/api'

interface Feedback {
  _id: string
  title: string
  content: string
  category: 'service' | 'facility' | 'staff' | 'medical' | 'general'
  rating: number
  status: 'new' | 'in_review' | 'responded' | 'resolved' | 'closed'
  submittedBy: string
  submittedDate: string
  assignedTo?: string
  department?: string
}

export default function Hospital_CommunicationFeedback() {
  const [feedback, setFeedback] = useState<Feedback[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [ratingFilter, setRatingFilter] = useState<string>('all')

  useEffect(() => {
    fetchFeedback()
  }, [])

  const fetchFeedback = async () => {
    try {
      // This would typically call a real API endpoint
      // For now, we'll simulate with mock data
      const mockFeedback: Feedback[] = [
        {
          _id: '1',
          title: 'Excellent Nursing Care',
          content: 'The nursing staff in the ICU provided exceptional care and showed great compassion during my stay.',
          category: 'staff',
          rating: 5,
          status: 'new',
          submittedBy: 'John Doe',
          submittedDate: new Date().toISOString().split('T')[0],
          department: 'ICU'
        },
        {
          _id: '2',
          title: 'Waiting Time Issue',
          content: 'Had to wait for over 2 hours in the emergency department despite having an appointment.',
          category: 'service',
          rating: 2,
          status: 'in_review',
          submittedBy: 'Jane Smith',
          submittedDate: new Date(Date.now() - 86400000).toISOString().split('T')[0],
          department: 'Emergency'
        }
      ]
      setFeedback(mockFeedback)
    } catch (error) {
      console.error('Failed to fetch feedback:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredFeedback = feedback.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.content.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter
    const matchesRating = ratingFilter === 'all' || item.rating.toString() === ratingFilter
    return matchesSearch && matchesStatus && matchesCategory && matchesRating
  })

  const getCategoryBadge = (category: string) => {
    const styles = {
      service: 'bg-blue-100 text-blue-800',
      facility: 'bg-green-100 text-green-800',
      staff: 'bg-purple-100 text-purple-800',
      medical: 'bg-red-100 text-red-800',
      general: 'bg-gray-100 text-gray-800'
    }
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[category as keyof typeof styles] || styles.general}`}>
        {category.toUpperCase()}
      </span>
    )
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      new: 'bg-red-100 text-red-800',
      in_review: 'bg-yellow-100 text-yellow-800',
      responded: 'bg-blue-100 text-blue-800',
      resolved: 'bg-green-100 text-green-800',
      closed: 'bg-gray-100 text-gray-800'
    }
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status as keyof typeof styles] || styles.new}`}>
        {status.replace('_', ' ').toUpperCase()}
      </span>
    )
  }

  const getRatingStars = (rating: number) => {
    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
            }`}
          />
        ))}
        <span className="ml-1 text-sm text-gray-600">({rating})</span>
      </div>
    )
  }

  const getAverageRating = () => {
    if (feedback.length === 0) return 0
    const sum = feedback.reduce((acc, item) => acc + item.rating, 0)
    return (sum / feedback.length).toFixed(1)
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
          <h1 className="text-2xl font-bold text-gray-900">Feedback Management</h1>
          <p className="text-gray-600 mt-1">Review and respond to patient and staff feedback</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <MessageSquare className="w-5 h-5 text-purple-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Total Feedback</p>
              <p className="text-xl font-bold text-gray-900">{feedback.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <Filter className="w-5 h-5 text-red-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">New</p>
              <p className="text-xl font-bold text-gray-900">
                {feedback.filter(f => f.status === 'new').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Star className="w-5 h-5 text-yellow-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Avg Rating</p>
              <p className="text-xl font-bold text-gray-900">{getAverageRating()}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Resolved</p>
              <p className="text-xl font-bold text-gray-900">
                {feedback.filter(f => f.status === 'resolved' || f.status === 'closed').length}
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
                placeholder="Search feedback..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500 w-full"
              />
            </div>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
          >
            <option value="all">All Status</option>
            <option value="new">New</option>
            <option value="in_review">In Review</option>
            <option value="responded">Responded</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
          >
            <option value="all">All Categories</option>
            <option value="service">Service</option>
            <option value="facility">Facility</option>
            <option value="staff">Staff</option>
            <option value="medical">Medical</option>
            <option value="general">General</option>
          </select>
          <select
            value={ratingFilter}
            onChange={(e) => setRatingFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
          >
            <option value="all">All Ratings</option>
            <option value="5">5 Stars</option>
            <option value="4">4 Stars</option>
            <option value="3">3 Stars</option>
            <option value="2">2 Stars</option>
            <option value="1">1 Star</option>
          </select>
        </div>
      </div>

      {/* Feedback List */}
      <div className="bg-white rounded-lg border">
        {filteredFeedback.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No feedback found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || statusFilter !== 'all' || categoryFilter !== 'all' || ratingFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'No feedback has been submitted yet'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Feedback
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rating
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Submitted By
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredFeedback.map((item) => (
                  <tr key={item._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {item.title}
                        </div>
                        <div className="text-sm text-gray-500 truncate max-w-xs">
                          {item.content}
                        </div>
                        {item.department && (
                          <div className="text-xs text-gray-400 mt-1">
                            Department: {item.department}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getCategoryBadge(item.category)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getRatingStars(item.rating)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(item.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        <User className="w-4 h-4 text-gray-400 mr-1" />
                        {item.submittedBy}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 text-gray-400 mr-1" />
                        {item.submittedDate}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Link
                        to={`/hospital/communication/feedback/${item._id}`}
                        className="text-purple-600 hover:text-purple-900"
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
