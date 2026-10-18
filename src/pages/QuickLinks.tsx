import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import ServiceIcon from '../components/ServiceIcon'
import ServiceCard from '../components/ServiceCard'
import { MAX_FAVOURITES } from '../data/favourites'
import { getServicesForUser, quickLinkServices, serviceGroups } from '../data/services'
import type { User } from '../data/users'
import type { FavouritesState } from '../hooks/useFavourites'
import './QuickLinks.css'

function FavouriteManager({ favourites, onClose }: { favourites: FavouritesState; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [draft, setDraft] = useState([...favourites.ids])
  useEffect(() => { dialog.current?.showModal() }, [])

  return (
    <dialog ref={dialog} className="favourites-dialog" aria-labelledby="favourites-title" onCancel={onClose} onClose={onClose}>
      <header>
        <h2 id="favourites-title">Manage favourites</h2>
        <button type="button" className="quick-button" onClick={onClose} aria-label="Close manage favourites">×</button>
      </header>
      <p id="favourites-hint">Choose up to {MAX_FAVOURITES} services to show on Home. Deselect one to choose another.</p>
      <p className="favourites-count" role="status">{draft.length} / {MAX_FAVOURITES} selected</p>
      <div className="favourites-options">
        {quickLinkServices.map((service) => {
          const selected = draft.includes(service.id)
          return (
            <label key={service.id}>
              <input type="checkbox" checked={selected} disabled={!selected && draft.length >= MAX_FAVOURITES}
                aria-describedby="favourites-hint"
                onChange={() => setDraft((previous) => selected
                  ? previous.filter((id) => id !== service.id)
                  : previous.length < MAX_FAVOURITES ? [...previous, service.id] : previous)} />
              <ServiceIcon icon={service.icon} tone={service.tone} />
              <span>{service.name}</span>
            </label>
          )
        })}
      </div>
      {favourites.error && <p className="quick-error" role="alert">{favourites.error}</p>}
      <div className="favourites-actions">
        <button type="button" className="quick-button" onClick={onClose}>Cancel</button>
        <button type="button" className="quick-button quick-button--active" disabled={favourites.saving} onClick={async () => {
          if (await favourites.save(draft)) onClose()
        }}>{favourites.saving ? 'Saving…' : 'Save favourites'}</button>
      </div>
    </dialog>
  )
}

function QuickLinks({ favourites, user }: { favourites: FavouritesState; user: User }) {
  const [search, setSearch] = useState('')
  const [favouritesOnly, setFavouritesOnly] = useState(false)
  const [managing, setManaging] = useState(false)
  const query = search.trim().toLowerCase()
  const services = getServicesForUser(user).filter((service) =>
    (!favouritesOnly || favourites.ids.includes(service.id)) &&
    `${service.name} ${service.description}`.toLowerCase().includes(query),
  )

  return (
    <div className="quick-links-page">
      <nav className="quick-breadcrumb" aria-label="Breadcrumb">
        <Link to="/home">My portal</Link><span aria-hidden="true">›</span><span aria-current="page">Quick links</span>
      </nav>
      <header className="quick-heading">
        <div>
          <h1>A shortcut to what you need</h1>
          <p>Your university services, all in one place. Choose favourites to keep them on Home.</p>
        </div>
        <button type="button" className="quick-button" disabled={favourites.loading} onClick={() => setManaging(true)}>☆ Manage favourites</button>
      </header>
      <div className="quick-toolbar">
        <input type="search" aria-label="Search university services" placeholder="Search university services"
          value={search} onChange={(event) => setSearch(event.target.value)} />
        <button type="button" className={`quick-button${favouritesOnly ? '' : ' quick-button--active'}`}
          aria-pressed={!favouritesOnly} onClick={() => setFavouritesOnly(false)}>All services</button>
        <button type="button" className={`quick-button${favouritesOnly ? ' quick-button--active' : ''}`}
          aria-pressed={favouritesOnly} onClick={() => setFavouritesOnly(true)}>☆ Favourites</button>
        <span className="quick-service-count" role="status">{services.length} {services.length === 1 ? 'service' : 'services'}</span>
      </div>
      {favourites.error && !managing && <p className="quick-error" role="alert">{favourites.error}</p>}
      {services.length === 0 && <p className="quick-empty">No services found. Change your search or manage your favourites.</p>}
      {serviceGroups.map((group) => {
        const entries = services.filter((service) => service.group === group.id)
        if (entries.length === 0) return null
        return (
          <section className="quick-group" key={group.id} aria-labelledby={`quick-${group.id}`}>
            <h2 id={`quick-${group.id}`}>{group.name}</h2>
            <p>{group.description}</p>
            <div className="service-grid">
              {entries.map((service) => (
                <ServiceCard service={service} favourite={favourites.ids.includes(service.id)} key={service.id} />
              ))}
            </div>
          </section>
        )
      })}
      {managing && <FavouriteManager favourites={favourites} onClose={() => setManaging(false)} />}
    </div>
  )
}

export default QuickLinks
