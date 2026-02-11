/**
 * OCR and Vision Service
 * Provides text extraction from images and PDFs using Ollama vision models
 */

import { ollamaService } from "./ollama";
import axios from "axios";

const DEFAULT_VISION_MODEL =
  process.env.OLLAMA_VISION_MODEL || "granite3.2-vision:2b";

/**
 * Extract text from an image using Ollama vision model
 */
export async function extractTextFromImage(
  imageUrl: string,
  options?: {
    model?: string;
    language?: string;
  },
): Promise<{ text: string; confidence?: number }> {
  try {
    const model = options?.model || DEFAULT_VISION_MODEL;
    const language = options?.language || "en";

    // Download the image
    const imageResponse = await axios.get(imageUrl, {
      responseType: "arraybuffer",
    });
    const imageBuffer = Buffer.from(imageResponse.data);
    const imageBase64 = imageBuffer.toString("base64");

    // Create prompt for OCR
    const prompt = `Extract all text from this image. Return ONLY the extracted text without any additional commentary or formatting. If the text is in ${language === "bs" ? "Bosnian/Serbian/Croatian" : "English"}, preserve the original language and special characters.`;

    // Use Ollama vision model for OCR
    const response = await ollamaService.analyzeImage(
      model,
      imageBase64,
      prompt,
    );

    return {
      text: response.trim(),
      confidence: 0.95, // Placeholder confidence
    };
  } catch (error: any) {
    console.error("OCR extraction error:", error);
    throw new Error(`Failed to extract text from image: ${error.message}`);
  }
}

/**
 * Extract text from a PDF file using Ollama vision model (page by page)
 */
export async function extractTextFromPDF(
  pdfUrl: string,
  options?: {
    model?: string;
    maxPages?: number;
  },
): Promise<{ text: string; pageCount: number }> {
  try {
    // Note: This is a simplified implementation
    // For production, you might want to use a library like pdf-parse or pdf2pic
    // to convert PDF pages to images first, then process each page

    const model = options?.model || DEFAULT_VISION_MODEL;
    const maxPages = options?.maxPages || 10;

    console.warn(
      "PDF extraction requires additional setup. Consider using pdf-parse or similar library.",
    );

    // For now, return placeholder
    return {
      text: "PDF extraction not fully implemented. Please convert PDF pages to images first.",
      pageCount: 0,
    };
  } catch (error: any) {
    console.error("PDF extraction error:", error);
    throw new Error(`Failed to extract text from PDF: ${error.message}`);
  }
}

/**
 * Analyze image with custom prompt using vision model
 */
export async function analyzeImageWithVision(
  imageUrl: string,
  prompt: string,
  options?: {
    model?: string;
  },
): Promise<string> {
  try {
    const model = options?.model || DEFAULT_VISION_MODEL;

    // Download the image
    const imageResponse = await axios.get(imageUrl, {
      responseType: "arraybuffer",
    });
    const imageBuffer = Buffer.from(imageResponse.data);
    const imageBase64 = imageBuffer.toString("base64");

    // Analyze with Ollama vision model
    const response = await ollamaService.analyzeImage(
      model,
      imageBase64,
      prompt,
    );

    return response;
  } catch (error: any) {
    console.error("Image analysis error:", error);
    throw new Error(`Failed to analyze image: ${error.message}`);
  }
}

/**
 * Detect and extract structured data from document images
 * Useful for invoices, receipts, forms, etc.
 */
