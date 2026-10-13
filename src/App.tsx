import { useState } from 'react'
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { clearSession, readSession, saveSession } from './auth/session'
import type { User } from './data/users'
import { useCalendarData } from './calendar/useCalendarData'
import { useFavourites } from './hooks/useFavourites'
import Sidebar from './components/Sidebar'
import Calendar from './pages/Calendar'
import Home from './pages/Home'
import Profile from './pages/Profile'
import QuickLinks from './pages/QuickLinks'
import SignIn from './pages/SignIn'
import './App.css'

function App() {
  const navigate = useNavigate()
  const [session, setSession] = useState<{ user: User | null; error: string }>(() => {
    try {
      return { user: readSession(), error: '' }
    } catch (error) {
      console.error('Unable to restore demo session:', error)
      return { user: null, error: 'Unable to restore your session. Please allow browser session storage and sign in again.' }
    }
  })

  function signIn(user: User) {
    saveSession(user)
    setSession({ user, error: '' })
    navigate('/home', { replace: true })
  }

  function signOut() {
    let message = ''
    try {
      clearSession()
    } catch (error) {
      console.error('Unable to clear demo session:', error)
      message = 'Browser session storage could not be cleared. Close this tab to fully end your demo session.'
    }
    setSession({ user: null, error: message })
    navigate('/sign-in', { replace: true })
  }

  const user = session.user
  if (!user) {
    return (
      <Routes>
        <Route path="/sign-in" element={<SignIn onSignIn={signIn} sessionError={session.error} />} />
        <Route path="*" element={<Navigate to="/sign-in" replace />} />
      </Routes>
    )
  }

  return <Portal key={user.id} user={user} onSignOut={signOut} />
}

function Portal({ user, onSignOut }: { user: User; onSignOut: () => void }) {
  const calendar = useCalendarData(user.id)
  const favourites = useFavourites(user.id)
  return (
    <div className="app-layout">
      <Sidebar user={user} />
      <main className="app-content">
        <Routes>
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="/home" element={<Home user={user} calendar={calendar} favourites={favourites} />} />
          <Route path="/calendar" element={<Calendar calendar={calendar} />} />
          <Route path="/quick-links" element={<QuickLinks favourites={favourites} user={user} />} />
          <Route path="/profile" element={<Profile user={user} onSignOut={onSignOut} />} />
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
