export interface VideoItem {
  id: string
  title: string
  description: string
  videoUrl: string
  thumbnailUrl?: string
  uploadedAt: string
}

export interface TextSection {
  id: string
  title: string
  content: string
  order: number
}

export interface ProductionStep {
  id: string
  title: string
  description: string
  date?: string
  order: number
}
