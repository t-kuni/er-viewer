import React, { useEffect, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import ERCanvas from './ERCanvas'
import BuildInfoModal from './BuildInfoModal'
import DatabaseConnectionModal from './DatabaseConnectionModal'
import LayoutProgressBar from './LayoutProgressBar'
import { RectanglePropertyPanel } from './RectanglePropertyPanel'
import { TextPropertyPanel } from './TextPropertyPanel'
import { LayerPanel } from './LayerPanel'
import { useViewModel, useDispatch } from '../store/hooks'
import { actionShowBuildInfoModal, actionHideBuildInfoModal, actionShowDatabaseConnectionModal, actionHideDatabaseConnectionModal } from '../actions/globalUIActions'
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
  const viewModel = useViewModel((vm) => vm)
  const buildInfo = useViewModel((vm) => vm.buildInfo)
  const lastDatabaseConnection = useViewModel((vm) => vm.settings?.lastDatabaseConnection)
  const erDiagram = useViewModel((vm) => vm.erDiagram)
  const layoutOptimization = useViewModel((vm) => vm.ui.layoutOptimization)
  
  // エクスポートハンドラ
  const handleExport = () => {
    exportViewModel(viewModel)
  }
  
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
    noClick: true, // ヘッダー全体がクリック可能にならないように
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
  const isLayoutOptimizeDisabled = 
    erDiagram.loading || 
    layoutOptimization.isRunning || 
    Object.keys(erDiagram.nodes).length === 0 ||
    !nodesInitialized
  
  return (
    <div className="app">
      <header 
        {...getRootProps()}
        style={{ 
          padding: '1rem', 
          background: isDragActive ? '#444' : '#333', 
          color: 'white',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          transition: 'background 0.2s'
        }}
      >
        <input {...getInputProps()} />
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
        {selectedItem && (
          <div 
            style={{ 
              width: '300px', 
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
