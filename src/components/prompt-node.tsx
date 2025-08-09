"use client"

import { Handle, Position } from "reactflow"
import { Card } from "@/components/ui/card"
import { MessageSquare } from "lucide-react"

interface PromptNodeData {
  config?: {
    name?: string
    prompt?: string
    model?: string
  }
}

interface PromptNodeProps {
  data: PromptNodeData
  selected?: boolean
}

export function PromptNode({ data, selected }: PromptNodeProps) {
  return (
    <Card className={`p-3 min-w-[180px] ${selected ? "ring-2 ring-blue-500" : ""}`}>
      <div className="flex items-center space-x-2">
        <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
          <MessageSquare className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1">
          <div className="font-medium text-sm">{data.config?.name || "AI Prompt"}</div>
          <div className="text-xs text-gray-500">{data.config?.model || "gemini-1.5-flash"}</div>
        </div>
      </div>
      {data.config?.prompt && (
        <div className="mt-2 text-xs text-gray-600 bg-gray-50 p-2 rounded truncate">
          {data.config.prompt.substring(0, 50)}...
        </div>
      )}
      <Handle type="target" position={Position.Left} className="w-3 h-3" />
      <Handle type="source" position={Position.Right} className="w-3 h-3" />
    </Card>
  )
}
