export interface ProductEditorValue {
  productTypeId: string
  name: string
  attributes: Record<string, unknown>
  vehicleModelIds: string[]
  imageUrl?: string
  imageFile?: File
  removeImage?: boolean
}
