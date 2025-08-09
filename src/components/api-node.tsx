"use client"

import { Handle, Position } from "reactflow"
import { Card } from "@/components/ui/card"
import { Globe } from "lucide-react"

interface ApiNodeData {
  config?: {
    name?: string
    url?: string
    method?: string
    headers?: Record<string, string>
  }
}

interface ApiNodeProps {
  data: ApiNodeData
  selected?: boolean
}

export function ApiNode({ data, selected }: ApiNodeProps) {
  return (
    <Card className={`p-3 min-w-[180px] ${selected ? "ring-2 ring-blue-500" : ""}`}>
      <div className="flex items-center space-x-2">
        <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
          <Globe className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1">
          <div className="font-medium text-sm">{data.config?.name || "API Call"}</div>
          <div className="text-xs text-gray-500">{data.config?.method || "GET"} Request</div>
        </div>
      </div>
      {data.config?.url && (
        <div className="mt-2 text-xs text-gray-600 bg-gray-50 p-2 rounded truncate">{data.config.url}</div>
      )}
      <Handle type="target" position={Position.Left} className="w-3 h-3" />
      <Handle type="source" position={Position.Right} className="w-3 h-3" />
    </Card>
  )
}
