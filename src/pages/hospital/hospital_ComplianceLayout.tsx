import { useState } from 'react'
import { Outlet, useLocation, Link } from 'react-router-dom'

type TabItem = {
  key: string
  label: string
  path: string
}

const complianceTabs: TabItem[] = [
  { key: 'overview', label: 'Overview', path: '/hospital/compliance' },
  { key: 'complaints', label: 'Complaints', path: '/hospital/compliance/complaints' },
  { key: 'incidents', label: 'Incidents', path: '/hospital/compliance/incidents' },
  { key: 'capa', label: 'CAPA', path: '/hospital/compliance/capa' },
]

const communicationTabs: TabItem[] = [
  { key: 'overview', label: 'Overview', path: '/hospital/communication' },
  { key: 'notifications', label: 'Notifications', path: '/hospital/communication/notifications' },
  { key: 'announcements', label: 'Announcements', path: '/hospital/communication/announcements' },
  { key: 'feedback', label: 'Feedback', path: '/hospital/communication/feedback' },
]

export default function Hospital_ComplianceLayout() {
  const location = useLocation()
  const [activeMainTab, setActiveMainTab] = useState<'compliance' | 'communication'>('compliance')

  const isComplianceRoute = location.pathname.startsWith('/hospital/compliance')
  const isCommunicationRoute = location.pathname.startsWith('/hospital/communication')

  // Auto-detect which main tab should be active based on current route
  useState(() => {
    if (isComplianceRoute) setActiveMainTab('compliance')
    else if (isCommunicationRoute) setActiveMainTab('communication')
  })

  const currentTabs = activeMainTab === 'compliance' ? complianceTabs : communicationTabs
  const activeTab = currentTabs.find(tab => location.pathname === tab.path)?.key || currentTabs[0].key

  const renderTabContent = () => {
    if (activeMainTab === 'compliance') {
      return (
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
            {complianceTabs.map((tab) => (
              <Link
                key={tab.key}
                to={tab.path}
                className={`${
                  activeTab === tab.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200`}
                aria-current={activeTab === tab.key ? 'page' : undefined}
              >
                {tab.label}
              </Link>
            ))}
          </nav>
        </div>
      )
    } else {
      return (
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
            {communicationTabs.map((tab) => (
              <Link
                key={tab.key}
                to={tab.path}
                className={`${
                  activeTab === tab.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200`}
                aria-current={activeTab === tab.key ? 'page' : undefined}
              >
                {tab.label}
              </Link>
            ))}
          </nav>
        </div>
      )
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Main Tab Navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6">
          <nav className="flex space-x-8" aria-label="Main tabs">
            <button
              onClick={() => setActiveMainTab('compliance')}
              className={`${
                activeMainTab === 'compliance'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200`}
            >
              Compliance
            </button>
            <button
              onClick={() => setActiveMainTab('communication')}
              className={`${
                activeMainTab === 'communication'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200`}
            >
              Communication
            </button>
          </nav>
        </div>
      </div>

      {/* Sub Tab Navigation */}
      {renderTabContent()}

      {/* Content Area */}
      <div className="flex-1 overflow-auto">
        <Outlet />
      </div>
    </div>
  )
}
