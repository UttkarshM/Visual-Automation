"use client"

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { AlertCircle, CheckCircle, Play, FileText, MessageSquare, Download } from 'lucide-react'
import { WorkflowEditor } from '@/components/workflow-editor'
import { useAppDispatch } from '@/store/hooks'
import { updateAllNodeExecutionResults } from '@/store/nodesSlice'

interface WorkflowExecutionResult {
  success: boolean
  result?: any
  executionId?: string
  error?: string
}

export default function WorkflowWithFilesDemo() {
  const dispatch = useAppDispatch()
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [executionResult, setExecutionResult] = useState<WorkflowExecutionResult | null>(null)
  const [isExecuting, setIsExecuting] = useState(false)
  const [workflowInput, setWorkflowInput] = useState('')

  const executeWorkflow = async () => {
    setIsExecuting(true)
    setExecutionResult(null)

    try {
      // Get current workflow from Redux store
      const response = await fetch('/api/workflows/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workflowId: 'demo-workflow',
          inputData: { input: workflowInput }
        })
      })

      const result = await response.json()
      setExecutionResult(result)
      if (result.success && result.result) {
        dispatch(updateAllNodeExecutionResults(result.result));
      }
    } catch (error) {
      setExecutionResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      })
    } finally {
      setIsExecuting(false)
    }
  }

  const downloadResult = () => {
    if (!executionResult?.result) return
    
    const blob = new Blob([JSON.stringify(executionResult.result, null, 2)], { 
      type: 'application/json' 
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'workflow_result.json'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">File Processing Workflow Demo</h1>
          <p className="text-gray-600 mt-2">
            Create workflows that can upload, process, and analyze files using AI
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Workflow Editor */}
          <div className="xl:col-span-2">
            <Card className="h-[600px]">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="w-5 h-5" />
                  <span>Workflow Builder</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 h-[500px]">
                <WorkflowEditor
                  selectedNode={selectedNodeId}
                  onNodeSelect={setSelectedNodeId}
                />
              </CardContent>
            </Card>
          </div>

          {/* Control Panel */}
          <div className="space-y-6">
            {/* Execution Controls */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Play className="w-5 h-5" />
                  <span>Execute Workflow</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Initial Input (Optional)</Label>
                  <Input
                    value={workflowInput}
                    onChange={(e) => setWorkflowInput(e.target.value)}
                    placeholder="Enter initial workflow input..."
                    className="mt-2"
                  />
                </div>

                <Button
                  onClick={executeWorkflow}
                  disabled={isExecuting}
                  className="w-full"
                >
                  {isExecuting ? (
                    <>
                      <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Executing...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Run Workflow
                    </>
                  )}
                </Button>

                {/* Execution Status */}
                {executionResult && (
                  <div className={`p-3 rounded-md flex items-start space-x-2 ${
                    executionResult.success 
                      ? 'bg-green-50 border border-green-200' 
                      : 'bg-red-50 border border-red-200'
                  }`}>
                    {executionResult.success ? (
                      <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    )}
                    <div className={`text-sm ${executionResult.success ? 'text-green-700' : 'text-red-700'}`}>
                      {executionResult.success 
                        ? `Workflow executed successfully! (ID: ${executionResult.executionId})`
                        : `Execution failed: ${executionResult.error}`
                      }
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Instructions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MessageSquare className="w-5 h-5" />
                  <span>Instructions</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm text-gray-600">
                  <div>
                    <h4 className="font-medium text-gray-900">Quick Start:</h4>
                    <ol className="list-decimal list-inside space-y-1 mt-1">
                      <li>Add a File Upload node</li>
                      <li>Upload and process your files</li>
                      <li>Connect to an AI Prompt node</li>
                      <li>Add an Output node</li>
                      <li>Run the workflow</li>
                    </ol>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-gray-900">Available Nodes:</h4>
                    <ul className="space-y-1 mt-1">
                      <li>• <span className="font-medium">File Upload:</span> Upload and extract text from files</li>
                      <li>• <span className="font-medium">AI Prompt:</span> Process data with AI</li>
                      <li>• <span className="font-medium">API Call:</span> Make HTTP requests</li>
                      <li>• <span className="font-medium">If/Else:</span> Conditional branching</li>
                      <li>• <span className="font-medium">Output:</span> Final result formatting</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900">Supported Files:</h4>
                    <p>PDF, Word docs, text files, images, CSV, JSON, HTML, and more</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Results Section */}
        {executionResult?.result && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Execution Results</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadResult}
                  className="flex items-center space-x-1"
                >
                  <Download className="w-4 h-4" />
                  <span>Download</span>
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Raw Results</Label>
                  <Textarea
                    value={JSON.stringify(executionResult.result, null, 2)}
                    readOnly
                    className="mt-2 min-h-[200px] text-xs font-mono"
                  />
                </div>

                {/* Show individual node results if available */}
                {typeof executionResult.result === 'object' && executionResult.result !== null && (
                  <div className="grid gap-4">
                    {Object.entries(executionResult.result).map(([nodeId, nodeResult]) => (
                      <div key={nodeId} className="border rounded-lg p-3">
                        <h4 className="font-medium text-sm mb-2">Node: {nodeId}</h4>
                        <pre className="text-xs bg-gray-50 p-2 rounded overflow-auto max-h-32">
                          {JSON.stringify(nodeResult, null, 2)}
                        </pre>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Feature Highlights */}
        <Card>
          <CardHeader>
            <CardTitle>Integration Features</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h4 className="font-medium text-sm mb-2">File Processing</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Drag & drop file upload</li>
                  <li>• Automatic text extraction</li>
                  <li>• Multiple file formats</li>
                  <li>• OCR for images</li>
                  <li>• Progress tracking</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-sm mb-2">Workflow Integration</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Visual workflow builder</li>
                  <li>• Node-based processing</li>
                  <li>• Data flow connections</li>
                  <li>• Template variables</li>
                  <li>• Conditional logic</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-sm mb-2">AI & Automation</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• AI text processing</li>
                  <li>• Custom prompts</li>
                  <li>• API integrations</li>
                  <li>• Automated workflows</li>
                  <li>• Result formatting</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

