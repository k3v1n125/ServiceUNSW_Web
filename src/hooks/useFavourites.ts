import { useState } from 'react'
import { readFavourites, saveFavourites } from '../data/favourites'

export function useFavourites(userId: string) {
  const [state, setState] = useState<{ ids: string[]; error: string }>(() => {
    try {
      return { ids: readFavourites(userId, localStorage), error: '' }
    } catch (error) {
      console.error('Unable to load favourites:', error)
      return { ids: [], error: 'Unable to load your favourites. Use Manage favourites to choose and save them again.' }
    }
  })

  function save(ids: string[]): boolean {
    try {
      saveFavourites(userId, ids, localStorage)
      setState({ ids: [...ids], error: '' })
      return true
    } catch (error) {
      console.error('Unable to save favourites:', error)
      setState((previous) => ({ ...previous, error: 'Unable to save favourites. Check browser storage permissions and try again.' }))
      return false
    }
  }

  return { ...state, save }
}

export type FavouritesState = ReturnType<typeof useFavourites>
