function App() {
  return (
    <div style={{
      boxSizing: 'border-box',
      width: '100vw',
      height: '100dvh', // dynamic viewport height for mobile browser URL bar and status bar
      padding: 'max(12px, env(safe-area-inset-top, 12px)) max(12px, env(safe-area-inset-right, 12px)) max(12px, env(safe-area-inset-bottom, 12px)) max(12px, env(safe-area-inset-left, 12px))',
      backgroundColor: '#0a0b10',
      display: 'flex',
    }}>
      <div style={{
        boxSizing: 'border-box',
        width: '100%',
        height: '100%',
        border: '3px solid #8b5cf6', // electric purple
        borderRadius: '16px',
        boxShadow: '0 0 20px rgba(139, 92, 246, 0.4), inset 0 0 20px rgba(139, 92, 246, 0.2)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#f8fafc',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        userSelect: 'none',
      }}>
        <div style={{
          fontSize: '0.8rem',
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          color: '#a78bfa',
          marginBottom: '8px'
        }}>
          Safe Area &bull; Cross-Platform Viewport
        </div>
        <h1 style={{ fontSize: '2.5rem', margin: 0, fontWeight: 800, color: '#ffffff' }}>
          hello world v1
        </h1>
        <div style={{
          marginTop: '12px',
          fontSize: '0.85rem',
          color: '#64748b'
        }}>
          Web &bull; Android APK &bull; Desktop EXE
        </div>
      </div>
    </div>
  )
}

export default App
