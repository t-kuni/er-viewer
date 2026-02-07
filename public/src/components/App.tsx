import React, { useEffect, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import ERCanvas from './ERCanvas'
import BuildInfoModal from './BuildInfoModal'
import DatabaseConnectionModal from './DatabaseConnectionModal'
import LayoutProgressBar from './LayoutProgressBar'
import { RectanglePropertyPanel } from './RectanglePropertyPanel'
import { TextPropertyPanel } from './TextPropertyPanel'
import { LayerPanel } from './LayerPanel'
import { HistoryPanel } from './HistoryPanel'
import DDLPanel from './DDLPanel'
import { useViewModel, useDispatch } from '../store/hooks'
import { actionShowBuildInfoModal, actionHideBuildInfoModal, actionShowDatabaseConnectionModal, actionHideDatabaseConnectionModal, actionToggleHistoryPanel } from '../actions/globalUIActions'
import { actionSelectItem, actionToggleLayerPanel } from '../actions/layerActions'
import { actionSetViewModel } from '../actions/dataActions'
import { commandInitialize } from '../commands/initializeCommand'
import { commandReverseEngineer } from '../commands/reverseEngineerCommand'
import { commandLayoutOptimize } from '../commands/layoutOptimizeCommand'
import { erDiagramStore } from '../store/erDiagramStore'
import { exportViewModel } from '../utils/exportViewModel'
import { importViewModel } from '../utils/importViewModel'
import type { DatabaseConnectionState } from '../api/client'

function App() {
  const dispatch = useDispatch()
  const [dbConnectionError, setDbConnectionError] = useState<string | undefined>(undefined)
  const [nodesInitialized, setNodesInitialized] = useState<boolean>(false)
  
  // 初期化処理
  useEffect(() => {
    commandInitialize(dispatch)
  }, [])
  
  // Storeから状態を取得
  const selectedItem = useViewModel((vm) => vm.ui.selectedItem)
  const showBuildInfo = useViewModel((vm) => vm.ui.showBuildInfoModal)
  const showDatabaseConnectionModal = useViewModel((vm) => vm.ui.showDatabaseConnectionModal)
  const showLayerPanel = useViewModel((vm) => vm.ui.showLayerPanel)
  const showHistoryPanel = useViewModel((vm) => vm.ui.showHistoryPanel)
  const viewModel = useViewModel((vm) => vm)
  const buildInfo = useViewModel((vm) => vm.buildInfo)
  const lastDatabaseConnection = useViewModel((vm) => vm.settings?.lastDatabaseConnection)
  const erDiagram = useViewModel((vm) => vm.erDiagram)
  const layoutOptimization = useViewModel((vm) => vm.ui.layoutOptimization)
  
  // エクスポートハンドラ
  const handleExport = () => {
    exportViewModel(viewModel)
  }
  
  // キーボードショートカット（Ctrl+S / Cmd+S）でエクスポート
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isCtrlOrCmd = event.ctrlKey || event.metaKey
      if (isCtrlOrCmd && event.key === 's') {
        event.preventDefault()
        handleExport()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [viewModel])
  
  // インポートハンドラ
  const handleImport = async (files: File[]) => {
    if (files.length === 0) return
    
    try {
      const importedViewModel = await importViewModel(files[0], buildInfo)
      dispatch(actionSetViewModel, importedViewModel)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      alert(`インポートに失敗しました: ${errorMessage}`)
    }
  }
  
  // react-dropzoneの設定
  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop: handleImport,
    accept: {
      'application/json': ['.json']
    },
    noClick: true, // 画面全体がクリック可能にならないように
    noKeyboard: true,
  })
  
  // 選択変更ハンドラ
  const handleSelectionChange = (rectangleId: string | null) => {
    if (rectangleId === null) {
      dispatch(actionSelectItem, null)
    } else {
      dispatch(actionSelectItem, { kind: 'rectangle', id: rectangleId })
    }
  }
  
  // データベース接続モーダルの実行ハンドラ
  const handleDatabaseConnectionExecute = async (connectionInfo: DatabaseConnectionState, password: string) => {
    const result = await commandReverseEngineer(dispatch, erDiagramStore.getState, connectionInfo, password)
    
    if (result.success) {
      // 成功時はモーダルを閉じる
      dispatch(actionHideDatabaseConnectionModal)
      setDbConnectionError(undefined)
    } else {
      // 失敗時はエラーメッセージを設定（モーダルは開いたまま）
      setDbConnectionError(result.error)
    }
  }
  
  // データベース接続モーダルのキャンセルハンドラ
  const handleDatabaseConnectionCancel = () => {
    dispatch(actionHideDatabaseConnectionModal)
    setDbConnectionError(undefined)
  }
  
  // 配置最適化ボタンのハンドラ
  const handleLayoutOptimize = () => {
    commandLayoutOptimize(dispatch, erDiagramStore.getState)
  }
  
  // 配置最適化ボタンの有効/無効判定
  const hasValidNodeSize = Object.values(erDiagram.nodes).some(node => node.width > 0)
  const isLayoutOptimizeDisabled = 
    erDiagram.loading || 
    layoutOptimization.isRunning || 
    Object.keys(erDiagram.nodes).length === 0 ||
    !nodesInitialized ||
    !hasValidNodeSize
  
  return (
    <div className="app" {...getRootProps()}>
      <input {...getInputProps()} />
      {isDragActive && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(68, 68, 68, 0.9)',
          border: '3px dashed #fff',
          pointerEvents: 'none',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '24px',
          fontWeight: 'bold'
        }}>
          ファイルをドロップしてインポート
        </div>
      )}
      <header 
        style={{ 
          padding: '1rem', 
          background: '#333', 
          color: 'white',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <h1 style={{ margin: 0 }}>ER Diagram Viewer</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            onClick={() => dispatch(actionShowDatabaseConnectionModal)}
            style={{
              padding: '0.5rem 1rem',
              background: '#555',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            リバースエンジニア
          </button>
          <button 
            onClick={handleLayoutOptimize}
            disabled={isLayoutOptimizeDisabled}
            style={{
              padding: '0.5rem 1rem',
              background: isLayoutOptimizeDisabled ? '#888' : '#555',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isLayoutOptimizeDisabled ? 'not-allowed' : 'pointer',
              opacity: isLayoutOptimizeDisabled ? 0.6 : 1
            }}
          >
            配置最適化
          </button>
          <button 
            onClick={() => dispatch(actionToggleLayerPanel)}
            style={{
              padding: '0.5rem 1rem',
              background: showLayerPanel ? '#777' : '#555',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            レイヤー
          </button>
          <button 
            onClick={handleExport}
            style={{
              padding: '0.5rem 1rem',
              background: '#555',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            エクスポート
          </button>
          <button 
            onClick={open}
            style={{
              padding: '0.5rem 1rem',
              background: '#555',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            インポート
          </button>
          <button 
            onClick={() => dispatch(actionToggleHistoryPanel)}
            style={{
              padding: '0.5rem 1rem',
              background: showHistoryPanel ? '#777' : '#555',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            履歴
          </button>
          <button 
            onClick={() => dispatch(actionShowBuildInfoModal)}
            style={{
              padding: '0.5rem 1rem',
              background: '#555',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            ビルド情報
          </button>
        </div>
      </header>
      <main style={{ 
        display: 'flex', 
        height: 'calc(100vh - 70px)' 
      }}>
        {showLayerPanel && (
          <div style={{ 
            width: '250px', 
            background: '#f5f5f5', 
            borderRight: '1px solid #ddd', 
            overflowY: 'auto' 
          }}>
            <LayerPanel />
          </div>
        )}
        <div style={{ 
          flex: 1, 
          position: 'relative' 
        }}>
          <ERCanvas 
            onSelectionChange={handleSelectionChange}
            onNodesInitialized={setNodesInitialized}
          />
        </div>
        {showHistoryPanel && (
          <div style={{ 
            width: '350px', 
            background: '#f5f5f5', 
            borderLeft: '1px solid #ddd', 
            overflowY: 'auto' 
          }}>
            <HistoryPanel />
          </div>
        )}
        {selectedItem && (
          <div 
            style={{ 
              width: selectedItem.kind === 'entity' ? '420px' : '300px', 
              minWidth: selectedItem.kind === 'entity' ? '360px' : '300px',
              maxWidth: selectedItem.kind === 'entity' ? '50vw' : '300px',
              background: '#ffffff', 
              borderLeft: '1px solid #ddd', 
              overflowY: 'auto' 
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
          >
            {selectedItem.kind === 'rectangle' && (
              <RectanglePropertyPanel rectangleId={selectedItem.id} />
            )}
            {selectedItem.kind === 'text' && (
              <TextPropertyPanel textId={selectedItem.id} />
            )}
            {selectedItem.kind === 'entity' && (
              <DDLPanel />
            )}
          </div>
        )}
      </main>
      {showBuildInfo && (
        <BuildInfoModal onClose={() => dispatch(actionHideBuildInfoModal)} />
      )}
      {showDatabaseConnectionModal && (
        <DatabaseConnectionModal 
          onExecute={handleDatabaseConnectionExecute}
          onCancel={handleDatabaseConnectionCancel}
          initialValues={lastDatabaseConnection}
          errorMessage={dbConnectionError}
        />
      )}
      <LayoutProgressBar />
    </div>
  )
}

export default App
