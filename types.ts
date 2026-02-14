export type PhotoSource = 'local' | 'cloud' | 'synced';

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  token: string; // Mock OAuth token
}

export interface Photo {
  id: string;
  userId: string; // Ownership
  url: string;
  name: string;
  album: string;
  tags: string[];
  description?: string;
  date: string;
  source: PhotoSource;
  size: string;
  embedding?: number[]; // Vector embedding
}

export interface Album {
  id: string;
  userId: string; // Ownership
  name: string;
  coverUrl: string;
  count: number;
  source: 'local' | 'cloud' | 'mixed';
  syncEnabled: boolean;
}

export enum AppView {
  DASHBOARD = 'DASHBOARD',
  ALBUMS = 'ALBUMS',
  PHOTOS = 'PHOTOS',
  SETTINGS = 'SETTINGS',
  UPLOAD = 'UPLOAD',
  GALLERY_SERVER = 'GALLERY_SERVER',
  AI_STUDIO = 'AI_STUDIO'
}

export enum SearchMode {
  CLOUD = 'CLOUD', // Gemini Pro
  LOCAL_VECTOR = 'LOCAL_VECTOR' // Local DB + Local LLM
}

export enum VectorDBType {
  IN_MEMORY = 'In-Memory (Simple)',
  CHROMA = 'ChromaDB',
  QDRANT = 'Qdrant',
  MILVUS = 'Milvus'
}

export enum LocalVisionModel {
  LLAMA_3_2_VISION = 'Llama 3.2 Vision',
  QWEN_2_5_VL = 'Qwen2.5-VL',
  ARIA = 'Aria'
}

export enum ImageGenModel {
  FLUX_1 = 'Flux.1',
  SDXL = 'Stable Diffusion XL',
  SDXL_LIGHTNING = 'SDXL Lightning'
}

export enum VideoGenModel {
  MOCHI_1 = 'Mochi 1',
  LTX_VIDEO = 'LTX-Video',
  WAN_2_1 = 'Wan2.1'
}

export enum AIBackend {
  OLLAMA = 'Ollama',
  LM_STUDIO = 'LM Studio',
  COMFY_UI = 'ComfyUI',
  LOCAL_AI = 'LocalAI'
}

export interface AIConfig {
  vectorDB: VectorDBType;
  vectorDBUrl: string;
  visionModel: LocalVisionModel;
  visionBackend: AIBackend;
  visionUrl: string; // e.g., http://localhost:11434
  imageModel: ImageGenModel;
  videoModel: VideoGenModel;
  genBackend: AIBackend; // e.g., ComfyUI
  genUrl: string; // e.g., http://localhost:8188
}

export interface SyncStatus {
  totalFiles: number;
  syncedFiles: number;
  isSyncing: boolean;
  lastSynced: string;
  storageUsed: string;
  uploadQueue: number;
  downloadQueue: number;
  currentAction: string;
  vectorIndexCount: number;
}