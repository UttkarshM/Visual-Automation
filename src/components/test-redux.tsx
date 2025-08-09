"use client"

import { useAppSelector, useAppDispatch } from '@/store/hooks'
import { addNode } from '@/store/nodesSlice'
import { Button } from '@/components/ui/button'

export function TestRedux() {
  const dispatch = useAppDispatch()
  const { nodes } = useAppSelector((state) => state.nodes)

  const handleAddTestNode = () => {
    const testNode = {
      id: `test_${Date.now()}`,
      type: 'input',
      position: { x: 100, y: 100 },
      data: {
        label: 'Test Node',
        config: { name: 'Test Node', description: 'This is a test' }
      }
    }
    dispatch(addNode(testNode))
  }

  return (
    <div className="p-4">
      <h2>Redux Test</h2>
      <Button onClick={handleAddTestNode}>Add Test Node</Button>
      <p>Current nodes count: {nodes.length}</p>
      <pre>{JSON.stringify(nodes, null, 2)}</pre>
    </div>
  )
}

