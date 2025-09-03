'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  FileText,
  Image,
  FormInput,
  Inbox,
  MapPin,
  Users,
  CheckSquare,
  Calendar,
  Building,
  Bell,
  BarChart3,
  Settings,
  Database,
  FileSearch,
  Home,
  MessageSquare,
  Newspaper
} from 'lucide-react'

interface NavigationItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  description?: string
}

const navigationItems: NavigationItem[] = [
  {
    name: 'Dashboard',
    href: '/admin',
    icon: Home,
    description: 'Overview and key metrics'
  },
  {
    name: 'Content Manager',
    href: '/admin/content',
    icon: FileText,
    description: 'Pages, sections, and blocks'
  },
  {
    name: 'News & Articles',
    href: '/admin/news',
    icon: Newspaper,
    description: 'News articles and announcements'
  },
  {
    name: 'Media Library',
    href: '/admin/media',
    icon: Image,
    description: 'Images, documents, and files'
  },
  {
    name: 'Form Builder',
    href: '/admin/forms',
    icon: FormInput,
    description: 'Create and manage forms'
  },
  {
    name: 'Submissions',
    href: '/admin/submissions',
    icon: Inbox,
    description: 'Form submissions and requests'
  },
  {
    name: 'Projects & Budgets',
    href: '/admin/projects',
    icon: MapPin,
    description: 'Project management and tracking'
  },
  {
    name: 'Users & Roles',
    href: '/admin/users',
    icon: Users,
    description: 'User management and permissions'
  },
  {
    name: 'Moderation',
    href: '/admin/moderation',
    icon: CheckSquare,
    description: 'Content approval queues'
  },
  {
    name: 'Translations',
    href: '/admin/translations',
    icon: MessageSquare,
    description: 'Manage language translations'
  },
  {
    name: 'Events',
    href: '/admin/events',
    icon: Calendar,
    description: 'Events and calendar management'
  },
  {
    name: 'Directory',
    href: '/admin/directory',
    icon: Building,
    description: 'Business and organization listings'
  },
  {
    name: 'Notifications',
    href: '/admin/notifications',
    icon: Bell,
    description: 'Send messages and announcements'
  },
  {
    name: 'Analytics',
    href: '/admin/analytics',
    icon: BarChart3,
    description: 'Reports and insights'
  },
  {
    name: 'Settings',
    href: '/admin/settings',
    icon: Settings,
    description: 'System configuration'
  },
  {
    name: 'Backups',
    href: '/admin/backups',
    icon: Database,
    description: 'Data backup and restore'
  },
  {
    name: 'Audit Logs',
    href: '/admin/audit',
    icon: FileSearch,
    description: 'System activity logs'
  },
]

export function AdminNavigation() {
  const pathname = usePathname()

  return (
    <nav className="flex-1 px-2 pb-4 space-y-1">
      {navigationItems.map((item) => {
        const isActive = pathname === item.href
        const Icon = item.icon

        return (
          <Link
            key={item.name}
            href={item.href}
            className={cn(
              'group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors',
              isActive
                ? 'bg-green-100 text-green-900 border-r-2 border-green-600'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            )}
          >
            <Icon
              className={cn(
                'mr-3 flex-shrink-0 h-5 w-5 transition-colors',
                isActive
                  ? 'text-green-600'
                  : 'text-gray-400 group-hover:text-gray-500'
              )}
            />
            <div className="flex-1 min-w-0">
              <span className="truncate">{item.name}</span>
              {item.description && (
                <p className="text-xs text-gray-500 truncate mt-0.5">
                  {item.description}
                </p>
              )}
            </div>
          </Link>
        )
      })}
    </nav>
  )
}