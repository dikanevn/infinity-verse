import { useState } from 'react'
import './App.css'

function App() {
  const [ticks, setTicks] = useState(0)

  return (
    <div className="container">
      <header className="header">
        <div className="badge">1000-YEAR AUTONOMOUS WORLD</div>
        <h1>INFINITY VERSE</h1>
        <p className="subtitle">Hello World v1 &bull; Cross-Platform Core</p>
      </header>

      <main className="content">
        <div className="card">
          <h2>Autonomous Grid (Preview)</h2>
          <div className="grid-preview">
            <div className="grid-cell">0</div>
            <div className="grid-cell active-player">1 (You)</div>
            <div className="grid-cell">0</div>
            <div className="grid-cell">0</div>
            <div className="grid-cell active-npc">2 (NPC)</div>
            <div className="grid-cell">0</div>
            <div className="grid-cell">0</div>
            <div className="grid-cell">0</div>
            <div className="grid-cell">0</div>
          </div>
          <button className="btn-tick" onClick={() => setTicks(t => t + 1)}>
            Simulate Pulse (Ticks: {ticks})
          </button>
        </div>

        <div className="platforms-status">
          <h3>Target Targets:</h3>
          <div className="badges">
            <span className="pill web">🌐 Web (GH Pages)</span>
            <span className="pill apk">📱 Android (APK)</span>
            <span className="pill exe">💻 Desktop (EXE)</span>
          </div>
        </div>
      </main>

      <footer className="footer">
        <p>Base Sepolia Ready &bull; VerseState &harr; VerseLogic</p>
      </footer>
    </div>
  )
}

export default App
