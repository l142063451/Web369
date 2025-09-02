'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { 
  Upload, 
  Image as ImageIcon, 
  File, 
  Search,
  Trash2,
  Eye,
  Download,
  Shield,
  ShieldCheck,
  Clock
} from 'lucide-react'

interface MediaFile {
  id: string
  url: string
  alt: string | null
  caption: string | null
  meta: {
    filename: string
    fileSize: number
    mimeType: string
    dimensions?: {
      width: number
      height: number
    }
    exif?: any
  }
  scannedAt: string | null
  isPublic: boolean
  createdAt: string
  createdByUser: {
    name: string
    email: string
  }
}

export function MediaLibraryView() {
  const [files, setFiles] = useState<MediaFile[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedFile, setSelectedFile] = useState<MediaFile | null>(null)

  useEffect(() => {
    fetchFiles()
  }, [])

  const fetchFiles = async () => {
    try {
      const response = await fetch('/api/admin/media')
      if (response.ok) {
        const data = await response.json()
        setFiles(data.files)
      }
    } catch (error) {
      console.error('Failed to fetch files:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)
    
    try {
      // Get presigned URL
      const uploadResponse = await fetch('/api/admin/media/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
          size: file.size,
        }),
      })

      if (!uploadResponse.ok) {
        throw new Error('Failed to get upload URL')
      }

      const { uploadUrl, fileUrl, fileId } = await uploadResponse.json()

      // Upload file to S3
      const s3Response = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      })

      if (!s3Response.ok) {
        throw new Error('Failed to upload file')
      }

      // Confirm upload and trigger scan
      await fetch(`/api/admin/media/${fileId}/confirm`, {
        method: 'POST',
      })

      await fetchFiles()
      event.target.value = '' // Reset input
    } catch (error) {
      console.error('Upload failed:', error)
      alert('Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const deleteFile = async (fileId: string) => {
    if (!confirm('Are you sure you want to delete this file?')) return

    try {
      const response = await fetch(`/api/admin/media/${fileId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await fetchFiles()
        if (selectedFile?.id === fileId) {
          setSelectedFile(null)
        }
      }
    } catch (error) {
      console.error('Failed to delete file:', error)
    }
  }

  const updateFileMetadata = async (fileId: string, updates: Partial<Pick<MediaFile, 'alt' | 'caption'>>) => {
    try {
      const response = await fetch(`/api/admin/media/${fileId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      if (response.ok) {
        await fetchFiles()
        if (selectedFile?.id === fileId) {
          setSelectedFile({ ...selectedFile, ...updates })
        }
      }
    } catch (error) {
      console.error('Failed to update file metadata:', error)
    }
  }

  const filteredFiles = files.filter(file =>
    file.meta.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
    file.alt?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    file.caption?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) {
      return ImageIcon
    }
    return File
  }

  const getScanStatus = (file: MediaFile) => {
    if (!file.scannedAt) {
      return { icon: Clock, text: 'Scanning...', color: 'text-yellow-600' }
    }
    if (file.isPublic) {
      return { icon: ShieldCheck, text: 'Safe', color: 'text-green-600' }
    }
    return { icon: Shield, text: 'Quarantined', color: 'text-red-600' }
  }

  if (loading) {
    return <LoadingSpinner />
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
        <div className="flex-1 max-w-lg relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search media files..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-3">
          <input
            type="file"
            id="file-upload"
            className="hidden"
            accept="image/*,application/pdf,.doc,.docx"
            onChange={handleFileUpload}
            disabled={uploading}
          />
          <label htmlFor="file-upload">
            <Button asChild className="flex items-center gap-2" disabled={uploading}>
              <span>
                <Upload className="h-4 w-4" />
                {uploading ? 'Uploading...' : 'Upload File'}
              </span>
            </Button>
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Files Grid */}
        <div className="lg:col-span-2">
          {filteredFiles.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No files found</h3>
                <p className="text-gray-500 mb-4">
                  {searchTerm ? 'No files match your search criteria.' : 'Upload your first file to get started.'}
                </p>
                {!searchTerm && (
                  <label htmlFor="file-upload">
                    <Button asChild className="flex items-center gap-2">
                      <span>
                        <Upload className="h-4 w-4" />
                        Upload First File
                      </span>
                    </Button>
                  </label>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredFiles.map((file) => {
                const FileIcon = getFileIcon(file.meta.mimeType)
                const scanStatus = getScanStatus(file)
                const StatusIcon = scanStatus.icon

                return (
                  <Card 
                    key={file.id} 
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedFile?.id === file.id ? 'ring-2 ring-blue-500' : ''
                    }`}
                    onClick={() => setSelectedFile(file)}
                  >
                    <CardContent className="p-4">
                      <div className="aspect-square bg-gray-100 rounded-lg mb-3 flex items-center justify-center overflow-hidden">
                        {file.meta.mimeType.startsWith('image/') ? (
                          <img
                            src={file.url}
                            alt={file.alt || file.meta.filename}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <FileIcon className="h-12 w-12 text-gray-400" />
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-start justify-between">
                          <h3 className="text-sm font-medium truncate flex-1">
                            {file.alt || file.meta.filename}
                          </h3>
                          <StatusIcon className={`h-4 w-4 ml-2 flex-shrink-0 ${scanStatus.color}`} />
                        </div>
                        
                        <p className="text-xs text-gray-500">
                          {formatFileSize(file.meta.fileSize)}
                        </p>
                        
                        <div className="flex items-center justify-between">
                          <Badge variant="secondary" className="text-xs">
                            {scanStatus.text}
                          </Badge>
                          
                          <div className="flex items-center gap-1">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                window.open(file.url, '_blank')
                              }}
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                deleteFile(file.id)
                              }}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>

        {/* File Details Panel */}
        <div className="lg:col-span-1">
          {selectedFile ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">File Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                  {selectedFile.meta.mimeType.startsWith('image/') ? (
                    <img
                      src={selectedFile.url}
                      alt={selectedFile.alt || selectedFile.meta.filename}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <File className="h-16 w-16 text-gray-400" />
                  )}
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Alt Text
                    </label>
                    <Input
                      value={selectedFile.alt || ''}
                      onChange={(e) => updateFileMetadata(selectedFile.id, { alt: e.target.value })}
                      placeholder="Descriptive text for accessibility..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Caption
                    </label>
                    <Input
                      value={selectedFile.caption || ''}
                      onChange={(e) => updateFileMetadata(selectedFile.id, { caption: e.target.value })}
                      placeholder="Optional caption..."
                    />
                  </div>

                  <div className="text-sm text-gray-600 space-y-1">
                    <p><strong>Filename:</strong> {selectedFile.meta.filename}</p>
                    <p><strong>Size:</strong> {formatFileSize(selectedFile.meta.fileSize)}</p>
                    <p><strong>Type:</strong> {selectedFile.meta.mimeType}</p>
                    {selectedFile.meta.dimensions && (
                      <p><strong>Dimensions:</strong> {selectedFile.meta.dimensions.width} × {selectedFile.meta.dimensions.height}</p>
                    )}
                    <p><strong>Uploaded:</strong> {new Date(selectedFile.createdAt).toLocaleDateString()}</p>
                    <p><strong>By:</strong> {selectedFile.createdByUser.name}</p>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => window.open(selectedFile.url, '_blank')}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => {
                        const link = document.createElement('a')
                        link.href = selectedFile.url
                        link.download = selectedFile.meta.filename
                        document.body.appendChild(link)
                        link.click()
                        document.body.removeChild(link)
                      }}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No file selected</h3>
                <p className="text-gray-500">
                  Click on a file to view its details and metadata.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}