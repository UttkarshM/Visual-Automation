"use client"

import { Handle, Position } from "reactflow"
import { Card } from "@/components/ui/card"
import { GitBranch } from "lucide-react"

interface LogicNodeData {
  config?: {
    name?: string
    condition?: string
    trueOutput?: string
    falseOutput?: string
  }
}

interface LogicNodeProps {
  data: LogicNodeData
  selected?: boolean
}

export function LogicNode({ data, selected }: LogicNodeProps) {
  return (
    <Card className={`p-3 min-w-[180px] ${selected ? "ring-2 ring-blue-500" : ""}`}>
      <div className="flex items-center space-x-2">
        <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
          <GitBranch className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1">
          <div className="font-medium text-sm">{data.config?.name || "If/Else"}</div>
          <div className="text-xs text-gray-500">Conditional branching</div>
        </div>
      </div>
      {data.config?.condition && (
        <div className="mt-2 text-xs text-gray-600 bg-gray-50 p-2 rounded truncate">{data.config.condition}</div>
      )}
      
      {/* Input handle */}
      <Handle type="target" position={Position.Left} className="w-3 h-3" />
      
      {/* True path handle */}
      <Handle 
        type="source" 
        position={Position.Right} 
        id="true" 
        className="w-3 h-3 bg-green-500 border-green-600" 
        style={{ top: "30%" }} 
      />
      <div className="absolute right-[-12px] top-[25%] text-[10px] font-medium text-green-600 bg-white px-1 rounded">
        T
      </div>
      
      {/* False path handle */}
      <Handle 
        type="source" 
        position={Position.Right} 
        id="false" 
        className="w-3 h-3 bg-red-500 border-red-600" 
        style={{ top: "70%" }} 
      />
      <div className="absolute right-[-12px] top-[65%] text-[10px] font-medium text-red-600 bg-white px-1 rounded">
        F
      </div>
    </Card>
  )
}
