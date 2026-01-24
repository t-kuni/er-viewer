import React from 'react'
import ERCanvas from './ERCanvas'
import BuildInfoModal from './BuildInfoModal'
import { RectanglePropertyPanel } from './RectanglePropertyPanel'
import { LayerPanel } from './LayerPanel'
import { useViewModel, useDispatch } from '../store/hooks'
import { actionShowBuildInfoModal, actionHideBuildInfoModal } from '../actions/globalUIActions'
import { actionSelectItem, actionToggleLayerPanel } from '../actions/layerActions'

function App() {
  const dispatch = useDispatch()
  
  // Storeから状態を取得
  const selectedItem = useViewModel((vm) => vm.ui.selectedItem)
  const showBuildInfo = useViewModel((vm) => vm.ui.showBuildInfoModal)
  const showLayerPanel = useViewModel((vm) => vm.ui.showLayerPanel)
  
  // 選択変更ハンドラ
  const handleSelectionChange = (rectangleId: string | null) => {
    if (rectangleId === null) {
      dispatch(actionSelectItem, null)
    } else {
      dispatch(actionSelectItem, { kind: 'rectangle', id: rectangleId })
    }
  }
  
  return (
    <div className="app">
      <header style={{ 
        padding: '1rem', 
        background: '#333', 
        color: 'white',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h1 style={{ margin: 0 }}>ER Diagram Viewer</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
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
          <ERCanvas onSelectionChange={handleSelectionChange} />
        </div>
        {selectedItem?.kind === 'rectangle' && (
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
            <RectanglePropertyPanel rectangleId={selectedItem.id} />
          </div>
        )}
      </main>
      {showBuildInfo && (
        <BuildInfoModal onClose={() => dispatch(actionHideBuildInfoModal)} />
      )}
    </div>
  )
}

export default App
