import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error('GEMINI_API_KEY is not set in environment variables');
}

const genAI = new GoogleGenerativeAI(apiKey);

export interface GeminiResponse {
  text: string;
  success: boolean;
  error?: string;
}

export async function callGeminiAPI(
  prompt: string, 
  model: string = 'gemini-1.5-flash'
): Promise<GeminiResponse> {
  try {
    console.log(`Calling Gemini API with model: ${model}`);
    console.log(`Prompt: ${prompt}`);

    const geminiModel = genAI.getGenerativeModel({ model });
    
    const result = await geminiModel.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    console.log(`Gemini API Response: ${text}`);

    return {
      text,
      success: true
    };
  } catch (error) {
    console.error('Gemini API Error:', error);
    
    return {
      text: `Error calling Gemini API: ${error instanceof Error ? error.message : 'Unknown error'}`,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export const GEMINI_MODELS = [
  'gemini-1.5-flash',
  'gemini-1.5-pro',
  'gemini-1.0-pro'
] as const;

export type GeminiModel = typeof GEMINI_MODELS[number];

