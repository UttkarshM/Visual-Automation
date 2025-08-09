import type { Node as ReactFlowNode, Edge as ReactFlowEdge } from 'reactflow'

export interface BaseNodeConfig {
  name: string
}

export interface InputNodeConfig extends BaseNodeConfig {
  description?: string
  initialValue?: string
  inputType?: 'text' | 'file'
  textValue?: string
  files?: File[]
  extractionMethod?: string
  outputFormat?: string
  processedText?: string
}

export interface PromptNodeConfig extends BaseNodeConfig {
  prompt: string
  model: string
}

export interface ApiNodeConfig extends BaseNodeConfig {
  url: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  headers?: Record<string, string>
  body?: string
}

export interface LogicNodeConfig extends BaseNodeConfig {
  condition: string
  compareValue: string
  operator: 'equals' | 'notEquals' | 'greaterThan' | 'lessThan' | 'greaterThanOrEqual' | 'lessThanOrEqual' | 'contains'
}

export interface OutputNodeConfig extends BaseNodeConfig {
  format: 'json' | 'text' | 'csv' | 'xml'
}

export interface FileUploadNodeConfig extends BaseNodeConfig {
  files?: string[]
  extractionMethod?: string
  outputFormat?: string
  processedText?: string
  uploadStatus?: 'idle' | 'uploading' | 'success' | 'error'
  error?: string
  data?: unknown
}

export type NodeConfig = InputNodeConfig | PromptNodeConfig | ApiNodeConfig | LogicNodeConfig | OutputNodeConfig | FileUploadNodeConfig

export interface WorkflowNodeData {
  id?: string
  label: string
  config: NodeConfig
  result?: any
}

export interface WorkflowNode extends Omit<ReactFlowNode, 'data'> {
  type: 'input' | 'prompt' | 'api' | 'logic' | 'output' | 'fileUpload'
  data: WorkflowNodeData
}

export interface WorkflowEdge extends ReactFlowEdge {
  id: string
  source: string
  target: string
  sourceHandle?: string
  targetHandle?: string
}

export interface WorkflowContext {
  variables: Record<string, unknown>
  nodeOutputs: Record<string, unknown>
  globalData: Record<string, unknown>
}

export interface LogicResult {
  result: boolean
  nextPath: string
}

export interface WorkflowExecutionResult {
  success: boolean
  result?: WorkflowContext
  executedNodes?: number
  totalEdges?: number
  error?: string
  details?: string
}

