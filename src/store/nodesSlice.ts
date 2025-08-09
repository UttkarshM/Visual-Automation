import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { WorkflowNode, WorkflowEdge, NodeConfig } from '@/types/workflow'

interface NodesState {
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  selectedNodeId: string | null
}

const initialState: NodesState = {
  nodes: [
    {
      id: "1",
      type: "input",
      position: { x: 100, y: 100 },
      data: {
        label: "Start",
        config: {
          name: "Workflow Start",
          description: "Starting point of the workflow",
        } as NodeConfig,
      },
    },
  ],
  edges: [],
  selectedNodeId: null,
}

const nodesSlice = createSlice({
  name: 'nodes',
  initialState,
  reducers: {
    setNodes: (state, action: PayloadAction<WorkflowNode[]>) => {
      state.nodes = action.payload
    },
    addNode: (state, action: PayloadAction<WorkflowNode>) => {
      state.nodes.push(action.payload)
    },
    updateNode: (state, action: PayloadAction<{ nodeId: string; config: NodeConfig }>) => {
      const { nodeId, config } = action.payload
      const nodeIndex = state.nodes.findIndex(node => node.id === nodeId)
      if (nodeIndex !== -1) {
        state.nodes[nodeIndex].data = {
          ...state.nodes[nodeIndex].data,
          config
        }
      }
    },
    removeNode: (state, action: PayloadAction<string>) => {
      state.nodes = state.nodes.filter(node => node.id !== action.payload)
      state.edges = state.edges.filter(
        edge => edge.source !== action.payload && edge.target !== action.payload
      )
    },
    setEdges: (state, action: PayloadAction<WorkflowEdge[]>) => {
      state.edges = action.payload
    },
    addEdge: (state, action: PayloadAction<WorkflowEdge>) => {
      state.edges.push(action.payload)
    },
    removeEdge: (state, action: PayloadAction<string>) => {
      state.edges = state.edges.filter(edge => edge.id !== action.payload)
    },
    setSelectedNodeId: (state, action: PayloadAction<string | null>) => {
      state.selectedNodeId = action.payload
    },
    updateNodePosition: (state, action: PayloadAction<{ nodeId: string; position: { x: number; y: number } }>) => {
      const { nodeId, position } = action.payload
      const nodeIndex = state.nodes.findIndex(node => node.id === nodeId)
      if (nodeIndex !== -1) {
        state.nodes[nodeIndex].position = position
      }
    },
    clearWorkflow: (state) => {
      state.nodes = [initialState.nodes[0]]
      state.edges = []
      state.selectedNodeId = null
    },
    clearStaleData: (state) => {
      // Remove stale result data from output node configs
      state.nodes = state.nodes.map(node => {
        if (node.type === 'output' && node.data.config) {
          const { result, ...cleanConfig } = node.data.config as any
          return {
            ...node,
            data: {
              ...node.data,
              config: cleanConfig,
              result: undefined
            }
          }
        }
        return node
      })
    },
    updateNodeExecutionResult: (state, action: PayloadAction<{ nodeId: string; result: any }>) => {
      const { nodeId, result } = action.payload
      console.log(`[Redux] Updating node ${nodeId} with result:`, result)
      const nodeIndex = state.nodes.findIndex(node => node.id === nodeId)
      if (nodeIndex !== -1) {
        console.log(`[Redux] Found node at index ${nodeIndex}, updating data.result`)
        state.nodes[nodeIndex].data = {
          ...state.nodes[nodeIndex].data,
          result: result
        }
        console.log(`[Redux] Node ${nodeId} updated. New data:`, state.nodes[nodeIndex].data)
      } else {
        console.log(`[Redux] Node ${nodeId} not found in state`)
      }
    },
    updateAllNodeExecutionResults: (state, action: PayloadAction<Record<string, any>>) => {
      const results = action.payload
      state.nodes = state.nodes.map(node => {
        if (results[node.id]) {
          return {
            ...node,
            data: {
              ...node.data,
              result: results[node.id]
            }
          }
        }
        return node
      })
    }
  },
})

export const {
  setNodes,
  addNode,
  updateNode,
  removeNode,
  setEdges,
  addEdge,
  removeEdge,
  setSelectedNodeId,
  updateNodePosition,
  clearWorkflow,
  clearStaleData,
  updateNodeExecutionResult,
  updateAllNodeExecutionResults
} = nodesSlice.actions

export default nodesSlice.reducer

