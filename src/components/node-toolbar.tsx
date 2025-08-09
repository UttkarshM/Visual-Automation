"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { MessageSquare, Play, Target, Globe, GitBranch, Upload, FileType } from "lucide-react"

interface NodeToolbarProps {
  onAddNode: (type: string) => void
}

export function NodeToolbar({ onAddNode }: NodeToolbarProps) {
  const nodeTypes = [
    { type: "input", icon: Play, label: "Input", color: "bg-blue-500" },
    { type: "fileUpload", icon: Upload, label: "File Upload", color: "bg-indigo-500" },
    { type: "prompt", icon: MessageSquare, label: "AI Prompt", color: "bg-purple-500" },
    { type: "api", icon: Globe, label: "API Call", color: "bg-green-500" },
    { type: "logic", icon: GitBranch, label: "If/Else", color: "bg-orange-500" },
    { type: "output", icon: Target, label: "Output", color: "bg-red-500" },
  ]

  return (
    <Card className="absolute top-4 left-4 p-2 bg-white shadow-lg">
      <div className="flex flex-col space-y-2">
        <div className="text-sm font-medium text-gray-700 px-2">Add Nodes</div>
        {nodeTypes.map(({ type, icon: Icon, label, color }) => (
          <Button
            key={type}
            variant="ghost"
            size="sm"
            onClick={() => onAddNode(type)}
            className="justify-start h-8 px-2"
          >
            <div className={`w-3 h-3 rounded-full ${color} mr-2`} />
            <Icon className="w-4 h-4 mr-2" />
            {label}
          </Button>
        ))}
      </div>
    </Card>
  )
}
