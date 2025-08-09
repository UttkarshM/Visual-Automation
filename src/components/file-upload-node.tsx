"use client"

import { useState, useCallback } from "react"
import { Handle, Position } from "reactflow"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Upload, FileText, CheckCircle, AlertCircle } from "lucide-react"
import { useAppDispatch } from "@/store/hooks"
import { updateNode } from "@/store/nodesSlice"
import { FileUpload } from "@/components/file-upload"
import type { FileUploadResponse } from "@/hooks/useFileUpload"

interface FileUploadNodeData {
  id: string
  config?: {
    name?: string
    files?: string[]
    extractionMethod?: string
    outputFormat?: string
    processedText?: string
    uploadStatus?: 'idle' | 'uploading' | 'success' | 'error'
    error?: string
    data?: unknown
  }
}

interface FileUploadNodeProps {
  data: FileUploadNodeData
  selected?: boolean
}

export function FileUploadNode({ data, selected }: FileUploadNodeProps) {
  const dispatch = useAppDispatch()
  const [showUpload, setShowUpload] = useState(false)
  
  const hasFiles = data.config?.files && data.config.files.length > 0
  const hasProcessedText = data.config?.processedText && data.config.processedText.trim().length > 0
  const uploadStatus = data.config?.uploadStatus || 'idle'
  
  const updateConfig = useCallback((updates: Partial<FileUploadNodeData['config']>) => {
    dispatch(updateNode({
      nodeId: data.id,
      config: {
        ...data.config,
        ...updates
      }
    }))
  }, [dispatch, data.id, data.config])

  const handleUploadComplete = useCallback((result: FileUploadResponse) => {
    if (result.success) {
      updateConfig({
        files: result.files.map(f => f.fileName),
        processedText: result.combinedText,
        data: result.combinedText,
        uploadStatus: 'success',
        error: undefined
      })
      setShowUpload(false)
    }
  }, [updateConfig])

  const handleUploadError = useCallback((error: string) => {
    updateConfig({
      uploadStatus: 'error',
      error
    })
  }, [updateConfig])

  const getStatusIcon = () => {
    switch (uploadStatus) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />
      case 'uploading':
        return <Upload className="w-4 h-4 text-blue-500 animate-pulse" />
      default:
        return <Upload className="w-4 h-4 text-gray-400" />
    }
  }

  const getStatusColor = () => {
    switch (uploadStatus) {
      case 'success':
        return 'bg-green-500'
      case 'error':
        return 'bg-red-500'
      case 'uploading':
        return 'bg-blue-500'
      default:
        return 'bg-indigo-500'
    }
  }

  return (
    <Card className={`p-3 min-w-[280px] max-w-[350px] ${selected ? "ring-2 ring-blue-500" : ""}`}>
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center space-x-2">
          <div className={`w-8 h-8 ${getStatusColor()} rounded-full flex items-center justify-center`}>
            {getStatusIcon()}
          </div>
          <div className="flex-1">
            <div className="font-medium text-sm">{data.config?.name || "File Upload"}</div>
            <div className="text-xs text-gray-500">
              {hasFiles ? `${data.config?.files?.length} file(s) processed` : "Upload files"}
            </div>
            {uploadStatus === 'success' && hasProcessedText && (
              <div className="text-xs text-green-600 mt-1">✓ Text extracted</div>
            )}
            {uploadStatus === 'error' && (
              <div className="text-xs text-red-600 mt-1">⚠ Upload failed</div>
            )}
          </div>
        </div>

        {/* Upload Area or File List */}
        {!hasFiles || showUpload ? (
          <div className="space-y-2">
            <FileUpload
              maxFiles={10}
              extractionMethod={data.config?.extractionMethod || 'auto'}
              outputFormat={data.config?.outputFormat || 'text'}
              onUploadComplete={handleUploadComplete}
              onError={handleUploadError}
              className="scale-90 origin-top"
            />
          </div>
        ) : (
          <div className="space-y-2">
            {/* File Summary */}
            <div className="bg-gray-50 p-2 rounded border">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">
                    {data.config?.files?.length} files uploaded
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowUpload(true)}
                  className="h-6 px-2 text-xs"
                >
                  Change
                </Button>
              </div>
              
              {data.config?.files && (
                <div className="mt-2 space-y-1">
                  {data.config.files.slice(0, 3).map((fileName, index) => (
                    <div key={index} className="text-xs text-gray-600 truncate">
                      • {fileName}
                    </div>
                  ))}
                  {data.config.files.length > 3 && (
                    <div className="text-xs text-gray-500">
                      ... and {data.config.files.length - 3} more
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Text Preview */}
            {hasProcessedText && (
              <div className="space-y-1">
                <Label className="text-xs font-medium">Extracted Text Preview</Label>
                <div className="max-h-16 overflow-y-auto bg-gray-50 p-2 rounded text-xs text-gray-700 border">
                  {data.config?.processedText?.slice(0, 150)}
                  {data.config?.processedText && data.config.processedText.length > 150 && '...'}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Error Message */}
        {uploadStatus === 'error' && data.config?.error && (
          <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
            {data.config.error}
          </div>
        )}
      </div>
      
      {/* Handles */}
      <Handle type="source" position={Position.Right} className="w-3 h-3" />
    </Card>
  )
}

