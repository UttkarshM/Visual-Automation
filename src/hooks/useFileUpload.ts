import { useState, useCallback } from 'react'

export interface UploadProgress {
  fileName: string
  progress: number
  status: 'pending' | 'uploading' | 'success' | 'error'
  error?: string
}

export interface FileUploadResult {
  success: boolean
  fileName: string
  filePath?: string
  fileSize: number
  mimeType: string
  error?: string
  processedText?: string
}

export interface FileUploadResponse {
  success: boolean
  files: FileUploadResult[]
  combinedText: string
  totalFiles: number
  successfulUploads: number
}

export interface UseFileUploadOptions {
  maxFileSize?: number
  allowedExtensions?: string[]
  onProgress?: (fileName: string, progress: number) => void
  onSuccess?: (result: FileUploadResponse) => void
  onError?: (error: string) => void
}

export interface UseFileUploadReturn {
  uploadFiles: (files: File[], options?: { extractionMethod?: string; outputFormat?: string }) => Promise<FileUploadResponse | null>
  isUploading: boolean
  progress: Record<string, UploadProgress>
  clearProgress: () => void
  validateFiles: (files: File[]) => string[]
}

const DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024
const DEFAULT_ALLOWED_EXTENSIONS = ['.txt', '.md', '.json', '.csv', '.html', '.pdf', '.doc', '.docx', '.rtf', '.xml', '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp']

export function useFileUpload(options: UseFileUploadOptions = {}): UseFileUploadReturn {
  const {
    maxFileSize = DEFAULT_MAX_FILE_SIZE,
    allowedExtensions = DEFAULT_ALLOWED_EXTENSIONS,
    onProgress,
    onSuccess,
    onError
  } = options

  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState<Record<string, UploadProgress>>({})

  const clearProgress = useCallback(() => {
    setProgress({})
  }, [])

  const validateFiles = useCallback((files: File[]): string[] => {
    const errors: string[] = []

    files.forEach((file, index) => {
      if (file.size > maxFileSize) {
        errors.push(`File ${index + 1} (${file.name}) exceeds maximum size of ${Math.round(maxFileSize / (1024 * 1024))}MB`)
      }

      const extension = '.' + file.name.split('.').pop()?.toLowerCase()
      if (!allowedExtensions.includes(extension)) {
        errors.push(`File ${index + 1} (${file.name}) has unsupported extension: ${extension}`)
      }

      if (file.size === 0) {
        errors.push(`File ${index + 1} (${file.name}) is empty`)
      }
    })

    return errors
  }, [maxFileSize, allowedExtensions])

  const updateProgress = useCallback((fileName: string, updates: Partial<UploadProgress>) => {
    setProgress(prev => ({
      ...prev,
      [fileName]: {
        ...prev[fileName],
        ...updates,
        fileName
      }
    }))
  }, [])

  const uploadFiles = useCallback(async (
    files: File[],
    uploadOptions: { extractionMethod?: string; outputFormat?: string } = {}
  ): Promise<FileUploadResponse | null> => {
    if (files.length === 0) {
      onError?.('No files selected')
      return null
    }

    const validationErrors = validateFiles(files)
    if (validationErrors.length > 0) {
      const errorMessage = validationErrors.join('; ')
      onError?.(errorMessage)
      return null
    }

    setIsUploading(true)

    try {
      files.forEach(file => {
        updateProgress(file.name, {
          fileName: file.name,
          progress: 0,
          status: 'pending'
        })
      })

      const formData = new FormData()
      files.forEach(file => {
        formData.append('files', file)
      })
      
      if (uploadOptions.extractionMethod) {
        formData.append('extractionMethod', uploadOptions.extractionMethod)
      }
      
      if (uploadOptions.outputFormat) {
        formData.append('outputFormat', uploadOptions.outputFormat)
      }

      files.forEach(file => {
        updateProgress(file.name, {
          progress: 10,
          status: 'uploading'
        })
        onProgress?.(file.name, 10)
      })

      const response = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData
      })

      const progressInterval = setInterval(() => {
        files.forEach(file => {
          const currentProgress = progress[file.name]?.progress || 10
          if (currentProgress < 90) {
            const newProgress = Math.min(currentProgress + 20, 90)
            updateProgress(file.name, { progress: newProgress })
            onProgress?.(file.name, newProgress)
          }
        })
      }, 200)

      const result: FileUploadResponse = await response.json()

      clearInterval(progressInterval)

      if (!response.ok || !result.success) {
        files.forEach(file => {
          updateProgress(file.name, {
            progress: 100,
            status: 'error',
            error: result.error || 'Upload failed'
          })
        })
        
        onError?.(result.error || 'Upload failed')
        return null
      }

      result.files.forEach(fileResult => {
        updateProgress(fileResult.fileName, {
          progress: 100,
          status: fileResult.success ? 'success' : 'error',
          error: fileResult.error
        })
        onProgress?.(fileResult.fileName, 100)
      })

      onSuccess?.(result)
      return result

    } catch (error) {
      console.error('Upload error:', error)
      
      files.forEach(file => {
        updateProgress(file.name, {
          progress: 100,
          status: 'error',
          error: error instanceof Error ? error.message : 'Network error'
        })
      })

      const errorMessage = error instanceof Error ? error.message : 'Network error occurred'
      onError?.(errorMessage)
      return null

    } finally {
      setIsUploading(false)
    }
  }, [validateFiles, updateProgress, onProgress, onSuccess, onError, progress])

  return {
    uploadFiles,
    isUploading,
    progress,
    clearProgress,
    validateFiles
  }
}

