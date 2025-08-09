import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { workflowId, inputData, nodes, edges } = body

    if (workflowId === 'demo-workflow' && nodes && edges) {
      console.log('Executing demo workflow with current nodes and edges')
      const result = await executeCurrentWorkflow(nodes, edges, inputData || {})
      
      return NextResponse.json({
        executionId: `demo-${Date.now()}`,
        result: result.output,
        success: result.success,
        error: result.error
      })
    }

    if (!workflowId) {
      return NextResponse.json({ error: "Workflow ID required" }, { status: 400 })
    }

    const { data: workflow, error: workflowError } = await supabase
      .from("workflows")
      .select("*")
      .eq("id", workflowId)
      .single()

    if (workflowError || !workflow) {
      return NextResponse.json({ error: "Workflow not found" }, { status: 404 })
    }

    const { data: execution, error: executionError } = await supabase
      .from("workflow_executions")
      .insert({
        workflow_id: workflowId,
        status: "running",
        input_data: inputData || {},
      })
      .select()
      .single()

    if (executionError) {
      return NextResponse.json({ error: executionError.message }, { status: 500 })
    }

    const result = await executeWorkflow(workflow, inputData || {}, execution.id)

    await supabase
      .from("workflow_executions")
      .update({
        status: result.success ? "completed" : "failed",
        output_data: result.output,
        completed_at: new Date().toISOString(),
        error_message: result.error,
      })
      .eq("id", execution.id)

    return NextResponse.json({
      executionId: execution.id,
      result: result.output,
      success: result.success,
    })
  } catch (error) {
    console.error('Workflow execution error:', error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

interface WorkflowData {
  nodes: NodeData[]
  edges: EdgeData[]
}

interface NodeData {
  id: string
  type: string
  data: {
    config?: Record<string, unknown>
  }
}

interface EdgeData {
  id: string
  source: string
  target: string
}

async function executeCurrentWorkflow(nodes: NodeData[], edges: EdgeData[], inputData: Record<string, unknown>) {
  try {
    console.log('Executing current workflow with input data:', inputData);
    const results = new Map()
    
    const hasLogicNodes = nodes.some(node => node.type === 'logic')
    
    if (hasLogicNodes) {
      const startNode = findStartingNode(nodes, edges)
      if (!startNode) {
        throw new Error('No starting node found (input, dataEntry, or orphaned node)')
      }
      
      await executeBranchingWorkflow(nodes, edges as any[], startNode.id, results, inputData, 'demo-execution')
    } else {
      await executeDependencyAwareWorkflow(nodes, edges, results, inputData, 'demo-execution')
    }

    return {
      success: true,
      output: Object.fromEntries(results),
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      output: null,
    }
  }
}

async function executeWorkflow(workflow: WorkflowData, inputData: Record<string, unknown>, executionId: string) {
try {
    console.log('Executing workflow with input data:', inputData);
    const { nodes, edges } = workflow
    const results = new Map()
    
    const hasLogicNodes = nodes.some(node => node.type === 'logic')
    
    if (hasLogicNodes) {
      const startNode = findStartingNode(nodes, edges)
      if (!startNode) {
        throw new Error('No starting node found (input, dataEntry, or orphaned node)')
      }
      
      await executeBranchingWorkflow(nodes, edges as any[], startNode.id, results, inputData, executionId)
    } else {
      await executeDependencyAwareWorkflow(nodes, edges, results, inputData, executionId)
    }

    return {
      success: true,
      output: Object.fromEntries(results),
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      output: null,
    }
  }
}

// Find the best starting node for execution
function findStartingNode(nodes: NodeData[], edges: EdgeData[]): NodeData | null {
  // First, try to find an input node
  let startNode = nodes.find(node => node.type === 'input')
  if (startNode) return startNode
  
  // Then try dataEntry nodes
  startNode = nodes.find(node => node.type === 'dataEntry')
  if (startNode) return startNode
  
  // Finally, find any node with no incoming edges
  const nodesWithIncoming = new Set(edges.map(edge => edge.target))
  return nodes.find(node => !nodesWithIncoming.has(node.id)) || null
}

// New dependency-aware execution that handles input nodes properly
async function executeDependencyAwareWorkflow(
  nodes: NodeData[],
  edges: EdgeData[],
  results: Map<string, unknown>,
  inputData: Record<string, unknown>,
  executionId: string
) {
  const executed = new Set<string>()
  const executing = new Set<string>()
  
  async function executeNodeWithDependencies(nodeId: string): Promise<void> {
    if (executed.has(nodeId) || executing.has(nodeId)) {
      return // Already executed or currently executing
    }
    
    executing.add(nodeId)
    const node = nodes.find(n => n.id === nodeId)
    if (!node) {
      executing.delete(nodeId)
      return
    }
    
    // Find all dependencies (incoming edges)
    const dependencies = edges.filter(edge => edge.target === nodeId)
    
    // Execute all dependencies first
    for (const dep of dependencies) {
      await executeNodeWithDependencies(dep.source)
    }
    
    // Now execute the current node
const nodeResult = await executeNode(node, results, inputData, executionId, edges);
    console.log(`Node ${node.id} (${node.type}) executed with result:`, nodeResult);
    results.set(node.id, nodeResult)
    
    executed.add(nodeId)
    executing.delete(nodeId)
  }
  
  // Execute all nodes, starting with those that have no dependencies
  const allNodeIds = nodes.map(n => n.id)
  for (const nodeId of allNodeIds) {
    await executeNodeWithDependencies(nodeId)
  }
}

// Branching execution for workflows with logic nodes
async function executeBranchingWorkflow(
  nodes: NodeData[], 
  edges: (EdgeData & {sourceHandle?: string})[], 
  startNodeId: string,
  results: Map<string, unknown>,
  inputData: Record<string, unknown>,
  executionId: string
) {
  const visited = new Set<string>()
  
  async function executeNodeChain(nodeId: string) {
    if (visited.has(nodeId)) return
    visited.add(nodeId)
    
    const node = nodes.find(n => n.id === nodeId)
    if (!node) return
    
    // Execute the current node
const nodeResult = await executeNode(node, results, inputData, executionId, edges);
    console.log(`Node ${node.id} (${node.type}) executed with result:`, nodeResult);
    results.set(node.id, nodeResult)
    
    // Find outgoing edges from this node
    const outgoingEdges = edges.filter(edge => edge.source === nodeId)
    
    if (node.type === 'logic') {
      // For logic nodes, choose path based on condition result
      const logicResult = nodeResult as any
      const expectedHandle = logicResult.result ? 'true' : 'false'
      
      console.log(`Logic node ${nodeId} evaluated to ${logicResult.result}, taking "${expectedHandle}" path`)
      
      // Find the edge that matches the logic result
      const targetEdge = outgoingEdges.find(edge => edge.sourceHandle === expectedHandle)
      
      if (targetEdge) {
        console.log(`Following edge to node: ${targetEdge.target}`)
        await executeNodeChain(targetEdge.target)
      } else {
        console.log(`No edge found for "${expectedHandle}" path from logic node ${nodeId}`)
      }
    } else {
      // For non-logic nodes, follow all outgoing edges
      for (const edge of outgoingEdges) {
        await executeNodeChain(edge.target)
      }
    }
  }
  
  await executeNodeChain(startNodeId)
}

// Topological sort to determine execution order
function topologicalSort(nodes: NodeData[], edges: EdgeData[]): string[] {
  const graph = new Map<string, string[]>()
  const inDegree = new Map<string, number>()
  
  // Initialize graph and in-degree count
  nodes.forEach(node => {
    graph.set(node.id, [])
    inDegree.set(node.id, 0)
  })
  
  // Build graph
  edges.forEach(edge => {
    graph.get(edge.source)?.push(edge.target)
    inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1)
  })
  
  // Kahn's algorithm
  const queue: string[] = []
  const result: string[] = []
  
  inDegree.forEach((degree, nodeId) => {
    if (degree === 0) queue.push(nodeId)
  })
  
  while (queue.length > 0) {
    const current = queue.shift()!
    result.push(current)
    
    graph.get(current)?.forEach(neighbor => {
      const newDegree = (inDegree.get(neighbor) || 0) - 1
      inDegree.set(neighbor, newDegree)
      if (newDegree === 0) queue.push(neighbor)
    })
  }
  
  return result
}

// Process template variables in strings with enhanced legacy support
function processTemplate(template: string, context: Map<string, unknown>): string {
  if (typeof template !== 'string') return template
  
  console.log('Processing template:', template)
  console.log('Available context:', Array.from(context.entries()))
  
  return template.replace(/\{\{([^}]+)\}\}/g, (match, variablePath) => {
    const trimmedPath = variablePath.trim()
    console.log('Processing variable path:', trimmedPath)
    
    // Handle legacy incorrect node ID references
    if (trimmedPath.includes('input_1753600591013_e9ksojj74')) {
      console.log('Found legacy node reference, correcting...')
      // Find the actual input node in context
      for (const [key, value] of context.entries()) {
        if (key.includes('.output') && typeof value === 'string') {
          console.log(`Mapping legacy reference to: ${key} = ${value}`)
          return String(value)
        }
      }
      // Fallback to direct input lookup
      const inputValue = context.get('input')
      if (inputValue !== undefined) {
        return String(inputValue)
      }
    }
    
    // Handle node output references like "node_1.output"
    if (trimmedPath.includes('.')) {
      const [nodeId, property] = trimmedPath.split('.', 2)
      console.log(`Looking up node: ${nodeId}, property: ${property}`)
      
      const nodeResult = context.get(nodeId)
      console.log(`Node result for ${nodeId}:`, nodeResult)
      
      if (nodeResult && typeof nodeResult === 'object' && property in nodeResult) {
        const result = String((nodeResult as any)[property])
        console.log(`Found property ${property}:`, result)
        return result
      }
      
      // Return the entire node result if property is 'output'
      if (property === 'output' && nodeResult) {
        const result = typeof nodeResult === 'string' ? nodeResult : JSON.stringify(nodeResult)
        console.log(`Using entire node result as output:`, result)
        return result
      }
    }
    
    // Handle direct variable references
    const value = context.get(trimmedPath)
    console.log(`Direct lookup for ${trimmedPath}:`, value)
    if (value !== undefined) {
      return typeof value === 'string' ? value : JSON.stringify(value)
    }
    
    console.log(`No match found for: ${trimmedPath}, returning original`)
    return match
  })
}

