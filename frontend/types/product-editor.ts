export interface ProductEditorValue {
  productTypeId: string
  name: string
  attributes: Record<string, unknown>
  vehicleModelIds: string[]
}
