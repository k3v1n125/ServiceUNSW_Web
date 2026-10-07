import { academicServices, personalServices } from './service'
import type { ServiceEntry } from './service'
import './QuickLinks.css'

function ServiceGrid({ services }: { services: ServiceEntry[] }) {
  return (
    <div className="service-grid">
      {services.map((service) => (
        <a
          key={service.name}
          className="service-card"
          href={service.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          <div className="service-card-header">
            <img className="service-card-icon" src={service.icon} alt="" />
            <p className="service-card-title">{service.name}</p>
          </div>
          <p className="service-card-desc">{service.description}</p>
        </a>
      ))}
    </div>
  )
}

function QuickLinks() {
  return (
    <div>
      <h3>Academic</h3>
      <ServiceGrid services={academicServices} />

      <h3>Personal</h3>
      <ServiceGrid services={personalServices} />
    </div>
  )
}

export default QuickLinks
