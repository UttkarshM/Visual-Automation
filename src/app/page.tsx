"use client"

import { useState } from "react"
import { Provider } from 'react-redux'
import { PersistGate } from 'redux-persist/integration/react'
import { store, persistor } from '@/store/store'
import { WorkflowEditor } from "@/components/workflow-editor"
import { WorkflowSidebar } from "@/components/workflow-sidebar"
import { Button } from "@/components/ui/button"
import { Play, Save, Settings } from "lucide-react"
import { useAppSelector, useAppDispatch } from '@/store/hooks'
import { setSelectedNodeId, updateNode, clearWorkflow, updateNodeExecutionResult } from '@/store/nodesSlice'
import type { NodeConfig, WorkflowExecutionResult } from '@/types/workflow'

function HomePage() {
  const dispatch = useAppDispatch()
  const { nodes, edges, selectedNodeId } = useAppSelector((state) => state.nodes)
  const [isRunning, setIsRunning] = useState(false)
  const [workflowResult, setWorkflowResult] = useState<WorkflowExecutionResult | null>(null)

  const handleRunWorkflow = async () => {
    if (!nodes || nodes.length === 0) {
      alert('Please add at least one node to the workflow before running.')
      return
    }

    setIsRunning(true)

    try {
      const response = await fetch('/api/workflows/nodes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ nodes, edges })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result: WorkflowExecutionResult = await response.json()
      
      if (result.success) {
        console.log('Workflow executed successfully:', result)
        setWorkflowResult(result)
        
        // Update all nodes with their execution results
        if (result.result && typeof result.result === 'object') {
          const nodeOutputs = (result.result as any).nodeOutputs || result.result
          console.log('Node outputs received:', nodeOutputs)
          
          nodes.forEach(node => {
            const nodeResult = nodeOutputs[node.id]
            if (nodeResult) {
              console.log(`Updating node ${node.id} (${node.type}) with result:`, nodeResult)
              // Update the node's result data using the correct Redux action
              dispatch(updateNodeExecutionResult({ 
                nodeId: node.id, 
                result: nodeResult
              }))
            } else {
              console.log(`No result found for node ${node.id} in nodeOutputs:`, Object.keys(nodeOutputs))
            }
          })
        }
        
        alert(`Workflow executed successfully! Processed ${result.executedNodes || 0} nodes.`)
      } else {
        console.error('Workflow execution failed:', result.error)
        alert(`Workflow execution failed: ${result.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error calling workflow API:', error)
      alert(`Error running workflow: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsRunning(false)
    }
  }

  const handleSaveWorkflow = () => {
    // TODO: Implement workflow saving
    console.log("Saving workflow...", nodes)
  }

  const handleUpdateNode = (nodeId: string, config: NodeConfig) => {
    dispatch(updateNode({ nodeId, config }))
  }

  const handleNodeSelect = (nodeId: string | null) => {
    dispatch(setSelectedNodeId(nodeId))
  }

  const getSelectedNode = () => {
    return nodes.find(node => node.id === selectedNodeId) || null
  }

  const handleClearWorkflow = () => {
    dispatch(clearWorkflow())
  }

  const handleTestSequence = () => {
    const startNode = nodes.find(node => node.type === 'input')
    if (!startNode) {
      console.log('No starting node found')
      return
    }

    const sequence = []
    const visited = new Set()
    let currentNode = startNode

    while (currentNode && !visited.has(currentNode.id)) {
      visited.add(currentNode.id)
      sequence.push({
        id: currentNode.id,
        type: currentNode.type,
        name: currentNode.data?.config?.name || currentNode.data?.label,
        config: currentNode.data?.config
      })

      // Find the next node
      const nextEdge = edges.find(edge => edge.source === currentNode.id)
      if (nextEdge) {
        const nextNode = nodes.find(node => node.id === nextEdge.target)
        if (nextNode) {
          currentNode = nextNode
        } else {
          break
        }
      } else {
        break
      }
    }

    console.log('Node Sequence:', sequence)
    console.log('Total nodes in sequence:', sequence.length)
    console.log('All nodes:', nodes)
    console.log('All edges:', edges)
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-semibold text-gray-900">Visual Automation</h1>
          <div className="flex items-center space-x-2">
            <Button onClick={handleRunWorkflow} disabled={isRunning} className="bg-green-600 hover:bg-green-700">
              <Play className="w-4 h-4 mr-2" />
              {isRunning ? "Running..." : "Run"}
            </Button>
            <Button onClick={handleSaveWorkflow} variant="outline">
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>
            <Button onClick={handleClearWorkflow} variant="outline">
              Clear
            </Button>
            <Button onClick={handleTestSequence} variant="outline">
              Test
            </Button>
          </div>
        </div>
        <div className="text-sm text-gray-500">
          Nodes: {nodes.length}
        </div>
      </header>

      <div className="flex-1 flex">
        <div className="flex-1">
          <WorkflowEditor 
            selectedNode={selectedNodeId} 
            onNodeSelect={handleNodeSelect}
            onUpdateNode={handleUpdateNode}
          />
        </div>

        <WorkflowSidebar 
          selectedNode={getSelectedNode()} 
          onClose={() => dispatch(setSelectedNodeId(null))}
          onUpdateNode={handleUpdateNode}
        />
      </div>
    </div>
  )
}

export default function App() {
  return (
    <Provider store={store}>
      <PersistGate loading={<div className="h-screen flex items-center justify-center">Loading...</div>} persistor={persistor}>
        <HomePage />
      </PersistGate>
    </Provider>
  )
}
