export type ServiceIcon = 'book' | 'library' | 'play' | 'search' | 'plan' | 'clipboard' | 'file' | 'mail' | 'map' | 'monitor' | 'heart'
export type ServiceTone = 'blue' | 'green' | 'purple' | 'yellow'

export interface QuickLinkService {
  id: string
  name: string
  description: string
  group: 'study' | 'admin' | 'campus'
  icon: ServiceIcon
  tone: ServiceTone
  url?: string
}

export interface ServiceGroup {
  id: QuickLinkService['group']
  name: string
  description: string
}

export interface ServiceCatalogue {
  groups: ServiceGroup[]
  services: QuickLinkService[]
}
