import { useEffect, useState } from 'react'
import { readUserRecord, writeUserRecord } from '../api/mockDatabase'
import { parseFavourites, validateFavourites } from '../data/favourites'

export function useFavourites(userId: string) {
  const [state, setState] = useState<{ ids: string[]; loading: boolean; saving: boolean; error: string }>({
    ids: [],
    loading: true,
    saving: false,
    error: '',
  })

  useEffect(() => {
    let cancelled = false
    readUserRecord(userId, 'favourites')
      .then((value) => {
        if (!cancelled) setState({ ids: parseFavourites(value), loading: false, saving: false, error: '' })
      })
      .catch((error: unknown) => {
        console.error('Unable to load favourites:', error)
        if (!cancelled) {
          setState({
            ids: [],
            loading: false,
            saving: false,
            error: 'Unable to load your favourites from the mock database. Refresh the page and try again.',
          })
        }
      })
    return () => { cancelled = true }
  }, [userId])

  async function save(ids: string[]): Promise<boolean> {
    setState((previous) => ({ ...previous, saving: true, error: '' }))
    try {
      const saved = validateFavourites(await writeUserRecord(userId, 'favourites', validateFavourites(ids)))
      setState({ ids: [...saved], loading: false, saving: false, error: '' })
      return true
    } catch (error) {
      console.error('Unable to save favourites:', error)
      setState((previous) => ({
        ...previous,
        saving: false,
        error: 'Unable to save favourites to the mock database. Try again.',
      }))
      return false
    }
  }

  return { ...state, save }
}

export type FavouritesState = ReturnType<typeof useFavourites>
