"use client"

import { Handle, Position } from "reactflow"
import { Card } from "@/components/ui/card"
import { Upload } from "lucide-react"

interface DataEntryNodeData {
  config?: {
    name?: string
    acceptedFiles?: string
    maxFileSize?: number
    uploadedFiles?: FileList | null
  }
}

interface DataEntryNodeProps {
  data: DataEntryNodeData
  selected?: boolean
}

export function DataEntryNode({ data, selected }: DataEntryNodeProps) {
  const fileCount = data.config?.uploadedFiles?.length || 0
  
  return (
    <Card className={`p-3 min-w-[180px] ${selected ? "ring-2 ring-blue-500" : ""}`}>
      <div className="flex items-center space-x-2">
        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
          <Upload className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1">
          <div className="font-medium text-sm">{data.config?.name || "File Upload"}</div>
          <div className="text-xs text-gray-500">Data entry</div>
          {fileCount > 0 && (
            <div className="text-xs text-green-600 mt-1">✓ {fileCount} file(s) uploaded</div>
          )}
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="w-3 h-3" />
    </Card>
  )
}

