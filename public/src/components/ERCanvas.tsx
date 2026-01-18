import React, { useState, useCallback } from 'react'
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  applyNodeChanges,
  applyEdgeChanges,
  OnNodesChange,
  OnEdgesChange,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { DefaultService } from '../api/client'
import EntityNode from './EntityNode'
import RelationshipEdge from './RelationshipEdge'

const nodeTypes = {
  entityNode: EntityNode,
}

const edgeTypes = {
  relationshipEdge: RelationshipEdge,
}

function ERCanvas() {
  const [nodes, setNodes] = useState<Node[]>([])
  const [edges, setEdges] = useState<Edge[]>([])
  const [loading, setLoading] = useState(false)
  
  const onNodesChange: OnNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  )
  
  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  )
  
  const handleReverseEngineer = async () => {
    setLoading(true)
    try {
      const response = await DefaultService.apiReverseEngineer()
      
      // エラーレスポンスのチェック
      if ('error' in response) {
        throw new Error(response.error)
      }
      
      // ERDataとLayoutDataをReact Flowのnodesとedgesにマッピング
      const newNodes: Node[] = response.erData.entities.map((entity: any) => {
        const layout = response.layoutData.entities[entity.id]
        return {
          id: entity.id,
          type: 'entityNode',
          position: { x: layout.x, y: layout.y },
          data: {
            id: entity.id,
            name: entity.name,
            columns: entity.columns,
            ddl: entity.ddl,
          },
        }
      })
      
      const newEdges: Edge[] = response.erData.relationships.map((rel: any, index: number) => ({
        id: `${rel.from}_${rel.fromColumn}_to_${rel.to}_${rel.toColumn}_${index}`,
        type: 'relationshipEdge',
        source: response.erData.entities.find((e: any) => e.name === rel.from)?.id || '',
        target: response.erData.entities.find((e: any) => e.name === rel.to)?.id || '',
        data: {
          fromColumn: rel.fromColumn,
          toColumn: rel.toColumn,
          constraintName: rel.constraintName,
        },
      }))
      
      setNodes(newNodes)
      setEdges(newEdges)
    } catch (error) {
      console.error('リバースエンジニアに失敗しました:', error)
      alert('リバースエンジニアに失敗しました')
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 10 }}>
        <button 
          onClick={handleReverseEngineer}
          disabled={loading}
          style={{
            padding: '0.5rem 1rem',
            background: loading ? '#ccc' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? '処理中...' : 'リバースエンジニア'}
        </button>
      </div>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
      >
        <Controls />
        <Background />
      </ReactFlow>
    </div>
  )
}

export default ERCanvas
