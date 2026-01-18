import React, { useState } from 'react'
import ERCanvas from './ERCanvas'
import BuildInfoModal from './BuildInfoModal'

function App() {
  const [showBuildInfo, setShowBuildInfo] = useState(false)
  
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
      <main style={{ height: 'calc(100vh - 70px)' }}>
        <ERCanvas />
      </main>
      {showBuildInfo && (
        <BuildInfoModal onClose={() => setShowBuildInfo(false)} />
      )}
    </div>
  )
}

export default App
