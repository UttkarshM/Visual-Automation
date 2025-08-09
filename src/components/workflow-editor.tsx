"use client"

import type React from "react"

import { useCallback } from "react"
import ReactFlow, {
  addEdge,
  type Connection,
  Controls,
  Background,
  BackgroundVariant,
  MiniMap,
  type NodeTypes,
  type NodeChange,
  type EdgeChange,
} from "reactflow"
import type { WorkflowNode, NodeConfig } from '@/types/workflow'
import { useAppSelector, useAppDispatch } from '@/store/hooks'
import { setNodes, setEdges, addNode as addNodeAction, updateNodePosition, removeNode } from '@/store/nodesSlice'
import "reactflow/dist/style.css"

import { InputNode } from './input-node'
import { PromptNode } from './prompt-node'
import { ApiNode } from './api-node'
import { LogicNode } from './logic-node'
import { OutputNode } from './output-node'
import { FileUploadNode } from './file-upload-node'
import { NodeToolbar } from "./node-toolbar"

const nodeTypes: NodeTypes = {
  input: InputNode,
  prompt: PromptNode,
  api: ApiNode,
  logic: LogicNode,
  output: OutputNode,
  fileUpload: FileUploadNode,
}


interface WorkflowEditorProps {
  selectedNode: string | null
  onNodeSelect: (nodeId: string | null) => void
  onUpdateNode?: (nodeId: string, config: NodeConfig) => void
}

export function WorkflowEditor({ onNodeSelect, onUpdateNode }: WorkflowEditorProps) {
  const dispatch = useAppDispatch()
  const { nodes, edges } = useAppSelector((state) => state.nodes)

  const onConnect = useCallback((params: Connection) => {
    // Ensure newEdges is typed as WorkflowEdge[]
    const newEdges = addEdge(params, edges).map(edge => ({
      ...edge,
      sourceHandle: edge.sourceHandle ?? undefined,
    })) as typeof edges;
    dispatch(setEdges(newEdges));
  }, [dispatch, edges]);

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    changes.forEach((change) => {
      if (change.type === 'position' && 'position' in change && change.position) {
        dispatch(updateNodePosition({ 
          nodeId: change.id, 
          position: change.position 
        }))
      } else if (change.type === 'remove') {
        dispatch(removeNode(change.id))
      }
      // Handle other node changes like selection, etc.
    })
  }, [dispatch])

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    // Handle edge changes like deletions
    const updatedEdges = [...edges]
    changes.forEach((change) => {
      if (change.type === 'remove') {
        const index = updatedEdges.findIndex(edge => edge.id === change.id)
        if (index !== -1) {
          updatedEdges.splice(index, 1)
        }
      }
    })
    if (changes.some((change) => change.type === 'remove')) {
      dispatch(setEdges(updatedEdges))
    }
  }, [edges, dispatch])

  const onNodeClick = useCallback(
    (event: React.MouseEvent, node: WorkflowNode) => {
      onNodeSelect(node.id)
    },
    [onNodeSelect],
  )

  const addNode = useCallback(
    (type: 'input' | 'prompt' | 'api' | 'logic' | 'output' | 'fileUpload') => {
      // Generate a unique ID based on timestamp and random number
      const id = `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const newNode: WorkflowNode = {
        id,
        type,
        position: { x: Math.random() * 400 + 200, y: Math.random() * 400 + 200 },
        data: {
          id,
          label: type === 'fileUpload' ? 'File Upload' : type.charAt(0).toUpperCase() + type.slice(1),
          config: getDefaultConfig(type),
        },
      }
      dispatch(addNodeAction(newNode))
    },
    [dispatch],
  )



  return (
    <div className="relative w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
        className="bg-gray-50"
        connectionMode="loose" as any
        snapToGrid
        snapGrid={[15, 15]}
        connectOnClick={false}
        deleteKeyCode="Delete"
        selectionKeyCode={"Shift"}
        multiSelectionKeyCode={"Ctrl"}
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: true,
          style: { strokeWidth: 2 },
        }}
      >
        <Controls />
        <MiniMap />
        <Background variant={BackgroundVariant.Lines} gap={12} size={1} />
      </ReactFlow>

      <NodeToolbar onAddNode={(type: string) => addNode(type as 'input' | 'prompt' | 'api' | 'logic' | 'output' | 'fileUpload')} />
    </div>
  )
}

function getDefaultConfig(type: 'input' | 'prompt' | 'api' | 'logic' | 'output' | 'fileUpload'): NodeConfig {
  switch (type) {
    case "input":
      return { 
        name: "Input", 
        description: "Input data", 
        inputType: "text",
        textValue: ""
      }
    case "prompt":
      return {
        name: "AI Prompt",
        prompt: "Write a response to: {{input}}",
        model: "gemini-1.5-flash",
      }
    case "api":
      return {
        name: "API Call",
        url: "https://api.example.com",
        method: "GET",
        headers: {},
      }
    case "logic":
      return {
        name: "If/Else",
        condition: '{{input}}',
        compareValue: '',
        operator: 'equals',
      }
    case "output":
      return { name: "Output", format: "json" }
    case "fileUpload":
      return {
        name: "File Upload",
        files: [],
        extractionMethod: "auto",
        outputFormat: "text",
        uploadStatus: "idle"
      }
  }
}