// Get input data for a node based on its connections
function getNodeInputData(nodeId: string, edges: EdgeData[], results: Map<string, unknown>): unknown {
  const inputEdges = edges.filter(edge => edge.target === nodeId)
  
  if (inputEdges.length === 0) {
    return null // No input connections
  }
  
  if (inputEdges.length === 1) {
    return results.get(inputEdges[0].source) // Single input
  }
  
  // Multiple inputs - combine them
  const combinedInput: Record<string, unknown> = {}
  inputEdges.forEach((edge, index) => {
    combinedInput[`input_${index}`] = results.get(edge.source)
    combinedInput[edge.source] = results.get(edge.source)
  })
  
  return combinedInput
}

async function executeNode(node: NodeData, previousResults: Map<string, unknown>, inputData: Record<string, unknown>, executionId: string, edges: EdgeData[]) {
  const startTime = Date.now()

  try {
    // Get input data from connected nodes
    const nodeInputData = getNodeInputData(node.id, edges, previousResults)
    const effectiveInputData = nodeInputData || inputData
    
    let result: unknown = null

    switch (node.type) {
      case "input":
        // Input nodes can receive data from connected nodes or use initial workflow input
        let inputNodeData = inputData
        
        // If there's incoming data from connected nodes, use that instead
        if (effectiveInputData && effectiveInputData !== inputData) {
          inputNodeData = effectiveInputData
        }
        
console.log(`Executing input node ${node.id} with data:`, inputNodeData);
        result = {
          data: inputNodeData,
          message: effectiveInputData !== inputData ? "Input received from connected node" : "Initial input received",
          hasIncomingConnection: effectiveInputData !== inputData,
          timestamp: new Date().toISOString()
        }
        break

      case "prompt":
        // Process the prompt template with available data
        const promptTemplate = (node.data.config?.prompt as string) || "Process the following: {{input}}"
        const processedPrompt = processTemplate(promptTemplate, previousResults)
        const model = node.data.config?.model || "gemini-1.5-flash"
        
        console.log(`Executing prompt node ${node.id} with processed prompt:`, processedPrompt);
        
        try {
          // Call actual Gemini API
          const { callGeminiAPI } = await import('@/utils/gemini-api')
          const geminiResponse = await callGeminiAPI(processedPrompt, model)
          
          if (geminiResponse.success) {
            result = {
              prompt: processedPrompt,
              response: geminiResponse.text,
              model: model,
              input_data: effectiveInputData,
              timestamp: new Date().toISOString()
            }
            console.log(`Gemini API Success - Response: ${geminiResponse.text}`);
          } else {
            result = {
              prompt: processedPrompt,
              response: `Error from Gemini API: ${geminiResponse.error}`,
              model: model,
              input_data: effectiveInputData,
              error: geminiResponse.error,
              timestamp: new Date().toISOString()
            }
            console.error(`Gemini API Error: ${geminiResponse.error}`);
          }
        } catch (error) {
          result = {
            prompt: processedPrompt,
            response: `Failed to call Gemini API: ${error instanceof Error ? error.message : 'Unknown error'}`,
            model: model,
            input_data: effectiveInputData,
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
          }
          console.error(`Gemini API Exception:`, error);
        }
        break

      case "api":
        // Process API URL and body templates
        const apiUrl = processTemplate((node.data.config?.url as string) || "https://api.example.com", previousResults)
        const apiBody = processTemplate((node.data.config?.body as string) || "{}", previousResults)
        
console.log(`Executing API node ${node.id} with API call to:`, apiUrl);
        result = {
          status: 200,
          data: { 
            message: "API call simulated",
            processed_input: effectiveInputData 
          },
          url: apiUrl,
          method: node.data.config?.method || "GET",
          body: apiBody,
          timestamp: new Date().toISOString()
        }
        break

      case "logic":
        const conditionTemplate = (node.data.config?.condition as string) || "true"
        const processedCondition = processTemplate(conditionTemplate, previousResults)
        const compareValue = node.data.config?.compareValue || "true"
        const operator = (node.data.config?.operator as string) || "equals"
        
        const conditionResult = evaluateCondition(processedCondition, compareValue, operator, effectiveInputData)
        
console.log(`Executing logic node ${node.id} with condition: ${processedCondition}, compareValue: ${compareValue}, operator: ${operator}`);
        result = {
          condition: processedCondition,
          compareValue,
          operator,
          result: conditionResult,
          branch: conditionResult ? "true" : "false",
          nextPath: conditionResult ? "true" : "false",
          input_data: effectiveInputData,
          timestamp: new Date().toISOString()
        }
        break

      case "dataEntry":
        // Data entry nodes process uploaded files
        const uploadedFiles = node.data.config?.uploadedFiles as File[] | undefined
        
        if (!uploadedFiles || uploadedFiles.length === 0) {
console.log(`Executing data entry node ${node.id} with uploaded files:`, uploadedFiles);
        result = {
            success: false,
            error: "No files uploaded",
            files: [],
            timestamp: new Date().toISOString()
          }
        } else {
          // Convert FileList to array and process file metadata
          const fileData = Array.from(uploadedFiles).map(file => ({
            name: file.name,
            size: file.size,
            type: file.type,
            lastModified: file.lastModified
          }))
          
          result = {
            success: true,
            files: fileData,
            fileCount: fileData.length,
            totalSize: fileData.reduce((sum, f) => sum + f.size, 0),
            data: uploadedFiles, // Pass the actual files for processing by fileToText nodes
            timestamp: new Date().toISOString()
          }
        }
        break

      case "fileToText":
        // File to text conversion node
        const extractionMethod = (node.data.config?.extractionMethod as string) || "auto"
        const outputFormat = (node.data.config?.outputFormat as string) || "text"
        
        // Get files from previous node (usually a dataEntry node)
        let filesToProcess: File[] = []
        
        if (effectiveInputData && typeof effectiveInputData === 'object') {
          // Check if input has files from dataEntry node
          if ('data' in effectiveInputData && Array.isArray((effectiveInputData as any).data)) {
            filesToProcess = (effectiveInputData as any).data as File[]
          }
          // Also check if there's direct file data
          if ('files' in effectiveInputData && Array.isArray((effectiveInputData as any).files)) {
            filesToProcess = (effectiveInputData as any).files as File[]
          }
        }
        
        console.log(`Executing fileToText node ${node.id} with ${filesToProcess.length} files to process`);
        
        if (filesToProcess.length === 0) {
          result = {
            success: false,
            error: "No files received for text extraction",
            extractedText: "",
            output: "", // Ensure output is available for template processing
            timestamp: new Date().toISOString()
          }
        } else {
          try {
            // Process files using file processor utility
            const { processFiles, combineFileResults } = await import('@/utils/file-processor')
            const processingResults = await processFiles(filesToProcess, extractionMethod)
            const combinedText = combineFileResults(processingResults, outputFormat)
            
            console.log(`File processing completed. Extracted text length: ${combinedText.length}`);
            
            result = {
              success: true,
              extractedText: combinedText,
              data: combinedText, // Pass the extracted text as data for other nodes
              output: combinedText, // Make the text available for template processing
              extractionMethod,
              outputFormat,
              processedFiles: processingResults.length,
              successfulExtractions: processingResults.filter(r => r.success).length,
              fileResults: processingResults,
              timestamp: new Date().toISOString()
            }
          } catch (error) {
            console.error(`File processing error in fileToText node ${node.id}:`, error);
            result = {
              success: false,
              error: `File processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
              extractedText: "",
              output: "", // Ensure output is available even on error
              timestamp: new Date().toISOString()
            }
          }
        }
        break

      case "fileUpload":
        // File upload nodes process uploaded files similar to dataEntry but with extracted text
        const fileUploadConfig = node.data.config as any
        const processedText = fileUploadConfig?.processedText || fileUploadConfig?.data
        const files = fileUploadConfig?.files || []
        
        console.log(`Executing fileUpload node ${node.id} with ${files.length} files and processed text:`, processedText?.slice(0, 100) + '...');
        
        if (!processedText && files.length === 0) {
          result = {
            success: false,
            error: "No files uploaded or processed text available",
            files: [],
            processedText: "",
            data: "",
            timestamp: new Date().toISOString()
          }
        } else {
          result = {
            success: true,
            files: files,
            processedText: processedText || "",
            data: processedText || "", // Make the processed text available for other nodes
            output: processedText || "", // Make it available for template processing
            fileCount: files.length,
            extractionMethod: fileUploadConfig?.extractionMethod || "auto",
            outputFormat: fileUploadConfig?.outputFormat || "text",
            uploadStatus: fileUploadConfig?.uploadStatus || "success",
            timestamp: new Date().toISOString()
          }
        }
        break

      case "output":
        const outputNodeFormat = (node.data.config?.format as string) || "json"
        console.log(`Executing output node ${node.id} with final output:`, effectiveInputData);
        result = {
          final_output: effectiveInputData,
          all_results: Object.fromEntries(previousResults),
          format: outputNodeFormat,
          timestamp: new Date().toISOString()
        }
        break

      default:
        result = { 
          message: "Unknown node type",
          node_type: node.type,
          input_data: effectiveInputData
        }
    }

    await supabase.from("node_executions").insert({
      execution_id: executionId,
      node_id: node.id,
      node_type: node.type,
      status: "completed",
      input_data: inputData,
      output_data: result,
      execution_time_ms: Date.now() - startTime,
    })

    return result
  } catch (error) {
    await supabase.from("node_executions").insert({
      execution_id: executionId,
      node_id: node.id,
      node_type: node.type,
      status: "failed",
      input_data: inputData,
      error_message: error instanceof Error ? error.message : "Unknown error",
      execution_time_ms: Date.now() - startTime,
    })

    throw error
  }
}

// Evaluate logical conditions
function evaluateCondition(value: any, compareValue: any, operator: string, inputData?: unknown): boolean {
  switch (operator) {
    case 'equals':
      return value === compareValue
    case 'notEquals':
      return value !== compareValue
    case 'greaterThan':
      return Number(value) > Number(compareValue)
    case 'lessThan':
      return Number(value) < Number(compareValue)
    case 'greaterThanOrEqual':
      return Number(value) >= Number(compareValue)
    case 'lessThanOrEqual':
      return Number(value) <= Number(compareValue)
    case 'contains':
      return String(value).includes(String(compareValue))
    default:
      return false
  }
}
