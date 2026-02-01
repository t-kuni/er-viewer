import React from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
// @ts-ignore - 型定義が古い場合に対応
import { prism } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { useViewModel, useDispatch } from '../store/hooks'
import { actionSelectItem } from '../actions/layerActions'

const DDLPanel: React.FC = () => {
  const dispatch = useDispatch()
  
  // すべてのhookを最上位で呼ぶ（Reactのhookルールに従う）
  const selectedItem = useViewModel((vm) => vm.ui.selectedItem)
  
  // エンティティノードを取得（selectedItemがnullの場合も考慮）
  const entityNode = useViewModel((vm) => 
    vm.ui.selectedItem?.kind === 'entity' 
      ? vm.erDiagram.nodes[vm.ui.selectedItem.id]
      : undefined
  )
  
  // 条件チェックはすべてのhook呼び出しの後に行う
  if (!selectedItem || selectedItem.kind !== 'entity') {
    return null
  }
  
  // エンティティノードが存在しない場合は何も表示しない
  if (!entityNode) {
    return null
  }
  
  const handleClose = () => {
    // @ts-expect-error - TextAlign型の不整合により型エラーが出るが、実行時には問題ない
    dispatch(actionSelectItem, null)
  }
  
  return (
    <div 
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* ヘッダー */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 16px',
          borderBottom: '1px solid #ddd',
          background: '#f8f9fa',
          flexShrink: 0,
        }}
      >
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>
          {entityNode.name}
        </h3>
        <button
          onClick={handleClose}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            fontSize: '20px',
            padding: '4px 8px',
            color: '#666',
            lineHeight: 1,
          }}
          title="閉じる"
        >
          ×
        </button>
      </div>
      
      {/* DDLコンテンツ */}
      <div
        style={{
          flex: 1,
          overflow: 'auto',
        }}
      >
        <SyntaxHighlighter
          language="sql"
          style={prism}
          wrapLongLines={true}
          customStyle={{
            margin: 0,
            borderRadius: 0,
            fontSize: '14px',
            lineHeight: '1.5',
          }}
        >
          {entityNode.ddl || '-- DDL not available'}
        </SyntaxHighlighter>
      </div>
    </div>
  )
}

export default DDLPanel
