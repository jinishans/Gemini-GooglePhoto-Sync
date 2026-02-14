import { GoogleGenAI, Type } from "@google/genai";

// Initialize Gemini Client
// We assume process.env.API_KEY is available as per instructions.

export const analyzeImage = async (base64Data: string, mimeType: string) => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing. Please select a valid API Key.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Data,
              mimeType: mimeType,
            },
          },
          {
            text: `Analyze this image for a personal photo library organizer. 
            Identify the likely album name (e.g., "Vacation", "Pets", "Food", "Family", "Nature", "Urban").
            Provide a short, catchy description.
            Generate 3-5 relevant tags.
            Return the result in JSON format.`
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            suggestedAlbum: { type: Type.STRING, description: "A category name for the photo" },
            description: { type: Type.STRING, description: "A concise caption" },
            tags: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "Keywords describing the image" 
            },
          },
          required: ["suggestedAlbum", "description", "tags"],
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");
    
    return JSON.parse(text);

  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
};

export const expandSearchQuery = async (query: string): Promise<string[]> => {
  if (!process.env.API_KEY) {
    // Fallback for simple search if no API key
    return query.toLowerCase().split(' '); 
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview', // Use a fast text model
      contents: `You are a search assistant for a photo gallery. 
      The user search query is: "${query}".
      Generate a list of 5-10 related keywords, synonyms, and visual descriptors that might appear in tags or album names for this query.
      Example: "My dog on the beach" -> ["dog", "puppy", "beach", "ocean", "sand", "summer", "pet", "animal", "coast"]
      Return ONLY a JSON array of strings.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });

    const text = response.text;
    if (!text) return query.toLowerCase().split(' ');
    return JSON.parse(text);

  } catch (error) {
    console.error("Gemini Search Expansion Error:", error);
    return query.toLowerCase().split(' ');
  }
};