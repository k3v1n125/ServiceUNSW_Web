import type { QuickLinkService } from '../models/services'
import ServiceIcon from './ServiceIcon'
import './ServiceCard.css'

function ServiceCard({ service, favourite }: { service: QuickLinkService; favourite: boolean }) {
  const content = (
    <>
      <div className="service-card-header">
        <ServiceIcon icon={service.icon} tone={service.tone} />
        {favourite && <span className="service-favourite-mark" aria-label="Favourite">★</span>}
      </div>
      <h3>{service.name}</h3>
      <p>{service.description}</p>
    </>
  )
  return service.url
    ? <a className="service-card" href={service.url} target="_blank" rel="noopener noreferrer">{content}</a>
    : <div className="service-card" aria-disabled="true">{content}</div>
}

export default ServiceCard
