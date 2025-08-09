"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { X, Settings, Play, Upload, File, CheckCircle } from "lucide-react"
import type { WorkflowNode, NodeConfig } from "@/types/workflow"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { updateNode } from "@/store/nodesSlice"
import { FileUpload } from "@/components/file-upload"
import type { FileUploadResponse } from "@/hooks/useFileUpload"

interface WorkflowSidebarProps {
  selectedNode: WorkflowNode | null
  onClose: () => void
  onUpdateNode: (nodeId: string, config: NodeConfig) => void
}


export function WorkflowSidebar({ selectedNode, onClose, onUpdateNode }: WorkflowSidebarProps) {
  const [config, setConfig] = useState<Partial<NodeConfig>>({})
  const dispatch = useAppDispatch();
  const { nodes, edges } = useAppSelector((state) => state.nodes)

  // Helper function to get available node variables based on connections
  const getAvailableNodeVariables = (currentNodeId?: string) => {
    if (!currentNodeId) return []
    
    // Find all nodes that can provide input to the current node
    const inputNodes = edges
      .filter(edge => edge.target === currentNodeId)
      .map(edge => nodes.find(node => node.id === edge.source))
      .filter(Boolean)
    
    const variables: Array<{ template: string; description: string }> = []
    
    inputNodes.forEach(node => {
      if (!node) return
      
      const nodeType = node.type
      const nodeName = node.data?.config?.name || node.type
      
      // Add basic node output variable
      variables.push({
        template: `{{${node.id}.output}}`,
        description: `${nodeName} (${nodeType}) output`
      })
      
      // Add specific properties based on node type
      switch (nodeType) {
        case 'input':
          variables.push({
            template: `{{${node.id}.data}}`,
            description: `${nodeName} input data`
          })
          break
        case 'prompt':
          variables.push(
            {
              template: `{{${node.id}.response}}`,
              description: `${nodeName} AI response`
            },
            {
              template: `{{${node.id}.prompt}}`,
              description: `${nodeName} processed prompt`
            }
          )
          break
        case 'api':
          variables.push(
            {
              template: `{{${node.id}.data}}`,
              description: `${nodeName} API response data`
            },
            {
              template: `{{${node.id}.status}}`,
              description: `${nodeName} HTTP status`
            }
          )
          break
        case 'logic':
          variables.push(
            {
              template: `{{${node.id}.result}}`,
              description: `${nodeName} condition result (true/false)`
            },
            {
              template: `{{${node.id}.branch}}`,
              description: `${nodeName} branch taken`
            }
          )
          break
      }
    })
    
    return variables
  }

  useEffect(() => {
    if (selectedNode) {
      setConfig({ 
        type: selectedNode.type || 'input',
        ...selectedNode.data?.config 
      })
    } else {
      setConfig({})
    }
  }, [selectedNode])

  if (!selectedNode) return null

  const updateConfig = (key: string, value: string) => {
    const newConfig = { ...config, [key]: value } as NodeConfig
    setConfig(newConfig)
    if (selectedNode) {
      dispatch(updateNode({ nodeId: selectedNode.id, config: newConfig }))
    }
  }


  return (
    <div className="w-80 sm:w-96 md:w-80 lg:w-96 xl:w-[28rem] 2xl:w-[32rem] bg-white border-l border-gray-200 flex flex-col min-w-[320px] max-w-[600px] resize-x overflow-auto">
      {/* Resize handle */}
      <div className="absolute left-0 top-0 w-1 h-full cursor-col-resize bg-gray-300 hover:bg-gray-400 transition-colors opacity-0 hover:opacity-100" 
           onMouseDown={(e) => {
             const startX = e.clientX
             const startWidth = e.currentTarget.parentElement?.offsetWidth || 320
             
             const handleMouseMove = (e: MouseEvent) => {
               const newWidth = Math.max(320, Math.min(600, startWidth - (e.clientX - startX)))
               if (e.currentTarget.parentElement) {
                 e.currentTarget.parentElement.style.width = `${newWidth}px`
               }
             }
             
             const handleMouseUp = () => {
               document.removeEventListener('mousemove', handleMouseMove)
               document.removeEventListener('mouseup', handleMouseUp)
             }
             
             document.addEventListener('mousemove', handleMouseMove)
             document.addEventListener('mouseup', handleMouseUp)
           }}
      />
      
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Settings className="w-5 h-5 text-gray-600" />
          <h3 className="font-medium text-gray-900">Node Configuration</h3>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex-1 p-4 space-y-4 overflow-y-auto">
        <div className="space-y-2">
          <Label htmlFor="node-name">Node Name</Label>
          <Input
            id="node-name"
            value={config.name || ''}
            onChange={(e) => updateConfig("name", e.target.value)}
            placeholder="Enter node name"
          />
        </div>

        <div className="space-y-2">
          <Label>Node Type</Label>
          <div className="text-sm font-medium text-gray-600 bg-gray-100 px-3 py-2 rounded">
            {selectedNode?.type ? selectedNode.type.charAt(0).toUpperCase() + selectedNode.type.slice(1) : 'Unknown'}
          </div>
        </div>

        {selectedNode?.type === "prompt" && (
          <>
            <div className="space-y-2">
              <Label htmlFor="model">AI Model</Label>
              <Select value={(config as any).model || 'gemini-1.5-flash'} onValueChange={(value) => updateConfig("model", value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gemini-1.5-flash">Gemini 1.5 Flash</SelectItem>
                  <SelectItem value="gemini-1.5-pro">Gemini 1.5 Pro</SelectItem>
                  <SelectItem value="gemini-1.0-pro">Gemini 1.0 Pro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="prompt">Prompt Template</Label>
              <Textarea
                id="prompt"
                value={(config as any).prompt || ''}
                onChange={(e) => updateConfig("prompt", e.target.value)}
                placeholder="Enter your prompt template..."
                rows={4}
              />
              <p className="text-xs text-gray-500">Use {"{{variable}}"} to reference data from previous nodes</p>
            </div>
          </>
        )}

        {selectedNode?.type === "api" && (
          <>
            <div className="space-y-2">
              <Label htmlFor="method">HTTP Method</Label>
              <Select value={(config as any).method || 'GET'} onValueChange={(value) => updateConfig("method", value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GET">GET</SelectItem>
                  <SelectItem value="POST">POST</SelectItem>
                  <SelectItem value="PUT">PUT</SelectItem>
                  <SelectItem value="DELETE">DELETE</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="url">API URL</Label>
              <Input
                id="url"
                value={(config as any).url || ''}
                onChange={(e) => updateConfig("url", e.target.value)}
                placeholder="https://api.example.com/endpoint"
              />
            </div>
          </>
        )}

        {selectedNode?.type === "logic" && (
          <>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <div className="text-sm font-medium text-blue-800 mb-1">Branching Logic Node</div>
              <div className="text-xs text-blue-600">
                This node evaluates a condition and routes execution to either the <span className="font-medium text-green-600">TRUE (T)</span> or <span className="font-medium text-red-600">FALSE (F)</span> output based on the result.
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="condition">Condition</Label>
              <Input
                id="condition"
                value={config.condition || ''}
                onChange={(e) => updateConfig("condition", e.target.value)}
                placeholder="{{input}}"
              />
              <p className="text-xs text-gray-500">Variable to compare</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="compareValue">Compare With Value</Label>
              <Input
                id="compareValue"
                value={config.compareValue || ''}
                onChange={(e) => updateConfig("compareValue", e.target.value)}
                placeholder="Enter value to compare with"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="operator">Comparison Operator</Label>
              <Select value={config.operator || 'equals'} onValueChange={(value) => updateConfig("operator", value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="equals">Equals (===)</SelectItem>
                  <SelectItem value="notEquals">Not Equals (!==)</SelectItem>
                  <SelectItem value="greaterThan">
                    Greater Than ({'>'})
                  </SelectItem>
                  <SelectItem value="lessThan">
                    Less Than ({'<'})
                  </SelectItem>
                  <SelectItem value="greaterThanOrEqual">
                    Greater Than or Equal ({'>='}) 
                  </SelectItem>
                  <SelectItem value="lessThanOrEqual">
                    Less Than or Equal ({'<='}) 
                  </SelectItem>
                  <SelectItem value="contains">Contains</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <div className="text-sm font-medium text-gray-700 mb-2">Branching Paths:</div>
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="font-medium text-green-600">TRUE:</span>
                  <span className="text-gray-600">Connect to nodes that should execute when condition is true</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <span className="font-medium text-red-600">FALSE:</span>
                  <span className="text-gray-600">Connect to nodes that should execute when condition is false</span>
                </div>
              </div>
            </div>
          </>
        )}

        {selectedNode?.type === "input" && (
          <>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={config.description || ''}
                onChange={(e) => updateConfig("description", e.target.value)}
                placeholder="Describe what this input provides..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="inputType">Input Type</Label>
              <Select value={(config as any).inputType || 'text'} onValueChange={(value) => updateConfig("inputType", value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Text Input</SelectItem>
                  <SelectItem value="file">File Upload</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {((config as any).inputType || 'text') === 'text' && (
              <div className="space-y-2">
                <Label htmlFor="textValue">Text Value</Label>
                <Textarea
                  id="textValue"
                  value={(config as any).textValue || ''}
                  onChange={(e) => updateConfig("textValue", e.target.value)}
                  placeholder="Enter your text here..."
                  rows={4}
                />
              </div>
            )}

            {((config as any).inputType || 'text') === 'file' && (
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center space-x-2">
                  <File className="w-4 h-4" />
                  <span>File Upload</span>
                </Label>
                <FileUpload
                  maxFiles={5}
                  extractionMethod={(config as any).extractionMethod || 'auto'}
                  outputFormat={(config as any).outputFormat || 'text'}
                  onUploadComplete={(result: FileUploadResponse) => {
                    if (result.success) {
                      const newConfig = {
                        ...config,
                        processedText: result.combinedText,
                        data: result.combinedText,
                        files: result.files.map(f => f.fileName)
                      }
                      setConfig(newConfig)
                      dispatch(
                        updateNode({
                          nodeId: selectedNode.id,
                          config: newConfig as NodeConfig
                        })
                      )
                    }
                  }}
                  onError={(error) => console.error('File upload error:', error)}
                  className="transform scale-95 origin-top"
                />

                {(config as any).processedText && (
                  <div className="space-y-1">
                    <Label className="text-xs font-medium flex items-center space-x-1">
                      <CheckCircle className="w-3 h-3 text-green-500" />
                      <span>Extracted Text Preview</span>
                    </Label>
                    <div className="max-h-20 overflow-y-auto bg-gray-50 p-2 rounded text-xs text-gray-700 border">
                      {(config as any).processedText.slice(0, 200)}
                      {(config as any).processedText.length > 200 && '...'}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}



        {selectedNode?.type === "output" && (
          <>
            <div className="space-y-2">
              <Label htmlFor="format">Output Format</Label>
              <Select value={config.format || 'json'} onValueChange={(value) => updateConfig("format", value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="json">JSON</SelectItem>
                  <SelectItem value="text">Plain Text</SelectItem>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="xml">XML</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Display stored response data */}
            {(config as any).result && (
              <div className="space-y-2">
                <Label>Stored Response Data</Label>
                <div className="bg-gray-50 p-3 rounded-lg border max-h-64 overflow-auto">
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium text-gray-700">Execution Result</span>
                      {(config as any).result.timestamp && (
                        <span className="text-gray-500 text-xs">
                          {new Date((config as any).result.timestamp).toLocaleString()}
                        </span>
                      )}
                    </div>
                    
                    {(config as any).result.format && (
                      <div className="mb-2">
                        <span className="font-medium text-gray-600">Format: </span>
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                          {(config as any).result.format}
                        </span>
                      </div>
                    )}
                    
                    <div>
                      <div className="font-medium text-gray-600 mb-1">Response Data:</div>
                      <div className="bg-white p-2 rounded border text-xs font-mono">
                        <pre className="whitespace-pre-wrap max-h-48 overflow-auto">
                          {typeof (config as any).result.data === 'string' 
                            ? (config as any).result.data 
                            : JSON.stringify((config as any).result.data, null, 2)
                          }
                        </pre>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Show message when no data is available */}
            {!(config as any).result && (
              <div className="space-y-2">
                <Label>Response Data</Label>
                <div className="bg-gray-100 p-3 rounded-lg border text-center text-gray-500 text-sm">
                  <div className="mb-1">No response data available</div>
                  <div className="text-xs">Run the workflow to see the response data here</div>
                </div>
              </div>
            )}
          </>
        )}

        <div className="pt-4 border-t border-gray-200">
          <Button className="w-full" size="sm">
            <Play className="w-4 h-4 mr-2" />
            Test Node
          </Button>
        </div>
      </div>
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-gray-700">Available Variables</h4>
          <div className="text-xs text-gray-500 bg-blue-50 px-2 py-1 rounded">
            💡 Click to copy
          </div>
        </div>
        
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {/* Basic variables */}
          <div className="space-y-1">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Basic Variables</div>
            
            <div className="group bg-white border border-gray-200 rounded-lg p-3 cursor-pointer hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 shadow-sm hover:shadow-md" 
                 onClick={() => {
                   navigator.clipboard?.writeText('{{input}}')
                   // Show visual feedback
                   const element = document.activeElement as HTMLElement
                   element?.classList.add('animate-pulse')
                   setTimeout(() => element?.classList.remove('animate-pulse'), 300)
                 }}
                 title="Click to copy to clipboard">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="font-mono text-sm font-bold text-blue-600 group-hover:text-blue-700">
                    {"{{input}}"}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    Workflow input data
                  </div>
                </div>
                <div className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
          
          {/* Connected node variables */}
          {getAvailableNodeVariables(selectedNode?.id).length > 0 && (
            <div className="space-y-1">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 mt-4">Connected Nodes</div>
              
              {getAvailableNodeVariables(selectedNode?.id).map((variable, index) => (
                <div key={index} 
                     className="group bg-white border border-gray-200 rounded-lg p-3 cursor-pointer hover:border-green-300 hover:bg-green-50 transition-all duration-200 shadow-sm hover:shadow-md"
                     onClick={() => {
                       navigator.clipboard?.writeText(variable.template)
                       // Show visual feedback
                       const element = document.activeElement as HTMLElement
                       element?.classList.add('animate-pulse')
                       setTimeout(() => element?.classList.remove('animate-pulse'), 300)
                     }}
                     title={`Click to copy - ${variable.description}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-mono text-sm font-bold text-green-600 group-hover:text-green-700">
                        {variable.template}
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        {variable.description}
                      </div>
                    </div>
                    <div className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* No connected variables message */}
          {getAvailableNodeVariables(selectedNode?.id).length === 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
              <div className="text-yellow-600 text-sm font-medium mb-1">
                No Connected Variables
              </div>
              <div className="text-xs text-yellow-600">
                Connect other nodes to this one to see their output variables here
              </div>
            </div>
          )}
        </div>
        
        {/* Instructions */}
        <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
          <div className="font-medium mb-1">💡 How to use:</div>
          <div>1. Click any variable above to copy it</div>
          <div>2. Paste it into your prompt template or other fields</div>
          <div>3. Variables automatically resolve during workflow execution</div>
        </div>
      </div>
    </div>
  )
}
