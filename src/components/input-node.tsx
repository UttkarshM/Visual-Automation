"use client"

import { useState, useRef, useCallback } from "react"
import { Handle, Position } from "reactflow"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Play, Upload, FileText, X } from "lucide-react"
// File processing is now handled by the FileUpload component or dedicated file upload nodes
import { useAppDispatch } from "@/store/hooks"
import { updateNode } from "@/store/nodesSlice"
import { FileUpload } from "@/components/file-upload"
import type { FileUploadResponse } from "@/hooks/useFileUpload"

import type { WorkflowNodeData, InputNodeConfig } from '@/types/workflow'

interface InputNodeProps {
  data: WorkflowNodeData
  selected?: boolean
}

export function InputNode({ data, selected }: InputNodeProps) {
  const dispatch = useAppDispatch()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  
  // Cast the config to InputNodeConfig for proper typing
  const config = data.config as InputNodeConfig
  
  const inputType = config.inputType || 'text'
  const hasTextValue = config.textValue && config.textValue.trim().length > 0
  const hasFiles = config.files && config.files.length > 0
  const hasProcessedText = config.processedText && config.processedText.trim().length > 0
  const hasData = hasTextValue || hasProcessedText
  
  const updateConfig = useCallback((updates: Partial<InputNodeConfig>) => {
    dispatch(updateNode({
      nodeId: data.id!,
      config: {
        ...config,
        ...updates
      } as InputNodeConfig
    }))
  }, [dispatch, data.id, config])

  const handleInputTypeChange = useCallback((newType: string) => {
    const typedNewType = newType as 'text' | 'file'
    
    // Clear all previous data when switching input types
    updateConfig({ 
      inputType: typedNewType,
      textValue: '',
      files: [],
      processedText: '',
      data: undefined,
      extractionMethod: 'auto',
      outputFormat: 'text'
    })
    
    // Clear file input if switching away from file type
    if (typedNewType === 'text' && fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [updateConfig])

  const handleTextChange = useCallback((value: string) => {
    updateConfig({ 
      textValue: value,
      data: value
    })
  }, [updateConfig])

  const handleFileUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return
    
    const fileArray = Array.from(files)
    setIsProcessing(true)
    
    try {
      // For now, just store the file names as text. Real file processing
      // should be done through the FileUpload component or API
      const fileNames = fileArray.map(f => f.name).join(', ')
      const fileInfo = `Files selected: ${fileNames} (${fileArray.length} files)`
      
      updateConfig({
        files: fileArray,
        processedText: fileInfo,
        data: fileInfo
      })
    } catch (error) {
      console.error('Error handling files:', error)
      updateConfig({
        files: fileArray,
        processedText: 'Error handling files',
        data: undefined
      })
    } finally {
      setIsProcessing(false)
    }
  }, [updateConfig])

  const handleFileInputClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleRemoveFiles = useCallback(() => {
    updateConfig({
      files: [],
      processedText: '',
      data: undefined
    })
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [updateConfig])

  const handleExtractionMethodChange = useCallback(async (method: string) => {
    updateConfig({ extractionMethod: method })
  }, [updateConfig])

  const handleOutputFormatChange = useCallback((format: string) => {
    updateConfig({ outputFormat: format })
    
    if (config.files && config.files.length > 0) {
      updateConfig({ outputFormat: format })
    }
  }, [updateConfig, config.files])

  const handleFileUploadComplete = useCallback((result: FileUploadResponse) => {
    if (result.success) {
      const fileNames = result.files.map(f => f.fileName)
      
      updateConfig({
        processedText: result.combinedText,
        data: result.combinedText,
        files: fileNames as any,
      })
    }
  }, [updateConfig])
  
  return (
    <Card className={`p-3 min-w-[250px] max-w-[350px] ${selected ? "ring-2 ring-blue-500" : ""}`}>
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
            <Play className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1">
            <div className="font-medium text-sm">{config.name || "Input"}</div>
            <div className="text-xs text-gray-500">
              Start point
            </div>
            {hasData && (
              <div className="text-xs text-green-600 mt-1">✓ Data available</div>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-medium">Input Type</Label>
          <Select value={inputType} onValueChange={handleInputTypeChange}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="text">Text Input</SelectItem>
              <SelectItem value="file">File Upload</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {inputType === 'text' && (
          <div className="space-y-2">
            <Label className="text-xs font-medium">Text Value</Label>
            <Textarea
              placeholder="Enter your text here..."
              value={config.textValue || ''}
              onChange={(e) => handleTextChange(e.target.value)}
              className="min-h-[80px] text-xs resize-none"
            />
          </div>
        )}

        {inputType === 'file' && (
          <div className="space-y-2">
            <Label className="text-xs font-medium">Files</Label>
            <FileUpload
              maxFiles={5}
              extractionMethod={config.extractionMethod || 'auto'}
              outputFormat={config.outputFormat || 'text'}
              onUploadComplete={handleFileUploadComplete}
              onError={(error) => console.error('File upload error:', error)}
              className="scale-90 origin-top"
            />
            
            {hasProcessedText && (
              <div className="space-y-1">
                <Label className="text-xs font-medium">Extracted Text Preview</Label>
                <div className="max-h-20 overflow-y-auto bg-gray-50 p-2 rounded text-xs text-gray-700 border">
                  {config.processedText?.slice(0, 200)}
                  {config.processedText && config.processedText.length > 200 && '...'}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      
      <Handle type="target" position={Position.Left} className="w-3 h-3" />
      <Handle type="source" position={Position.Right} className="w-3 h-3" />
    </Card>
  )
}
