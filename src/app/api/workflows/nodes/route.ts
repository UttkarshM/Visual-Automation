import { NextRequest, NextResponse } from 'next/server'
import { callGeminiAPI } from '@/utils/gemini-api'

import type { WorkflowNode, WorkflowEdge, WorkflowContext, LogicResult } from '@/types/workflow';

class WorkflowExecutor {
  private context: WorkflowContext;

  constructor() {
    this.context = {
      variables: {},
      nodeOutputs: {},
      globalData: {}
    };
  }

  setNodeOutput(nodeId: string, output: any) {
    this.context.nodeOutputs[nodeId] = output;
    this.context.variables[`${nodeId}.output`] = output;
    this.context.variables['input'] = output;
  }

  processTemplate(template: string): string {
    if (typeof template !== 'string') return template;

    console.log(`\n--- PROCESSING TEMPLATE ---`);
    console.log(`Template: ${template}`);
    console.log(`Available variables:`, this.context.variables);

    return template.replace(/\{\{([^}]+)\}\}/g, (match, variablePath) => {
      const trimmedPath = variablePath.trim();
      console.log(`Processing variable: ${trimmedPath}`);
      
      // Handle legacy incorrect node ID references - map them to correct references  
      if (trimmedPath.includes('input_1753600591013_e9ksojj74')) {
        // Map legacy reference to the correct available variable
        let correctedPath;
        if (trimmedPath.includes('.data')) {
          correctedPath = '1.output'; // Map .data to .output since that's what's available
        } else {
          correctedPath = trimmedPath.replace('input_1753600591013_e9ksojj74', '1');
        }
        console.log(`Correcting legacy node ID: ${trimmedPath} -> ${correctedPath}`);
        const value = this.getVariable(correctedPath);
        console.log(`Found corrected value: ${value}`);
        return value !== undefined ? String(value) : match;
      }
      
      // Handle special case: node_1 should map to node ID "1"
      if (trimmedPath.startsWith('node_')) {
        const nodeNumber = trimmedPath.replace('node_', '').split('.')[0];
        const property = trimmedPath.includes('.') ? trimmedPath.split('.')[1] : 'output';
        const actualPath = `${nodeNumber}.${property}`;
        console.log(`Mapping ${trimmedPath} -> ${actualPath}`);
        const value = this.getVariable(actualPath);
        console.log(`Found value: ${value}`);
        return value !== undefined ? String(value) : match;
      }
      
      const value = this.getVariable(trimmedPath);
      console.log(`Direct lookup ${trimmedPath}: ${value}`);
      return value !== undefined ? String(value) : match;
    });
  }

  private getVariable(path: string): any {
    if (path in this.context.variables) {
      return this.context.variables[path];
    }
    
    // Then try nested path lookup
    const parts = path.split('.');
    let current: any = this.context.variables;

    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return undefined;
      }
    }

    return current;
  }

  setGlobalVariable(key: string, value: any) {
    this.context.globalData[key] = value;
    this.context.variables[key] = value;
  }

  getContext(): WorkflowContext {
    return { ...this.context };
  }

  async executeNode(node: WorkflowNode): Promise<any> {
    const currentInput = this.context.variables['input'] || 'No input yet';
    
    console.log(`\n=== EXECUTING NODE ===`);
    console.log(`Node ID: ${node.id}`);
    console.log(`Node Type: ${node.type}`);
    console.log(`Node Name: ${node.data.config.name}`);
    console.log(`Current Input: ${currentInput}`);
    console.log(`Node Config:`, node.data.config);
    
    let output;
    
    switch (node.type) {
      case 'input':
        const inputType = (node.data.config as any).inputType || 'text';
        const textValue = (node.data.config as any).textValue;
        const processedText = (node.data.config as any).processedText;
        const data = (node.data.config as any).data;
        const description = (node.data.config as any).description;
        const initialValue = (node.data.config as any).initialValue;
        
        if (inputType === 'text') {
          // For text input, use textValue first, then fallback to other values
          output = textValue || data || initialValue || description || "Workflow started";
          console.log(`Input Node (Text) - Using text input: ${output?.substring(0, 100)}...`);
        } else if (inputType === 'file') {
          // For file input, use processedText first, then fallback to other values
          output = processedText || data || description || "No file uploaded";
          console.log(`Input Node (File) - Using file data: ${output?.substring(0, 100)}...`);
        } else {
          // Fallback for legacy nodes without inputType
          output = processedText || data || textValue || initialValue || description || "Workflow started";
          console.log(`Input Node (Legacy) - Using legacy data: ${output?.substring(0, 100)}...`);
        }
        break;
        
      case 'prompt':
        const promptTemplate = (node.data.config as any).prompt || "Default prompt";
        const processedPrompt = this.processTemplate(promptTemplate);
        const model = (node.data.config as any).model || 'gemini-1.5-flash';
        
        console.log(`Prompt Node - Calling Gemini API with prompt: ${processedPrompt}`);
        console.log(`Using model: ${model}`);
        
        try {
          const geminiResponse = await callGeminiAPI(processedPrompt, model);
          
          if (geminiResponse.success) {
            output = geminiResponse.text;
            console.log(`Gemini API Success - Response: ${output}`);
          } else {
            output = `Error from Gemini API: ${geminiResponse.error}`;
            console.error(`Gemini API Error: ${geminiResponse.error}`);
          }
        } catch (error) {
          output = `Failed to call Gemini API: ${error instanceof Error ? error.message : 'Unknown error'}`;
          console.error(`Gemini API Exception:`, error);
        }
        break;
        
      case 'api':
        const urlTemplate = (node.data.config as any).url || "https://api.example.com";
        const processedUrl = this.processTemplate(urlTemplate);
        const method = (node.data.config as any).method || "GET";
        output = `API Response from ${method} ${processedUrl}`;
        console.log(`API Node - Calling: ${method} ${processedUrl}`);
        break;
        
      case 'logic':
        const conditionTemplate = (node.data.config as any).condition || "{{input}}";
        const processedCondition = this.processTemplate(conditionTemplate);
        const compareValue = (node.data.config as any).compareValue || "";
        const operator = (node.data.config as any).operator || "equals";
        const result = this.evaluateCondition(processedCondition, compareValue, operator);
        output = { condition: processedCondition, result, compareValue, operator };
        console.log(`Logic Node - Comparing: "${processedCondition}" ${operator} "${compareValue}" = ${result}`);
        break;
        
      case 'output':
        const format = (node.data.config as any).format || "json";
        
        // Format the output based on the selected format
        switch (format) {
          case 'json':
            try {
              // If currentInput is already a string, try to parse it as JSON for pretty printing
              const jsonData = typeof currentInput === 'string' ? currentInput : JSON.stringify(currentInput, null, 2);
              output = {
                format: 'json',
                data: jsonData,
                timestamp: new Date().toISOString(),
                preview: jsonData.substring(0, 200) + (jsonData.length > 200 ? '...' : '')
              };
            } catch (e) {
              output = {
                format: 'json',
                data: currentInput,
                timestamp: new Date().toISOString(),
                preview: String(currentInput).substring(0, 200) + (String(currentInput).length > 200 ? '...' : '')
              };
            }
            break;
          
          case 'text':
            output = {
              format: 'text',
              data: String(currentInput),
              timestamp: new Date().toISOString(),
              preview: String(currentInput).substring(0, 200) + (String(currentInput).length > 200 ? '...' : '')
            };
            break;
          
          case 'csv':
            // Simple CSV conversion for basic data
            const csvData = typeof currentInput === 'object' ? 
              JSON.stringify(currentInput).replace(/[{}"]/g, '').replace(/:/g, ',') : 
              String(currentInput);
            output = {
              format: 'csv',
              data: csvData,
              timestamp: new Date().toISOString(),
              preview: csvData.substring(0, 200) + (csvData.length > 200 ? '...' : '')
            };
            break;
          
          default:
            output = {
              format: format,
              data: currentInput,
              timestamp: new Date().toISOString(),
              preview: String(currentInput).substring(0, 200) + (String(currentInput).length > 200 ? '...' : '')
            };
        }
        
        console.log(`Output Node - Formatted as ${format}:`, output);
        break;
        
      default:
        output = currentInput;
    }
    
    this.setNodeOutput(node.id, output);
    console.log(`Output: ${typeof output === 'object' ? JSON.stringify(output) : output}`);
    console.log(`=== END NODE ===\n`);
    
    return output;
  }

  private evaluateCondition(value: any, compareValue: any, operator: string): boolean {
    switch (operator) {
      case 'equals': return value === compareValue;
      case 'notEquals': return value !== compareValue;
      case 'greaterThan': return Number(value) > Number(compareValue);
      case 'lessThan': return Number(value) < Number(compareValue);
      case 'greaterThanOrEqual': return Number(value) >= Number(compareValue);
      case 'lessThanOrEqual': return Number(value) <= Number(compareValue);
      case 'contains': return String(value).includes(String(compareValue));
      default: return false;
    }
  }

  executeLogicNode(node: WorkflowNode): LogicResult {
    const conditionTemplate = (node.data.config as any).condition || "{{input}}";
    const processedCondition = this.processTemplate(conditionTemplate);
    const compareValue = (node.data.config as any).compareValue || "";
    const operator = (node.data.config as any).operator || "equals";
    const result = this.evaluateCondition(processedCondition, compareValue, operator);
    
    console.log(`Logic evaluation: "${processedCondition}" ${operator} "${compareValue}" = ${result}`);
    
    return {
      result,
      nextPath: result ? 'true' : 'false'
    };
  }
}

async function executeWorkflow(nodes: WorkflowNode[], edges: WorkflowEdge[]) {
  const executor = new WorkflowExecutor();
  
  console.log(`Starting workflow execution with ${nodes.length} nodes and ${edges.length} edges`);
  
  const startNode = nodes.find(node => node.type === 'input');
  if (!startNode) {
    throw new Error('No input node found');
  }

  // Execute workflow with branching logic
  const executedNodes = await executeWithBranching(executor, nodes, edges, startNode.id);
  
  console.log(`\nWorkflow execution completed. Executed ${executedNodes.length} nodes.`);
  console.log(`Final context:`, executor.getContext());
  
  return executor.getContext();
}

async function executeWithBranching(
  executor: WorkflowExecutor, 
  nodes: WorkflowNode[], 
  edges: WorkflowEdge[], 
  startNodeId: string
): Promise<string[]> {
  const executedNodes: string[] = [];
  const visited = new Set<string>();
  
  async function executeNodeChain(nodeId: string) {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);
    
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    
    await executor.executeNode(node);
    executedNodes.push(nodeId);
    
    const outgoingEdges = edges.filter(edge => edge.source === nodeId);
    
    if (node.type === 'logic') {
      const logicResult = executor.executeLogicNode(node);
      const expectedHandle = logicResult.result ? 'true' : 'false';
      
      console.log(`Logic node ${nodeId} evaluated to ${logicResult.result}, taking "${expectedHandle}" path`);
      
      const targetEdge = outgoingEdges.find(edge => edge.sourceHandle === expectedHandle);
      
      if (targetEdge) {
        console.log(`Following edge to node: ${targetEdge.target}`);
        await executeNodeChain(targetEdge.target);
      } else {
        console.log(`No edge found for "${expectedHandle}" path from logic node ${nodeId}`);
      }
    } else {
      for (const edge of outgoingEdges) {
        await executeNodeChain(edge.target);
      }
    }
  }
  
  await executeNodeChain(startNodeId);
  return executedNodes;
}

export async function POST(request: NextRequest) {
  try {
    const { nodes, edges } = await request.json();
    
    if (!nodes || !Array.isArray(nodes)) {
      return NextResponse.json({ error: 'Invalid nodes data' }, { status: 400 });
    }
    
    if (!edges || !Array.isArray(edges)) {
      return NextResponse.json({ error: 'Invalid edges data' }, { status: 400 });
    }

    const result = await executeWorkflow(nodes, edges);
    
    return NextResponse.json({
      success: true,
      result,
      executedNodes: nodes.length,
      totalEdges: edges.length
    })
    
  } catch (error) {
    console.error('Workflow execution error:', error);
    return NextResponse.json(
      { error: 'Workflow execution failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

