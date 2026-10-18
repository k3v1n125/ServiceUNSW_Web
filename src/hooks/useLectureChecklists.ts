import { useEffect, useState } from 'react'
import { readUserRecord, writeUserRecord } from '../api/mockDatabase'
import { parseLectureChecklists } from '../data/lectures'
import type { LectureChecklists } from '../data/lectures'

export function useLectureChecklists(userId: string) {
  const [state, setState] = useState<{
    checklists: LectureChecklists
    loading: boolean
    saving: boolean
    loadFailed: boolean
    error: string
  }>({ checklists: {}, loading: true, saving: false, loadFailed: false, error: '' })

  useEffect(() => {
    let cancelled = false
    readUserRecord(userId, 'lecture-checklists')
      .then((value) => {
        if (!cancelled) {
          setState({
            checklists: parseLectureChecklists(value),
            loading: false,
            saving: false,
            loadFailed: false,
            error: '',
          })
        }
      })
      .catch((error: unknown) => {
        console.error('Unable to load lecture checklists:', error)
        if (!cancelled) {
          setState({
            checklists: {},
            loading: false,
            saving: false,
            loadFailed: true,
            error: 'Unable to load lecture checklists from the mock database. Refresh the page and try again.',
          })
        }
      })
    return () => { cancelled = true }
  }, [userId])

  async function save(checklists: LectureChecklists): Promise<boolean> {
    if (state.loading || state.saving || state.loadFailed) return false
    setState((previous) => ({ ...previous, saving: true }))
    try {
      const saved = parseLectureChecklists(await writeUserRecord(userId, 'lecture-checklists', checklists))
      setState({ checklists: saved, loading: false, saving: false, loadFailed: false, error: '' })
      return true
    } catch (error) {
      console.error('Unable to save lecture checklists:', error)
      setState((previous) => ({
        ...previous,
        saving: false,
        error: 'Unable to save lecture checklist changes to the mock database. Try again.',
      }))
      return false
    }
  }

  return { ...state, save }
}
