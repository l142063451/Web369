import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Offline - Ummid Se Hari',
  description: 'You are currently offline',
}

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md mx-auto text-center px-4">
        <div className="mb-8">
          <div className="w-24 h-24 mx-auto mb-4 bg-gray-200 rounded-full flex items-center justify-center">
            <svg 
              className="w-12 h-12 text-gray-400" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364" 
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">You&rsquo;re Offline</h1>
          <p className="text-gray-600 mb-6">
            No internet connection detected. Some features may not be available.
          </p>
        </div>

        <div className="space-y-4">
          <button 
            onClick={() => window.location.reload()}
            className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors"
          >
            Try Again
          </button>
          
          <p className="text-sm text-gray-500">
            You can still browse previously visited pages and submit forms when you&rsquo;re back online.
          </p>
        </div>

        <div className="mt-8 text-left bg-white rounded-lg p-4 shadow-sm border">
          <h3 className="font-medium text-gray-900 mb-2">Available offline:</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Browse cached pages</li>
            <li>• Fill out forms (will sync when online)</li>
            <li>• View saved content</li>
          </ul>
        </div>
      </div>
    </div>
  )
}