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
import { buildERDiagramViewModel } from '../utils/viewModelConverter'
import { convertToReactFlowNodes, convertToReactFlowEdges } from '../utils/reactFlowConverter'
import { HoverProvider } from '../contexts/HoverContext'
import type { components } from '../../../lib/generated/api-types'

type ERDiagramViewModel = components['schemas']['ERDiagramViewModel']

const nodeTypes = {
  entityNode: EntityNode,
}

const edgeTypes = {
  relationshipEdge: RelationshipEdge,
}

function ERCanvas() {
  const [nodes, setNodes] = useState<Node[]>([])
  const [edges, setEdges] = useState<Edge[]>([])
  const [viewModel, setViewModel] = useState<ERDiagramViewModel>({ nodes: {}, edges: {} })
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
      
      // ERDataとLayoutDataからERDiagramViewModelを構築
      const vm = buildERDiagramViewModel(response.erData, response.layoutData)
      setViewModel(vm)
      
      // ERDiagramViewModelをReact Flow形式に変換
      const newNodes = convertToReactFlowNodes(vm.nodes)
      const newEdges = convertToReactFlowEdges(vm.edges)
      
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
      <HoverProvider viewModel={viewModel}>
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
      </HoverProvider>
    </div>
  )
}

export default ERCanvas
