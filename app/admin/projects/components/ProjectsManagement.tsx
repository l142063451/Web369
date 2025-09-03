/**
 * Projects Management Component
 * Main interface for project CRUD, mapping, and budget visualization
 */

'use client'

import { useState, useEffect } from 'react'
import { Tab } from '@headlessui/react'
import { MapIcon, ChartBarIcon, ListBulletIcon } from '@heroicons/react/24/outline'
import dynamic from 'next/dynamic'
import type { ProjectMapData } from '@/components/maps/MapLibreComponent'
import type { BudgetSummary } from '@/lib/projects/service'

// Dynamically import map and chart components to avoid SSR issues
const MapLibreComponent = dynamic(
  () => import('@/components/maps/MapLibreComponent'),
  { 
    ssr: false,
    loading: () => <div className="flex items-center justify-center h-96 bg-gray-100 rounded-lg">Loading map...</div>
  }
)

const BudgetSankey = dynamic(
  () => import('@/components/projects/BudgetSankey'),
  { 
    ssr: false,
    loading: () => <div className="flex items-center justify-center h-96 bg-gray-100 rounded-lg">Loading chart...</div>
  }
)

interface Project {
  id: string
  title: string
  type: string
  ward?: string
  budget: number
  spent: number
  status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  startDate?: string
  endDate?: string
  createdAt: string
  updatedAt: string
}

const TABS = [
  { name: 'Projects List', icon: ListBulletIcon },
  { name: 'Map View', icon: MapIcon },
  { name: 'Budget Analysis', icon: ChartBarIcon },
]

const MOCK_PROJECTS: Project[] = [
  {
    id: '1',
    title: 'Village Road Improvement Phase 1',
    type: 'Infrastructure',
    ward: 'Ward 1',
    budget: 500000,
    spent: 250000,
    status: 'IN_PROGRESS',
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-09-01T00:00:00Z',
  },
  {
    id: '2',
    title: 'Water Supply System Upgrade',
    type: 'Infrastructure',
    ward: 'Ward 2',
    budget: 750000,
    spent: 100000,
    status: 'PLANNED',
    startDate: '2024-06-01',
    endDate: '2025-05-31',
    createdAt: '2024-05-01T00:00:00Z',
    updatedAt: '2024-08-15T00:00:00Z',
  },
  {
    id: '3',
    title: 'Community Center Construction',
    type: 'Social',
    ward: 'Ward 3',
    budget: 1200000,
    spent: 1200000,
    status: 'COMPLETED',
    startDate: '2023-03-01',
    endDate: '2024-02-28',
    createdAt: '2023-02-01T00:00:00Z',
    updatedAt: '2024-03-01T00:00:00Z',
  },
]

const MOCK_MAP_DATA: ProjectMapData[] = [
  {
    id: '1',
    title: 'Village Road Improvement Phase 1',
    type: 'Infrastructure',
    status: 'IN_PROGRESS',
    latitude: 29.5537,
    longitude: 79.6413,
    budget: 500000,
    spent: 250000,
    milestones: [
      {
        id: 'm1',
        title: 'Foundation Complete',
        latitude: 29.5540,
        longitude: 79.6410,
        progress: 100,
        date: '2024-03-15T00:00:00Z'
      },
      {
        id: 'm2',
        title: 'Surface Layer',
        latitude: 29.5535,
        longitude: 79.6415,
        progress: 60,
        date: '2024-08-30T00:00:00Z'
      },
    ]
  },
  {
    id: '2',
    title: 'Water Supply System Upgrade',
    type: 'Infrastructure', 
    status: 'PLANNED',
    latitude: 29.5550,
    longitude: 79.6400,
    budget: 750000,
    spent: 100000,
    milestones: []
  },
  {
    id: '3',
    title: 'Community Center Construction',
    type: 'Social',
    status: 'COMPLETED',
    latitude: 29.5520,
    longitude: 79.6430,
    budget: 1200000,
    spent: 1200000,
    milestones: []
  },
]

const MOCK_BUDGET_SUMMARY: BudgetSummary = {
  totalAllocated: 2450000,
  totalSpent: 1550000,
  totalCommitted: 200000,
  remaining: 700000,
  categories: {
    'Materials': { allocated: 1000000, spent: 650000, committed: 100000 },
    'Labor': { allocated: 800000, spent: 500000, committed: 80000 },
    'Equipment': { allocated: 400000, spent: 250000, committed: 20000 },
    'Overhead': { allocated: 250000, spent: 150000, committed: 0 },
  }
}

