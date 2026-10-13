import { useState } from 'react'
import type { SubmitEvent } from 'react'
import { authenticate } from '../auth/session'
import type { User } from '../data/users'
import myunswLogo from '../assets/myunsw.png'
import './SignIn.css'

function SignIn({ onSignIn, sessionError }: {
  onSignIn: (user: User) => void
  sessionError: string
}) {
  const [zid, setZid] = useState('')
  const [zPass, setZPass] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    const user = authenticate(zid, zPass)
    if (!user) {
      setError('Incorrect zID or zPass. Please try again.')
      setZPass('')
      return
    }
    try {
      onSignIn(user)
    } catch (storageError) {
      console.error('Unable to save demo session:', storageError)
      setError('Unable to start your session. Please allow browser session storage and try again.')
      setZPass('')
    }
  }

  return (
    <main className="sign-in-page">
      <section className="sign-in-card" aria-labelledby="sign-in-title">
        <div className="sign-in-brand">
          <img src={myunswLogo} alt="UNSW crest" />
          <span>ServiceUNSW</span>
        </div>
        <h1 id="sign-in-title">Sign in</h1>
        <p>Access your university workspace with your zID and zPass.</p>
        <form onSubmit={handleSubmit}>
          <label htmlFor="zid">zID</label>
          <input
            id="zid"
            name="zid"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            pattern="[zZ][0-9]{7}"
            title="Enter z followed by seven digits."
            value={zid}
            onChange={(event) => setZid(event.target.value)}
            required
            aria-describedby={error ? 'sign-in-error' : undefined}
            aria-invalid={!!error}
          />
          <label htmlFor="zpass">zPass</label>
          <input
            id="zpass"
            name="zpass"
            type="password"
            autoComplete="current-password"
            value={zPass}
            onChange={(event) => setZPass(event.target.value)}
            required
            aria-describedby={error ? 'sign-in-error' : undefined}
            aria-invalid={!!error}
          />
          {(error || sessionError) && <p id="sign-in-error" className="sign-in-error" role="alert">{error || sessionError}</p>}
          <button type="submit">Sign in</button>
        </form>
        <p className="sign-in-demo">
          Demo only. Use a test zID from z2460811 to z2460815 with zPass <strong>Password</strong>.
          Do not enter your real UNSW credentials.
        </p>
      </section>
    </main>
  )
}

export default SignIn
