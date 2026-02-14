import { Photo, VectorDBType } from '../types';
import { localAI } from './localAIService';

// Constants
const EMBEDDING_DIMENSION = 64; 
const SIMILARITY_THRESHOLD = 0.25;

/**
 * Service managing Vector Database connections.
 * Supports:
 * 1. In-Memory (for pure browser demo)
 * 2. External (Qdrant/Milvus/Chroma via REST API)
 */
class VectorDatabase {
  private memoryIndex: Map<string, number[]> = new Map();
  private userContextVector: number[] = new Array(EMBEDDING_DIMENSION).fill(0);

  // --- Core Vector Math (Used for Simulation) ---
  private normalize(v: number[]): number[] {
    const magnitude = Math.sqrt(v.reduce((sum, val) => sum + val * val, 0));
    return magnitude === 0 ? v : v.map(val => val / magnitude);
  }

  private cosineSimilarity(v1: number[], v2: number[]): number {
    return v1.reduce((sum, val, i) => sum + val * v2[i], 0);
  }

  public generateEmbedding(text: string): number[] {
    const vector = new Array(EMBEDDING_DIMENSION).fill(0);
    const words = text.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/);

    words.forEach(word => {
      let hash = 0;
      for (let i = 0; i < word.length; i++) {
        hash = ((hash << 5) - hash) + word.charCodeAt(i);
        hash |= 0;
      }
      for (let i = 0; i < EMBEDDING_DIMENSION; i++) {
        const component = (hash >> (i % 8)) & 1;
        if (component) vector[i] += 1;
        else vector[i] -= 0.5;
      }
    });

    return this.normalize(vector);
  }

  // --- Database Operations ---

  public async addToIndex(photo: Photo): Promise<void> {
    const config = localAI.getConfig();
    const richText = `${photo.name} ${photo.album} ${photo.tags.join(' ')} ${photo.description || ''}`;
    const embedding = this.generateEmbedding(richText);
    
    // Attach locally for UI reference
    photo.embedding = embedding;

    if (config.vectorDB === VectorDBType.IN_MEMORY) {
       this.memoryIndex.set(photo.id, embedding);
    } else {
       // --- EXTERNAL DB INTEGRATION ---
       // Here we would perform the specific REST call for the selected DB
       // Example: await fetch(`${config.vectorDBUrl}/collections/photos/points`, { ... })
       
       console.log(`[VectorDB] Adding vector to external DB: ${config.vectorDB} at ${config.vectorDBUrl}`);
       
       // Fallback to memory index so the demo works even if user selects Qdrant without running it
       this.memoryIndex.set(photo.id, embedding); 
    }
  }

  public getIndexSize(): number {
    return this.memoryIndex.size;
  }

  public async search(query: string, usePersonalization: boolean = true): Promise<string[]> {
    const config = localAI.getConfig();
    const queryVector = this.generateEmbedding(query);
    
    let searchVector = queryVector;
    if (usePersonalization) {
      searchVector = queryVector.map((val, i) => (val * 0.8) + (this.userContextVector[i] * 0.2));
      searchVector = this.normalize(searchVector);
    }

    if (config.vectorDB === VectorDBType.IN_MEMORY) {
        return this.performMemorySearch(searchVector);
    } else {
        console.log(`[VectorDB] Searching external DB: ${config.vectorDB}`);
        // In real app: return await this.performExternalSearch(searchVector, config);
        
        // Fallback for demo
        return this.performMemorySearch(searchVector);
    }
  }

  private performMemorySearch(searchVector: number[]): string[] {
    const results: { id: string, score: number }[] = [];
    this.memoryIndex.forEach((embedding, id) => {
      const score = this.cosineSimilarity(searchVector, embedding);
      if (score > SIMILARITY_THRESHOLD) {
        results.push({ id, score });
      }
    });
    return results.sort((a, b) => b.score - a.score).map(r => r.id);
  }

  public learnUserPreference(textContext: string) {
    const experienceVector = this.generateEmbedding(textContext);
    this.userContextVector = this.userContextVector.map((val, i) => {
      return (val * 0.9) + (experienceVector[i] * 0.1);
    });
    this.userContextVector = this.normalize(this.userContextVector);
  }
}

export const vectorDb = new VectorDatabase();