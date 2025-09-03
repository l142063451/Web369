/**
 * Service Catalog Component - PR08
 * Displays available citizen services
 */

export interface ServiceCatalogProps {
  services: any[]
}

export function ServiceCatalog({ services }: ServiceCatalogProps) {
  return (
    <div className="grid gap-4">
      <h2 className="text-xl font-semibold">Available Services</h2>
      <p className="text-gray-600">
        PR08 Implementation: Service catalog will be implemented here.
      </p>
    </div>
  )
}
