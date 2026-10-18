import { useEffect, useState } from 'react'
import { fetchServiceCatalogue } from '../api/mockDatabase'
import type { ServiceCatalogue } from '../models/services'

export function useServices(userId: string) {
  const [state, setState] = useState<ServiceCatalogue & { loading: boolean; error: string }>({
    groups: [],
    services: [],
    loading: true,
    error: '',
  })

  useEffect(() => {
    let cancelled = false
    fetchServiceCatalogue(userId)
      .then((catalogue) => {
        if (!cancelled) setState({ ...catalogue, loading: false, error: '' })
      })
      .catch((error: unknown) => {
        console.error('Unable to load services:', error)
        if (!cancelled) {
          setState({ groups: [], services: [], loading: false, error: 'Unable to load university services. Refresh the page and try again.' })
        }
      })
    return () => { cancelled = true }
  }, [userId])

  return state
}

export type ServicesState = ReturnType<typeof useServices>
