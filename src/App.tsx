import { Navigate, Route, Routes } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Calendar from './pages/Calendar'
import Home from './pages/Home'
import UserSettings from './pages/UserSettings'
import QuickLinks from './pages/QuickLinks'
import './App.css'

function App() {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="app-content">
        <Routes>
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="/home" element={<Home />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/quick-links" element={<QuickLinks />} />
          <Route path="/settings" element={<UserSettings />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
