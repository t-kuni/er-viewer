import React, { useState } from 'react'
import ERCanvas from './ERCanvas'
import BuildInfoModal from './BuildInfoModal'
import { RectanglePropertyPanel } from './RectanglePropertyPanel'
import { useERViewModel } from '../store/hooks'

function App() {
  const [showBuildInfo, setShowBuildInfo] = useState(false)
  const [selectedRectangleId, setSelectedRectangleId] = useState<string | null>(null)
  
  // 選択された矩形の数を取得
  const rectangles = useERViewModel((vm) => vm.rectangles)
  const selectedRectangleIds = Object.keys(rectangles).filter(id => 
    selectedRectangleId === id
  )
  
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
          onClick={() => setShowBuildInfo(true)}
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
          <ERCanvas onSelectionChange={setSelectedRectangleId} />
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
        <BuildInfoModal onClose={() => setShowBuildInfo(false)} />
      )}
    </div>
  )
}

export default App
