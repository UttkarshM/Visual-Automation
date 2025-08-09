"use client"

import { Handle, Position } from "reactflow"
import { Card } from "@/components/ui/card"
import { FileType } from "lucide-react"

interface FileToTextNodeData {
  config?: {
    name?: string
    outputFormat?: string
    extractionMethod?: string
    textContent?: string
  }
}

interface FileToTextNodeProps {
  data: FileToTextNodeData
  selected?: boolean
}

export function FileToTextNode({ data, selected }: FileToTextNodeProps) {
  const hasTextContent = !!data.config?.textContent
  
  return (
    <Card className={`p-3 min-w-[180px] ${selected ? "ring-2 ring-blue-500" : ""}`}>
      <div className="flex items-center space-x-2">
        <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
          <FileType className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1">
          <div className="font-medium text-sm">{data.config?.name || "File to Text"}</div>
          <div className="text-xs text-gray-500">Text extraction</div>
          {hasTextContent && (
            <div className="text-xs text-green-600 mt-1">✓ Text extracted</div>
          )}
        </div>
      </div>
      <Handle type="target" position={Position.Left} className="w-3 h-3" />
      <Handle type="source" position={Position.Right} className="w-3 h-3" />
    </Card>
  )
}

