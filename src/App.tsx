import { Navigate, Route, Routes } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Staff from './pages/Staff'
import Student from './pages/Student'
import UserSettings from './pages/UserSettings'
import './App.css'

function App() {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="app-content">
        <Routes>
          <Route path="/" element={<Navigate to="/student" replace />} />
          <Route path="/student" element={<Student />} />
          <Route path="/staff" element={<Staff />} />
          <Route path="/settings" element={<UserSettings />} />
        </Routes>
      </main>
    </div>
  )
}

export default App

