import React from 'react'
import ERCanvas from './ERCanvas'
import BuildInfoModal from './BuildInfoModal'
import { RectanglePropertyPanel } from './RectanglePropertyPanel'
import { useViewModel, useDispatch } from '../store/hooks'
import { actionShowBuildInfoModal, actionHideBuildInfoModal, actionSelectRectangle, actionDeselectRectangle } from '../actions/globalUIActions'

function App() {
  const dispatch = useDispatch()
  
  // Storeから状態を取得
  const selectedRectangleId = useViewModel((vm) => vm.ui.selectedRectangleId)
  const showBuildInfo = useViewModel((vm) => vm.ui.showBuildInfoModal)
  
  // 選択変更ハンドラ
  const handleSelectionChange = (rectangleId: string | null) => {
    if (rectangleId === null) {
      dispatch(actionDeselectRectangle)
    } else {
      dispatch(actionSelectRectangle, rectangleId)
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
      </header>
      <main style={{ 
        display: 'flex', 
        height: 'calc(100vh - 70px)' 
      }}>
        <div style={{ 
          flex: 1, 
          position: 'relative' 
        }}>
          <ERCanvas onSelectionChange={handleSelectionChange} />
        </div>
        {selectedRectangleId && (
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
            <RectanglePropertyPanel rectangleId={selectedRectangleId} />
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
