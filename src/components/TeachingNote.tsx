import { useEffect, useState } from 'react'
import type { SubmitEvent } from 'react'
import { readUserRecord, writeUserRecord } from '../api/mockDatabase'

function parseTeachingNote(value: unknown): string {
  if (value === null) return ''
  if (typeof value !== 'object' || Array.isArray(value) || !('note' in value) || typeof value.note !== 'string') {
    throw new Error('Teaching note returned by the mock API is invalid.')
  }
  return value.note
}

function TeachingNote({ userId }: { userId: string }) {
  const [state, setState] = useState({ note: '', loading: true, saving: false, loadFailed: false, error: '' })
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  useEffect(() => {
    let cancelled = false
    readUserRecord(userId, 'teaching-note')
      .then((value) => {
        if (!cancelled) {
          setState({ note: parseTeachingNote(value), loading: false, saving: false, loadFailed: false, error: '' })
        }
      })
      .catch((error: unknown) => {
        console.error('Unable to load teaching note:', error)
        if (!cancelled) {
          setState({
            note: '',
            loading: false,
            saving: false,
            loadFailed: true,
            error: 'Unable to load your teaching note from the mock database. Refresh the page and try again.',
          })
        }
      })
    return () => { cancelled = true }
  }, [userId])

  function startEditing() {
    setDraft(state.note)
    setState((previous) => ({ ...previous, error: '' }))
    setEditing(true)
  }

  function cancelEditing() {
    setEditing(false)
    setState((previous) => ({ ...previous, error: '' }))
  }

  async function save(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    setState((previous) => ({ ...previous, saving: true, error: '' }))
    try {
      const note = parseTeachingNote(await writeUserRecord(userId, 'teaching-note', { note: draft.trim() }))
      setState({ note, loading: false, saving: false, loadFailed: false, error: '' })
      setEditing(false)
    } catch (error) {
      console.error('Unable to save teaching note:', error)
      setState((previous) => ({
        ...previous,
        saving: false,
        error: error instanceof Error ? error.message : 'Unable to save your teaching note. Try again.',
      }))
    }
  }

  return (
    <section className="lecture-teaching-note" aria-labelledby="teaching-note-title">
      <div className="lecture-teaching-note-header">
        <h2 id="teaching-note-title">Teaching note</h2>
        {!editing && (
          <button
            type="button"
            className="lecture-teaching-note-edit"
            aria-label="Edit teaching note"
            title="Edit teaching note"
            onClick={startEditing}
            disabled={state.loading || state.loadFailed}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
          </button>
        )}
      </div>
      {editing ? (
        <form onSubmit={save}>
          <textarea
            id="teaching-note"
            aria-labelledby="teaching-note-title"
            rows={4}
            maxLength={5000}
            value={draft}
            disabled={state.saving}
            placeholder="Add a reminder for your teaching..."
            onChange={(event) => setDraft(event.target.value)}
            autoFocus
          />
          <div className="lecture-teaching-note-actions">
            <button type="submit" className="lecture-teaching-note-save" disabled={state.saving}>
              {state.saving ? 'Saving…' : 'Save'}
            </button>
            <button type="button" onClick={cancelEditing} disabled={state.saving}>Cancel</button>
          </div>
        </form>
      ) : state.loading ? (
        <p role="status">Loading teaching note…</p>
      ) : !state.loadFailed && (
        <p className={state.note ? undefined : 'lecture-teaching-note-empty'}>
          {state.note || 'No teaching note yet. Select Edit to add one.'}
        </p>
      )}
      {state.error && <p className="lecture-teaching-note-error" role="alert">{state.error}</p>}
    </section>
  )
}

export default TeachingNote
