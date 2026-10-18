import { useEffect, useState } from 'react'
import { fetchLecturePlan } from '../api/mockDatabase'
import type { LecturePlan } from '../models/lectures'

export function useLecturePlan(userId: string) {
  const [state, setState] = useState<LecturePlan & { loading: boolean; error: string }>({
    courses: [],
    sessions: [],
    loading: true,
    error: '',
  })

  useEffect(() => {
    let cancelled = false
    fetchLecturePlan(userId)
      .then((plan) => {
        if (!cancelled) setState({ ...plan, loading: false, error: '' })
      })
      .catch((error: unknown) => {
        console.error('Unable to load lecture plan:', error)
        if (!cancelled) {
          setState({ courses: [], sessions: [], loading: false, error: 'Unable to load your lecture plan. Refresh the page and try again.' })
        }
      })
    return () => { cancelled = true }
  }, [userId])

  return state
}
