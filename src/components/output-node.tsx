"use client"

import { Handle, Position } from "reactflow"
import { Card } from "@/components/ui/card"
import { Target, Download, Eye } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"

interface OutputNodeData {
  config?: {
    name?: string
    format?: string
    result?: any
  }
  result?: any
  response?: string
}

interface OutputNodeProps {
  data: OutputNodeData
  selected?: boolean
}

export function OutputNode({ data, selected }: OutputNodeProps) {
  const [showPreview, setShowPreview] = useState(false)
  
  // Debug logging
  console.log('[OutputNode] Received data:', data)
  console.log('[OutputNode] data.result:', data.result)
  console.log('[OutputNode] data.config?.result:', data.config?.result)
  
  // Get result from data.result (from execution) or data.config?.result (fallback)
  const result = data.result || data.config?.result
  const format = data.config?.format || 'json'
  
  const hasResult = result && typeof result === 'object'
  const resultPreview = hasResult ? 
    (result.data || result.final_output || result.response || JSON.stringify(result)).toString().substring(0, 100) + '...' :
    'No data'
  
  const downloadResult = () => {
    if (!result) return
    
    const blob = new Blob([JSON.stringify(result, null, 2)], { 
      type: 'application/json' 
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `output_${data.config?.name || 'result'}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }
  
  return (
    <Card className={`p-3 min-w-[200px] max-w-[300px] ${selected ? "ring-2 ring-blue-500" : ""}`}>
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
            <Target className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1">
            <div className="font-medium text-sm">{data.config?.name || "Output"}</div>
            <div className="text-xs text-gray-500">Format: {format}</div>
          </div>
        </div>
        
        {/* Result Status */}
        <div className="space-y-1">
          {hasResult ? (
            <>
              <div className="text-xs text-green-600 flex items-center space-x-1">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                <span>Result stored</span>
              </div>
              
              {/* Result Preview */}
              <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded border">
                <div className="font-medium mb-1">Preview:</div>
                <div className="font-mono text-xs truncate">{resultPreview}</div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex space-x-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 px-2 text-xs"
                  onClick={() => setShowPreview(!showPreview)}
                >
                  <Eye className="w-3 h-3 mr-1" />
                  {showPreview ? 'Hide' : 'View'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 px-2 text-xs"
                  onClick={downloadResult}
                >
                  <Download className="w-3 h-3 mr-1" />
                  Save
                </Button>
              </div>
              
              {/* Expanded Preview */}
              {showPreview && (
                <div className="text-xs bg-gray-100 p-2 rounded border max-h-32 overflow-auto">
                  <pre className="whitespace-pre-wrap font-mono">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </div>
              )}
            </>
          ) : (
            <div className="text-xs text-orange-600 flex items-center space-x-1">
              <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
              <span>Awaiting execution</span>
            </div>
          )}
        </div>
      </div>

      <Handle type="target" position={Position.Left} className="w-3 h-3" />
    </Card>
  )
}
