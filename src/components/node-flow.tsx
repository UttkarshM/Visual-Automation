"use client"

import { useAppSelector } from '@/store/hooks'

export function NodeFlow() {
  const { nodes, edges } = useAppSelector((state) => state.nodes)

  return (
    <div className="p-4">
      <h2>Node Flow</h2>
      <ul>
        {nodes.map((node) => (
          <li key={node.id}>
            <strong>{node.data.label}</strong>
            <ul>
              {edges
                .filter(edge => edge.source === node.id)
                .map(edge => {
                  const targetNode = nodes.find(n => n.id === edge.target)
                  return (
                    <li key={edge.id}>to {targetNode ? targetNode.data.label : 'Unknown'}</li>
                  )
                })}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  )
}

