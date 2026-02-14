import { AIConfig, AIBackend, LocalVisionModel, ImageGenModel, VideoGenModel } from '../types';

// Default Configuration
export const defaultAIConfig: AIConfig = {
  vectorDB: 'In-Memory (Simple)' as any,
  vectorDBUrl: 'http://localhost:6333', // Default Qdrant port
  visionModel: 'Llama 3.2 Vision' as any,
  visionBackend: 'Ollama' as any,
  visionUrl: 'http://localhost:11434',
  imageModel: 'Flux.1' as any,
  videoModel: 'Mochi 1' as any,
  genBackend: 'ComfyUI' as any,
  genUrl: 'http://localhost:8188'
};

/**
 * Service to communicate with Local AI Providers (Ollama, ComfyUI, etc.)
 */
class LocalAIService {
  private config: AIConfig = defaultAIConfig;

  public updateConfig(newConfig: Partial<AIConfig>) {
    this.config = { ...this.config, ...newConfig };
  }

  public getConfig() {
    return this.config;
  }

  /**
   * Simulates/Performs a call to a local Vision LLM (e.g., Llama 3.2 via Ollama)
   * to describe an image or expand a search query.
   */
  public async expandQueryWithLocalLLM(query: string): Promise<string[]> {
    console.log(`[LocalAI] Sending query "${query}" to ${this.config.visionBackend} (${this.config.visionUrl}) using ${this.config.visionModel}...`);
    
    // In a real app, this would be a fetch() to the Ollama /api/generate endpoint
    // await fetch(`${this.config.visionUrl}/api/generate`, { ... })

    // Simulating network delay
    await new Promise(resolve => setTimeout(resolve, 600));

    // Mock response based on simple keyword extraction since we can't actually hit localhost from this demo
    const keywords = query.toLowerCase().split(' ').flatMap(word => {
      if (word === 'beach') return ['ocean', 'sand', 'summer', 'coast'];
      if (word === 'dog') return ['puppy', 'pet', 'animal', 'canine'];
      if (word === 'cat') return ['kitten', 'feline', 'pet'];
      if (word === 'food') return ['dinner', 'lunch', 'restaurant', 'delicious'];
      return [word];
    });

    return [...new Set(keywords)];
  }

  /**
   * Sends a request to a local generation backend (e.g., ComfyUI) to generate an image.
   */
  public async generateLocalImage(prompt: string): Promise<string> {
    console.log(`[LocalAI] Generating Image via ${this.config.genBackend} (${this.config.genUrl})`);
    console.log(`[LocalAI] Model: ${this.config.imageModel}`);
    
    // Simulate ComfyUI Queue Prompt delay
    await new Promise(resolve => setTimeout(resolve, 2500));

    // Return a placeholder image that represents the generated result
    // In a real implementation, this would poll the ComfyUI history/view endpoint
    return `https://picsum.photos/seed/${prompt.length + Date.now()}/1024/1024`;
  }

  /**
   * Sends a request to a local generation backend to generate a video.
   */
  public async generateLocalVideo(prompt: string): Promise<string> {
    console.log(`[LocalAI] Generating Video via ${this.config.genBackend} (${this.config.genUrl})`);
    console.log(`[LocalAI] Model: ${this.config.videoModel}`);

    // Simulate heavy video generation delay
    await new Promise(resolve => setTimeout(resolve, 4000));

    // Return a dummy video link
    return "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4";
  }
}

export const localAI = new LocalAIService();