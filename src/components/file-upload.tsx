"use client"

import React, { useRef, useState, useCallback, DragEvent } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Upload, X, File, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { useFileUpload, type FileUploadResponse, type UploadProgress } from '@/hooks/useFileUpload'

interface FileUploadProps {
  onUploadComplete?: (result: FileUploadResponse) => void
  onError?: (error: string) => void
  maxFiles?: number
  extractionMethod?: string
  outputFormat?: string
  className?: string
}

export function FileUpload({
  onUploadComplete,
  onError,
  maxFiles = 10,
  extractionMethod = 'auto',
  outputFormat = 'text',
  className = ''
}: FileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const [currentExtractionMethod, setCurrentExtractionMethod] = useState(extractionMethod)
  const [currentOutputFormat, setCurrentOutputFormat] = useState(outputFormat)

  const { uploadFiles, isUploading, progress, clearProgress, validateFiles } = useFileUpload({
    onSuccess: (result) => {
      onUploadComplete?.(result)
      setSelectedFiles([])
      clearProgress()
    },
    onError: (error) => {
      onError?.(error)
    }
  })

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files) return

    const fileArray = Array.from(files)
    const totalFiles = selectedFiles.length + fileArray.length

    if (totalFiles > maxFiles) {
      onError?.(`Cannot upload more than ${maxFiles} files at once`)
      return
    }

    // Validate the new files
    const validationErrors = validateFiles(fileArray)
    if (validationErrors.length > 0) {
      onError?.(validationErrors.join('; '))
      return
    }

    setSelectedFiles(prev => [...prev, ...fileArray])
  }, [selectedFiles, maxFiles, validateFiles, onError])

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragOver(false)
    handleFileSelect(e.dataTransfer.files)
  }, [handleFileSelect])

  const handleFileInputClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleRemoveFile = useCallback((index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
  }, [])

  const handleUpload = useCallback(async () => {
    if (selectedFiles.length === 0) {
      onError?.('Please select files to upload')
      return
    }

    await uploadFiles(selectedFiles, {
      extractionMethod: currentExtractionMethod,
      outputFormat: currentOutputFormat
    })
  }, [selectedFiles, currentExtractionMethod, currentOutputFormat, uploadFiles, onError])

  const getProgressColor = (status: UploadProgress['status']) => {
    switch (status) {
      case 'success': return 'bg-green-500'
      case 'error': return 'bg-red-500'
      case 'uploading': return 'bg-blue-500'
      default: return 'bg-gray-300'
    }
  }

  const getStatusIcon = (status: UploadProgress['status']) => {
    switch (status) {
      case 'success': return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'error': return <AlertCircle className="w-4 h-4 text-red-500" />
      case 'uploading': return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
      default: return <File className="w-4 h-4 text-gray-500" />
    }
  }

  return (
    <Card className={`p-4 ${className}`}>
      <div className="space-y-4">
        {/* Upload Area */}
        <div
          className={`
            border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer
            ${isDragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
            ${isUploading ? 'pointer-events-none opacity-50' : ''}
          `}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleFileInputClick}
        >
          <div className="flex flex-col items-center space-y-2">
            <Upload className="w-8 h-8 text-gray-400" />
            <div className="text-sm text-gray-600">
              {isDragOver ? (
                <span className="text-blue-600">Drop files here...</span>
              ) : (
                <>
                  <span className="font-medium">Click to upload</span> or drag and drop
                </>
              )}
            </div>
            <div className="text-xs text-gray-500">
              Supports: TXT, MD, JSON, CSV, HTML, PDF, DOC, DOCX, RTF, XML, Images
            </div>
            <div className="text-xs text-gray-500">
              Max {maxFiles} files, up to 10MB each
            </div>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".txt,.md,.json,.csv,.html,.pdf,.doc,.docx,.rtf,.xml,.jpg,.jpeg,.png,.gif,.bmp,.webp"
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
        />

        {/* Processing Options */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-sm font-medium">Extraction Method</Label>
            <Select value={currentExtractionMethod} onValueChange={setCurrentExtractionMethod}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto Detect</SelectItem>
                <SelectItem value="plain">Plain Text</SelectItem>
                <SelectItem value="markdown">Markdown</SelectItem>
                <SelectItem value="json">JSON</SelectItem>
                <SelectItem value="csv">CSV</SelectItem>
                <SelectItem value="html">HTML</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm font-medium">Output Format</Label>
            <Select value={currentOutputFormat} onValueChange={setCurrentOutputFormat}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Plain Text</SelectItem>
                <SelectItem value="summary">Summary</SelectItem>
                <SelectItem value="structured">Structured JSON</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Selected Files */}
        {selectedFiles.length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Selected Files ({selectedFiles.length})</Label>
            <div className="max-h-48 overflow-y-auto space-y-2">
              {selectedFiles.map((file, index) => {
                const fileProgress = progress[file.name]
                return (
                  <div key={`${file.name}-${index}`} className="flex items-center space-x-3 p-2 bg-gray-50 rounded">
                    {getStatusIcon(fileProgress?.status || 'pending')}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{file.name}</div>
                      <div className="text-xs text-gray-500">
                        {(file.size / 1024).toFixed(1)} KB
                      </div>
                      {fileProgress && (
                        <div className="mt-1">
                          <div className="w-full bg-gray-200 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full transition-all duration-300 ${getProgressColor(fileProgress.status)}`}
                              style={{ width: `${fileProgress.progress}%` }}
                            />
                          </div>
                          {fileProgress.error && (
                            <div className="text-xs text-red-500 mt-1">{fileProgress.error}</div>
                          )}
                        </div>
                      )}
                    </div>
                    {!isUploading && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRemoveFile(index)
                        }}
                        className="h-6 w-6 p-0 text-gray-500 hover:text-red-500"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Upload Button */}
        {selectedFiles.length > 0 && (
          <Button
            onClick={handleUpload}
            disabled={isUploading}
            className="w-full"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Upload {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''}
              </>
            )}
          </Button>
        )}
      </div>
    </Card>
  )
}

