
export interface WorkflowContext {
  variables: Record<string, any>
  nodeOutputs: Record<string, any>
  globalData: Record<string, any>
}

export class WorkflowExecutor {
  private context: WorkflowContext

  constructor() {
    this.context = {
      variables: {},
      nodeOutputs: {},
      globalData: {}
    }
  }

  setNodeOutput(nodeId: string, output: any) {
    this.context.nodeOutputs[nodeId] = output
    this.context.variables[`${nodeId}.output`] = output
  }

  getNodeInput(nodeId: string, template: string): any {
    return this.processTemplate(template)
  }

  private processTemplate(template: string): any {
    if (typeof template !== 'string') return template

    return template.replace(/\{\{([^}]+)\}\}/g, (match, variablePath) => {
      const value = this.getVariable(variablePath.trim())
      return value !== undefined ? value : match
    })
  }

  private getVariable(path: string): any {
    const parts = path.split('.')
    let current: any = this.context.variables

    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part]
      } else {
        return undefined
      }
    }

    return current
  }

  setGlobalVariable(key: string, value: any) {
    this.context.globalData[key] = value
    this.context.variables[key] = value
  }

  getContext(): WorkflowContext {
    return { ...this.context }
  }
}

export function executeWorkflow(nodes: any[], edges: any[]) {
  const executor = new WorkflowExecutor()
  
  nodes.forEach(node => {
    switch (node.type) {
      case 'input':
        executor.setNodeOutput(node.id, node.data.config.initialValue || "Initial data")
        break
        
      case 'prompt':
        const processedPrompt = executor.getNodeInput(node.id, node.data.config.prompt)
        const aiResult = `AI processed: ${processedPrompt}`
        executor.setNodeOutput(node.id, aiResult)
        break
        
      case 'api':
        const processedUrl = executor.getNodeInput(node.id, node.data.config.url)
        const apiResult = `API result from ${processedUrl}`
        executor.setNodeOutput(node.id, apiResult)
        break
        
      case 'logic':
        const condition = executor.getNodeInput(node.id, node.data.config.condition)
        const compareValue = node.data.config.compareValue
        const operator = node.data.config.operator || 'equals'
        
        const result = evaluateCondition(condition, compareValue, operator)
        executor.setNodeOutput(node.id, result)
        break
        
      case 'fileToText':
        const extractionMethod = node.data.config.extractionMethod || 'auto'
        const outputFormat = node.data.config.outputFormat || 'text'
        
        const extractedText = `Extracted text from files using ${extractionMethod} method`
        executor.setNodeOutput(node.id, {
          extractedText,
          output: extractedText,
          data: extractedText
        })
        break
        
      case 'dataEntry':
        const uploadedFiles = node.data.config.uploadedFiles || []
        executor.setNodeOutput(node.id, {
          files: uploadedFiles,
          data: uploadedFiles,
          fileCount: uploadedFiles.length
        })
        break
    }
  })
  
  return executor.getContext()
}

function evaluateCondition(value: any, compareValue: any, operator: string): boolean {
  switch (operator) {
    case 'equals': return value === compareValue
    case 'notEquals': return value !== compareValue
    case 'greaterThan': return Number(value) > Number(compareValue)
    case 'lessThan': return Number(value) < Number(compareValue)
    case 'greaterThanOrEqual': return Number(value) >= Number(compareValue)
    case 'lessThanOrEqual': return Number(value) <= Number(compareValue)
    case 'contains': return String(value).includes(String(compareValue))
    default: return false
  }
}

