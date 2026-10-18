import { useEffect, useState } from 'react'
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { ApiError, fetchUser } from './api/mockDatabase'
import { clearSession, readSessionUserId, saveSession } from './auth/session'
import type { User } from './models/users'
import { useCalendarData } from './calendar/useCalendarData'
import { useFavourites } from './hooks/useFavourites'
import { useServices } from './hooks/useServices'
import Sidebar from './components/Sidebar'
import Calendar from './pages/Calendar'
import Home from './pages/Home'
import Lectures from './pages/Lectures'
import Timesheets from './pages/Timesheets'
import Profile from './pages/Profile'
import QuickLinks from './pages/QuickLinks'
import SignIn from './pages/SignIn'
import './App.css'

function App() {
  const navigate = useNavigate()
  const [session, setSession] = useState<{ user: User | null; restoring: boolean; error: string }>(() => {
    try {
      return { user: null, restoring: readSessionUserId() !== null, error: '' }
    } catch (error) {
      console.error('Unable to restore demo session:', error)
      return { user: null, restoring: false, error: 'Unable to restore your session. Please allow browser session storage and sign in again.' }
    }
  })

  useEffect(() => {
    if (!session.restoring) return
    let cancelled = false
    const userId = readSessionUserId()
    if (!userId) return
    fetchUser(userId)
      .then((user) => {
        if (!cancelled) setSession({ user, restoring: false, error: '' })
      })
      .catch((error: unknown) => {
        console.error('Unable to restore demo session:', error)
        if (cancelled) return
        if (error instanceof ApiError && error.status === 404) {
          try { clearSession() } catch { /* sign-in will overwrite the stale session */ }
        }
        setSession({ user: null, restoring: false, error: 'Unable to restore your session. Please sign in again.' })
      })
    return () => { cancelled = true }
  }, [session.restoring])

  function signIn(user: User) {
    saveSession(user)
    setSession({ user, restoring: false, error: '' })
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
    setSession({ user: null, restoring: false, error: message })
    navigate('/sign-in', { replace: true })
  }

  const user = session.user
  if (session.restoring) {
    return <p className="app-loading" role="status">Restoring your session…</p>
  }
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
  const catalogue = useServices(user.id)
  return (
    <div className="app-layout">
      <Sidebar user={user} />
      <main className="app-content">
        <Routes>
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="/home" element={<Home user={user} calendar={calendar} favourites={favourites} catalogue={catalogue} />} />
          <Route path="/calendar" element={<Calendar calendar={calendar} />} />
          <Route path="/quick-links" element={<QuickLinks favourites={favourites} catalogue={catalogue} />} />
          <Route
            path="/lectures"
            element={user.roles.includes('professor') ? <Lectures user={user} /> : <Navigate to="/home" replace />}
          />
          <Route
            path="/timesheets"
            element={user.roles.includes('tutor') ? <Timesheets user={user} /> : <Navigate to="/home" replace />}
          />
          <Route path="/profile" element={<Profile user={user} onSignOut={onSignOut} />} />
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
