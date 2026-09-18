import { EditorProvider } from './state/EditorContext'
import { Toolbar } from './components/Toolbar'
import { ErrorBoundary } from './components/ErrorBoundary'
import { CanvasStage } from './features/canvas/CanvasStage'
import { ProjectManagerPanel } from './features/projects/ProjectManagerPanel'
import './App.css'

function App() {
  return (
    <ErrorBoundary>
      <EditorProvider>
        <div className="app">
          <header className="app__header">
            <h1>Photo Editor</h1>
          </header>
          <div className="app__body">
            <aside className="rail" aria-label="Tools and projects">
              <Toolbar />
              <ProjectManagerPanel />
            </aside>
            <main className="app__main">
              <CanvasStage />
            </main>
          </div>
        </div>
      </EditorProvider>
    </ErrorBoundary>
  )
}

export default App
