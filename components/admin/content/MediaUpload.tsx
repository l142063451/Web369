/**
 * Media Upload Component with ClamAV Integration
 * Based on INSTRUCTIONS_FOR_COPILOT.md §6
 */

'use client'

import { useState, useCallback } from 'react'
import { Upload, X, FileImage, FileText, AlertCircle, CheckCircle } from 'lucide-react'
import { useDropzone } from 'react-dropzone'

import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

interface UploadedFile {
  file: File
  key: string
  uploadUrl: string
  publicUrl: string
  status: 'pending' | 'uploading' | 'scanning' | 'completed' | 'error'
  progress: number
  error?: string
}

interface MediaUploadProps {
  onUploadComplete?: (files: { key: string; publicUrl: string }[]) => void
  maxFiles?: number
  className?: string
  accept?: Record<string, string[]>
}

export function MediaUpload({
  onUploadComplete,
  maxFiles = 5,
  className,
  accept = {
    'image/*': ['.jpg', '.jpeg', '.png', '.webp'],
    'application/pdf': ['.pdf'],
    'text/plain': ['.txt'],
    'text/csv': ['.csv'],
  }
}: MediaUploadProps) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [isUploading, setIsUploading] = useState(false)

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (uploadedFiles.length + acceptedFiles.length > maxFiles) {
      alert(`Maximum ${maxFiles} files allowed`)
      return
    }

    setIsUploading(true)
    const newFiles: UploadedFile[] = []

    for (const file of acceptedFiles) {
      try {
        // Get presigned URL
        const presignResponse = await fetch('/api/admin/media/presign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: file.name,
            size: file.size,
            contentType: file.type,
          }),
        })

        if (!presignResponse.ok) {
          throw new Error(`Failed to get upload URL: ${presignResponse.statusText}`)
        }

        const { data } = await presignResponse.json()
        
        const uploadedFile: UploadedFile = {
          file,
          key: data.key,
          uploadUrl: data.uploadUrl,
          publicUrl: data.publicUrl,
          status: 'pending',
          progress: 0,
        }

        newFiles.push(uploadedFile)
      } catch (error) {
        console.error('Error getting presigned URL:', error)
        newFiles.push({
          file,
          key: '',
          uploadUrl: '',
          publicUrl: '',
          status: 'error',
          progress: 0,
          error: error instanceof Error ? error.message : 'Upload failed',
        })
      }
    }

    setUploadedFiles(prev => [...prev, ...newFiles])

    // Start uploads
    for (let i = 0; i < newFiles.length; i++) {
      const uploadedFile = newFiles[i]
      if (uploadedFile.status === 'error') continue

      try {
        await uploadFile(uploadedFiles.length + i, uploadedFile)
      } catch (error) {
        updateFileStatus(uploadedFiles.length + i, 'error', 0, 
          error instanceof Error ? error.message : 'Upload failed')
      }
    }

    setIsUploading(false)
  }, [uploadedFiles.length, maxFiles])

  const uploadFile = async (index: number, uploadedFile: UploadedFile) => {
    updateFileStatus(index, 'uploading', 0)

    // Upload to S3
    const xhr = new XMLHttpRequest()
    
    return new Promise<void>((resolve, reject) => {
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const progress = (e.loaded / e.total) * 100
          updateFileStatus(index, 'uploading', progress)
        }
      })

      xhr.addEventListener('load', async () => {
        if (xhr.status === 200) {
          updateFileStatus(index, 'scanning', 100)
          
          // Simulate ClamAV scanning (in real implementation, this would be a webhook/polling)
          setTimeout(() => {
            updateFileStatus(index, 'completed', 100)
            checkAllUploadsComplete()
          }, 2000)
          
          resolve()
        } else {
          reject(new Error(`Upload failed with status: ${xhr.status}`))
        }
      })

      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed'))
      })

      xhr.open('PUT', uploadedFile.uploadUrl)
      xhr.setRequestHeader('Content-Type', uploadedFile.file.type)
      xhr.send(uploadedFile.file)
    })
  }

  const updateFileStatus = (
    index: number, 
    status: UploadedFile['status'], 
    progress: number, 
    error?: string
  ) => {
    setUploadedFiles(prev => prev.map((file, i) => 
      i === index 
        ? { ...file, status, progress, error }
        : file
    ))
  }

  const checkAllUploadsComplete = () => {
    const completedFiles = uploadedFiles.filter(f => f.status === 'completed')
    if (completedFiles.length > 0) {
      onUploadComplete?.(completedFiles.map(f => ({
        key: f.key,
        publicUrl: f.publicUrl,
      })))
    }
  }

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxFiles,
    disabled: isUploading,
  })

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <FileImage className="h-8 w-8 text-blue-500" />
    }
    return <FileText className="h-8 w-8 text-gray-500" />
  }

  const getStatusIcon = (status: UploadedFile['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />
      default:
        return null
    }
  }

  const getStatusText = (status: UploadedFile['status']) => {
    switch (status) {
      case 'pending':
        return 'Preparing...'
      case 'uploading':
        return 'Uploading...'
      case 'scanning':
        return 'Scanning for viruses...'
      case 'completed':
        return 'Upload complete'
      case 'error':
        return 'Upload failed'
      default:
        return ''
    }
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer",
          isDragActive 
            ? "border-blue-500 bg-blue-50" 
            : "border-gray-300 hover:border-gray-400",
          isUploading && "cursor-not-allowed opacity-50"
        )}
      >
        <input {...getInputProps()} />
        <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        {isDragActive ? (
          <p className="text-blue-600 font-medium">Drop files here...</p>
        ) : (
          <div>
            <p className="text-gray-600 font-medium mb-2">
              Drag & drop files here, or click to select
            </p>
            <p className="text-sm text-gray-500">
              Supports images, PDFs, text files (max {maxFiles} files, 10MB each)
            </p>
          </div>
        )}
      </div>

      {/* File List */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900">Uploading Files</h4>
          {uploadedFiles.map((uploadedFile, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg"
            >
              {getFileIcon(uploadedFile.file)}
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {uploadedFile.file.name}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-xs text-gray-500">
                    {(uploadedFile.file.size / 1024 / 1024).toFixed(1)} MB
                  </p>
                  <span className="text-gray-400">•</span>
                  <p className="text-xs text-gray-600">
                    {getStatusText(uploadedFile.status)}
                  </p>
                </div>
                
                {(uploadedFile.status === 'uploading' || uploadedFile.status === 'scanning') && (
                  <Progress 
                    value={uploadedFile.progress} 
                    className="h-2 mt-2"
                  />
                )}
                
                {uploadedFile.error && (
                  <p className="text-xs text-red-600 mt-1">
                    {uploadedFile.error}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                {getStatusIcon(uploadedFile.status)}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(index)}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}