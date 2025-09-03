/**
 * CSV Export Utilities for Projects
 * Handles CSV generation and download for project data
 */

export interface ProjectCSVData {
  id: string
  title: string
  type: string
  ward?: string
  status: string
  budget: number
  spent: number
  percentSpent: number
  remaining: number
  startDate?: string
  endDate?: string
  milestoneCount: number
  lastUpdated: string
  tags: string
  contractors: string
}

export interface BudgetCSVData {
  projectId: string
  projectTitle: string
  category: string
  subcategory?: string
  allocated: number
  spent: number
  committed: number
  remaining: number
  utilizationPercent: number
}

/**
 * Convert projects data to CSV format
 */
export function convertProjectsToCSV(projects: any[]): string {
  const csvData: ProjectCSVData[] = projects.map(project => ({
    id: project.id,
    title: project.title,
    type: project.type,
    ward: project.ward || '',
    status: project.status,
    budget: Number(project.budget),
    spent: Number(project.spent),
    percentSpent: Math.round((Number(project.spent) / Number(project.budget)) * 100),
    remaining: Number(project.budget) - Number(project.spent),
    startDate: project.startDate ? new Date(project.startDate).toLocaleDateString() : '',
    endDate: project.endDate ? new Date(project.endDate).toLocaleDateString() : '',
    milestoneCount: project.projectMilestones?.length || 0,
    lastUpdated: new Date(project.updatedAt).toLocaleDateString(),
    tags: project.tags.join('; '),
    contractors: typeof project.contractors === 'object' 
      ? Object.entries(project.contractors).map(([role, name]) => `${role}: ${name}`).join('; ')
      : String(project.contractors)
  }))

  return generateCSV(csvData, [
    { key: 'id', label: 'Project ID' },
    { key: 'title', label: 'Project Title' },
    { key: 'type', label: 'Type' },
    { key: 'ward', label: 'Ward' },
    { key: 'status', label: 'Status' },
    { key: 'budget', label: 'Budget (₹)' },
    { key: 'spent', label: 'Spent (₹)' },
    { key: 'percentSpent', label: 'Spent (%)' },
    { key: 'remaining', label: 'Remaining (₹)' },
    { key: 'startDate', label: 'Start Date' },
    { key: 'endDate', label: 'End Date' },
    { key: 'milestoneCount', label: 'Milestones' },
    { key: 'lastUpdated', label: 'Last Updated' },
    { key: 'tags', label: 'Tags' },
    { key: 'contractors', label: 'Contractors' },
  ])
}

/**
 * Convert budget breakdown to CSV format
 */
export function convertBudgetToCSV(budgetLines: any[]): string {
  const csvData: BudgetCSVData[] = budgetLines.map(line => {
    const allocated = Number(line.allocated)
    const spent = Number(line.spent)
    const committed = Number(line.committed)
    const remaining = allocated - spent - committed

    return {
      projectId: line.projectId,
      projectTitle: line.project?.title || 'Unknown Project',
      category: line.category,
      subcategory: line.subcategory || '',
      allocated,
      spent,
      committed,
      remaining,
      utilizationPercent: allocated > 0 ? Math.round(((spent + committed) / allocated) * 100) : 0
    }
  })

  return generateCSV(csvData, [
    { key: 'projectId', label: 'Project ID' },
    { key: 'projectTitle', label: 'Project Title' },
    { key: 'category', label: 'Budget Category' },
    { key: 'subcategory', label: 'Subcategory' },
    { key: 'allocated', label: 'Allocated (₹)' },
    { key: 'spent', label: 'Spent (₹)' },
    { key: 'committed', label: 'Committed (₹)' },
    { key: 'remaining', label: 'Remaining (₹)' },
    { key: 'utilizationPercent', label: 'Utilization (%)' },
  ])
}

/**
 * Generate CSV string from data array
 */
function generateCSV<T>(data: T[], columns: { key: keyof T; label: string }[]): string {
  // Create header row
  const headers = columns.map(col => `"${col.label}"`).join(',')
  
  // Create data rows
  const rows = data.map(item => {
    return columns.map(col => {
      const value = item[col.key]
      // Handle different data types
      if (value === null || value === undefined) {
        return '""'
      } else if (typeof value === 'string') {
        // Escape quotes and wrap in quotes
        return `"${value.replace(/"/g, '""')}"`
      } else if (typeof value === 'number') {
        return value.toString()
      } else {
        return `"${String(value).replace(/"/g, '""')}"`
      }
    }).join(',')
  })
  
  return [headers, ...rows].join('\n')
}

/**
 * Trigger CSV download in browser
 */
export function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
}

/**
 * Generate timestamped filename
 */
export function generateFilename(prefix: string, extension: string = 'csv'): string {
  const timestamp = new Date().toISOString().split('T')[0] // YYYY-MM-DD format
  return `${prefix}_${timestamp}.${extension}`
}