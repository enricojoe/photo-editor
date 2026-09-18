import { EditorProvider } from './state/EditorContext'
import { Toolbar } from './components/Toolbar'
import { HeaderExport } from './components/HeaderExport'
import { HistoryControls } from './components/HistoryControls'
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
            <div className="app__header-actions">
              <HistoryControls />
              <HeaderExport />
            </div>
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
