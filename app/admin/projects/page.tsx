/**
 * Projects Admin Page
 * Project management interface with map integration and budget visualization
 */

import { Suspense } from 'react'
import { Metadata } from 'next'
import { ProjectsManagement } from './components/ProjectsManagement'

export const metadata: Metadata = {
  title: 'Projects & Budgets | Admin',
  description: 'Manage village projects, milestones, and budget tracking',
}

function ProjectsLoading() {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-6"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    </div>
  )
}

export default function ProjectsAdminPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Projects & Budgets
            </h1>
            <p className="text-gray-600 mt-2">
              Manage village development projects, track milestones, and monitor budget allocation
            </p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => window.open('/api/projects/export?type=projects', '_blank')}
              className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Export CSV
            </button>
            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
              New Project
            </button>
          </div>
        </div>
      </div>

      {/* Projects Management Component */}
      <Suspense fallback={<ProjectsLoading />}>
        <ProjectsManagement />
      </Suspense>
    </div>
  )
}