export function ProjectsManagement() {
  const [selectedTab, setSelectedTab] = useState(0)
  const [projects, setProjects] = useState<Project[]>(MOCK_PROJECTS)
  const [mapData, setMapData] = useState<ProjectMapData[]>(MOCK_MAP_DATA)
  const [budgetSummary, setBudgetSummary] = useState<BudgetSummary>(MOCK_BUDGET_SUMMARY)
  const [loading, setLoading] = useState(false)
  const [selectedProject, setSelectedProject] = useState<string | null>(null)

  // Load projects data
  useEffect(() => {
    const loadProjects = async () => {
      setLoading(true)
      try {
        // In a real app, these would be API calls
        // const response = await fetch('/api/projects')
        // const data = await response.json()
        // setProjects(data.data)
        
        // For now, using mock data
        await new Promise(resolve => setTimeout(resolve, 500)) // Simulate API delay
      } catch (error) {
        console.error('Failed to load projects:', error)
      } finally {
        setLoading(false)
      }
    }

    loadProjects()
  }, [])

  const handleProjectClick = (project: ProjectMapData) => {
    setSelectedProject(project.id)
    console.log('Project clicked:', project)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PLANNED': return 'bg-blue-100 text-blue-800'
      case 'IN_PROGRESS': return 'bg-yellow-100 text-yellow-800'
      case 'COMPLETED': return 'bg-green-100 text-green-800'
      case 'CANCELLED': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <div className="bg-white rounded-lg shadow-sm">
      <Tab.Group selectedIndex={selectedTab} onChange={setSelectedTab}>
        {/* Tab Navigation */}
        <Tab.List className="flex space-x-1 rounded-t-lg bg-blue-900/20 p-1">
          {TABS.map((tab, index) => (
            <Tab
              key={tab.name}
              className={({ selected }) =>
                `w-full rounded-lg py-2.5 text-sm font-medium leading-5 transition-all ${
                  selected
                    ? 'bg-white text-blue-700 shadow'
                    : 'text-blue-100 hover:bg-white/[0.12] hover:text-white'
                }`
              }
            >
              <div className="flex items-center justify-center gap-2">
                <tab.icon className="h-4 w-4" />
                {tab.name}
              </div>
            </Tab>
          ))}
        </Tab.List>

        <Tab.Panels className="mt-0">
          {/* Projects List Tab */}
          <Tab.Panel className="p-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">All Projects</h3>
                <div className="flex gap-2">
                  <select className="border border-gray-300 rounded-md px-3 py-2 text-sm">
                    <option value="">All Status</option>
                    <option value="PLANNED">Planned</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                  <select className="border border-gray-300 rounded-md px-3 py-2 text-sm">
                    <option value="">All Types</option>
                    <option value="Infrastructure">Infrastructure</option>
                    <option value="Social">Social</option>
                    <option value="Environment">Environment</option>
                  </select>
                </div>
              </div>

              {loading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-20 bg-gray-200 rounded-lg"></div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {projects.map((project) => (
                    <div
                      key={project.id}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-semibold text-lg">{project.title}</h4>
                          <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                            <span>Type: {project.type}</span>
                            {project.ward && <span>Ward: {project.ward}</span>}
                            <span>
                              <span 
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}
                              >
                                {project.status.replace('_', ' ')}
                              </span>
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600 mt-2">
                            <span>Budget: {formatCurrency(project.budget)}</span>
                            <span>Spent: {formatCurrency(project.spent)}</span>
                            <span>
                              Progress: {Math.round((project.spent / project.budget) * 100)}%
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                            Edit
                          </button>
                          <button className="text-gray-600 hover:text-gray-800 text-sm font-medium">
                            View
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Tab.Panel>

          {/* Map View Tab */}
          <Tab.Panel className="p-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Project Locations</h3>
              <MapLibreComponent
                projects={mapData}
                onProjectClick={handleProjectClick}
                height="500px"
                className="border border-gray-200"
              />
            </div>
          </Tab.Panel>

          {/* Budget Analysis Tab */}
          <Tab.Panel className="p-6">
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Budget Flow Analysis</h3>
              <BudgetSankey
                budgetSummary={budgetSummary}
                width={800}
                height={400}
              />
            </div>
          </Tab.Panel>
        </Tab.Panels>
      </Tab.Group>
    </div>
  )
}