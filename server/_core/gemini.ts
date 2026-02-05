/**
 * Gemini Integration Service
 * Provides interface to Google's Gemini API for AI model inference
 */

import axios, { AxiosInstance } from "axios";
import { ENV } from "./env";

const GEMINI_API_KEY = ENV.geminiApiKey;
const GEMINI_MODEL = ENV.geminiModel || "gemini-1.5-flash";
const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

export interface GeminiMessage {
  role: "user" | "model";
  parts: Array<
    { text: string } | { inline_data: { mime_type: string; data: string } }
  >;
}

export interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{ text: string }>;
      role: string;
    };
    finishReason: string;
    index: number;
    safetyRatings: Array<{
      category: string;
      probability: string;
    }>;
  }>;
  usageMetadata: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

class GeminiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: GEMINI_BASE_URL,
      timeout: 60000,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  /**
   * Send a prompt to Gemini
   */
  async chat(
    messages: GeminiMessage[],
    options?: {
      model?: string;
      temperature?: number;
      topP?: number;
      topK?: number;
      maxOutputTokens?: number;
      stopSequences?: string[];
    },
  ): Promise<GeminiResponse> {
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    const modelName = options?.model || GEMINI_MODEL;

    const requestBody = {
      contents: messages,
      generationConfig: {
        temperature: options?.temperature ?? 0.7,
        topP: options?.topP ?? 0.95,
        topK: options?.topK ?? 40,
        maxOutputTokens: options?.maxOutputTokens ?? 2048,
        stopSequences: options?.stopSequences,
      },
    };

    const response = await this.client.post<GeminiResponse>(
      `/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`,
      requestBody,
    );

    return response.data;
  }

  /**
   * Analyze image with Gemini
   */
  async analyzeImage(
    imageBase64: string,
    mimeType: string,
    prompt: string,
  ): Promise<string> {
    const messages: GeminiMessage[] = [
      {
        role: "user",
        parts: [
          { text: prompt },
          {
            inline_data: {
              mime_type: mimeType,
              data: imageBase64,
            },
          },
        ],
      },
    ];

    const response = await this.chat(messages);
    return response.candidates[0].content.parts[0].text;
  }

  /**
   * Simplified interface for text generation
   */
  async generateText(prompt: string): Promise<string> {
    const messages: GeminiMessage[] = [
      {
        role: "user",
        parts: [{ text: prompt }],
      },
    ];

    const response = await this.chat(messages);
    return response.candidates[0].content.parts[0].text;
  }
}

// Export singleton instance
export const geminiService = new GeminiService();

/**
 * Helper to convert standard message format to Gemini format
 */
export function formatToGeminiMessages(
  messages: Array<{ role: string; content: string }>,
): GeminiMessage[] {
  return messages.map((msg) => ({
    role: msg.role === "assistant" ? "model" : "user",
    parts: [{ text: msg.content }],
  })) as GeminiMessage[];
}