export async function extractStructuredData(
  imageUrl: string,
  dataType: "invoice" | "receipt" | "form" | "table",
  options?: {
    model?: string;
  },
): Promise<Record<string, any>> {
  try {
    const model = options?.model || DEFAULT_VISION_MODEL;

    // Download the image
    const imageResponse = await axios.get(imageUrl, {
      responseType: "arraybuffer",
    });
    const imageBuffer = Buffer.from(imageResponse.data);
    const imageBase64 = imageBuffer.toString("base64");

    // Create specialized prompt based on data type
    let prompt = "";
    switch (dataType) {
      case "invoice":
        prompt = `Extract all information from this invoice and return it as JSON with the following fields:
        {
          "invoiceNumber": "...",
          "date": "...",
          "vendor": "...",
          "total": "...",
          "items": [{"description": "...", "quantity": "...", "price": "..."}]
        }
        Return ONLY valid JSON, no additional text.`;
        break;
      case "receipt":
        prompt = `Extract all information from this receipt and return it as JSON with the following fields:
        {
          "date": "...",
          "merchant": "...",
          "total": "...",
          "items": [{"name": "...", "price": "..."}]
        }
        Return ONLY valid JSON, no additional text.`;
        break;
      case "form":
        prompt = `Extract all form fields and their values from this image and return as JSON object where keys are field names and values are the filled values. Return ONLY valid JSON, no additional text.`;
        break;
      case "table":
        prompt = `Extract the table data from this image and return it as JSON array of objects, where each object represents a row with keys as column headers. Return ONLY valid JSON, no additional text.`;
        break;
    }

    // Analyze with vision model
    const response = await ollamaService.analyzeImage(
      model,
      imageBase64,
      prompt,
    );

    // Try to parse JSON response
    try {
      // Clean up response (remove markdown code blocks if present)
      let cleanedResponse = response.trim();
      if (cleanedResponse.startsWith("```json")) {
        cleanedResponse = cleanedResponse.slice(7);
      }
      if (cleanedResponse.startsWith("```")) {
        cleanedResponse = cleanedResponse.slice(3);
      }
      if (cleanedResponse.endsWith("```")) {
        cleanedResponse = cleanedResponse.slice(0, -3);
      }
      cleanedResponse = cleanedResponse.trim();

      const parsedData = JSON.parse(cleanedResponse);
      return parsedData;
    } catch (parseError) {
      // If JSON parsing fails, return raw text
      console.warn(
        "Failed to parse structured data as JSON, returning raw text",
      );
      return { rawText: response };
    }
  } catch (error: any) {
    console.error("Structured data extraction error:", error);
    throw new Error(`Failed to extract structured data: ${error.message}`);
  }
}

/**
 * Analyze quality control images (concrete samples, defects, etc.)
 */
export async function analyzeQualityControlImage(
  imageUrl: string,
  options?: {
    model?: string;
    analysisType?: "defect-detection" | "sample-analysis" | "general";
  },
): Promise<{
  analysis: string;
  issues: string[];
  recommendations: string[];
}> {
  try {
    const model = options?.model || DEFAULT_VISION_MODEL;
    const analysisType = options?.analysisType || "general";

    // Download the image
    const imageResponse = await axios.get(imageUrl, {
      responseType: "arraybuffer",
    });
    const imageBuffer = Buffer.from(imageResponse.data);
    const imageBase64 = imageBuffer.toString("base64");

    // Create specialized prompt for QC analysis
    let prompt = "";
    switch (analysisType) {
      case "defect-detection":
        prompt = `Analyze this concrete sample image for defects. List any visible issues such as cracks, voids, discoloration, or surface irregularities. Provide recommendations for quality improvement.`;
        break;
      case "sample-analysis":
        prompt = `Analyze this concrete sample image. Describe the texture, consistency, color, and any notable characteristics. Assess the quality based on visual inspection.`;
        break;
      case "general":
        prompt = `Perform a quality control analysis of this image. Identify any issues, defects, or areas of concern. Provide specific recommendations for improvement.`;
        break;
    }

    const response = await ollamaService.analyzeImage(
      model,
      imageBase64,
      prompt,
    );

    // Parse the response to extract structured information
    const lines = response.split("\n").filter((line) => line.trim());
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Simple parsing logic (can be improved)
    lines.forEach((line) => {
      const lowerLine = line.toLowerCase();
      if (
        lowerLine.includes("issue") ||
        lowerLine.includes("defect") ||
        lowerLine.includes("problem")
      ) {
        issues.push(line.trim());
      }
      if (
        lowerLine.includes("recommend") ||
        lowerLine.includes("suggest") ||
        lowerLine.includes("should")
      ) {
        recommendations.push(line.trim());
      }
    });

    return {
      analysis: response,
      issues: issues.length > 0 ? issues : ["No significant issues detected"],
      recommendations:
        recommendations.length > 0
          ? recommendations
          : ["Sample appears to meet quality standards"],
    };
  } catch (error: any) {
    console.error("QC image analysis error:", error);
    throw new Error(
      `Failed to analyze quality control image: ${error.message}`,
    );
  }
}

/**
 * Check if a vision model is available
 */
export async function isVisionModelAvailable(
  modelName?: string,
): Promise<boolean> {
  try {
    const model = modelName || DEFAULT_VISION_MODEL;
    const models = await ollamaService.listModels();
    return models.some((m) => m.name === model);
  } catch (error) {
    console.error("Failed to check vision model availability:", error);
    return false;
  }
}

/**
 * Get list of available vision models
 */
export async function getAvailableVisionModels(): Promise<string[]> {
  try {
    const models = await ollamaService.listModels();
    // Filter for vision-capable models
    const visionKeywords = ["vision", "llava", "granite", "ocr", "bakllava"];
    return models
      .filter((m) =>
        visionKeywords.some((keyword) =>
          m.name.toLowerCase().includes(keyword),
        ),
      )
      .map((m) => m.name);
  } catch (error) {
    console.error("Failed to get vision models:", error);
    return [];
  }
}
