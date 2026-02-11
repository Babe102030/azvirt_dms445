import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import * as db from "../db";
import { getAiConversations } from "../db/ai";
import { ollamaService } from "../_core/ollama";
import { geminiService, formatToGeminiMessages } from "../_core/gemini";
import { ENV } from "../_core/env";
import { executeTool } from "../_core/aiTools";
import { transcribeAudio } from "../_core/voiceTranscription";
import { storagePut } from "../storage";
import {
  PROMPT_TEMPLATES,
  getTemplatesByCategory,
  searchTemplates,
  getTemplateById,
  type TemplateCategory,
} from "../../shared/promptTemplates";
import {
  extractTextFromImage,
  extractTextFromPDF,
  analyzeImageWithVision,
  extractStructuredData,
  analyzeQualityControlImage,
  getAvailableVisionModels,
} from "../_core/ocr";

/**
 * AI Assistant Router
 * Handles AI chat, voice transcription, model management, and agentic tool execution
 */
export const aiAssistantRouter = router({
  /**
   * Chat with AI assistant (streaming support)
   */
  chat: protectedProcedure
    .input(
      z.object({
        conversationId: z.number().optional(),
        message: z.string().min(1, "Message cannot be empty"),
        model: z.string().default("llama3.2"),
        imageUrl: z.string().optional(),
        audioUrl: z.string().optional(),
        useTools: z.boolean().default(true),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const userId = ctx.user.id;

        // Validate model availability
        const isGemini = input.model.startsWith("gemini-");
        if (!isGemini) {
          const availableModels = await ollamaService.listModels();
          if (!availableModels.some((m) => m.name === input.model)) {
            throw new Error(
              `Model "${input.model}" is not available. Please pull it first or use an available model.`,
            );
          }
        }

        // Create or get conversation
        let conversationId = input.conversationId;
        if (!conversationId) {
          conversationId = await db.createAiConversation({
            userId,
            title: input.message.substring(0, 50),
            modelName: input.model,
          });
        } else {
          // Verify user owns this conversation
          const conversations = await getAiConversations(userId);
          if (!conversations.some((c) => c.id === conversationId)) {
            throw new Error("Conversation not found or access denied");
          }
        }

        // Ensure conversationId is non-null for TS
        const finalConversationId = conversationId!;

        // Save user message
        await db.createAiMessage({
          conversationId: finalConversationId,
          role: "user",
          content: input.message,
          audioUrl: input.audioUrl,
          imageUrl: input.imageUrl,
        });

        // Get conversation history
        const history = await db.getAiMessages(finalConversationId);
        const messages = history.map((msg) => ({
          role: msg.role as "user" | "assistant" | "system",
          content: msg.content,
          images: (msg as any).imageUrl ? [(msg as any).imageUrl] : undefined,
        }));

        // Add system message with DMS context
        const systemMessage = {
          role: "system" as const,
          content: `You are an AI assistant for AzVirt DMS (Delivery Management System), a concrete production and delivery management platform. You have access to real-time data AND the ability to create, update, and manage business records.

DATA RETRIEVAL TOOLS:
- search_materials: Search and check inventory levels
- get_delivery_status: Track delivery status and history
- search_documents: Find documents and files
- get_quality_tests: Review quality control test results
- generate_forecast: Get inventory forecasting predictions
- calculate_stats: Calculate business metrics and statistics

DATA MANIPULATION TOOLS:
- log_work_hours: Record employee work hours with overtime tracking
- get_work_hours_summary: Get work hours summary for employees/projects
- log_machine_hours: Track equipment/machinery usage hours
- create_material: Add new materials to inventory
- update_material_quantity: Adjust material stock levels
- update_document: Modify document metadata (name, category, project)
- delete_document: Remove documents from the system

CAPABILITIES:
- Answer questions about inventory, deliveries, quality, and operations
- Create and log work hours for employees and machines
- Add new materials and update stock quantities
- Manage document metadata and organization
- Generate reports and calculate business metrics
- Provide forecasts and trend analysis

GUIDELINES:
- Always confirm before deleting or making significant changes
- When logging hours, calculate overtime automatically (>8 hours)
- For stock updates, show previous and new quantities
- Be precise with dates and times (use ISO format)
- Provide clear success/error messages
- Ask for clarification if parameters are ambiguous

Be helpful, accurate, and professional. Use tools to fetch real data and perform requested operations.`,
        };

        let responseContent = "";

        if (isGemini) {
          const geminiMessages = formatToGeminiMessages([
            systemMessage,
            ...messages,
          ]);
          const response = await geminiService.chat(geminiMessages, {
            model: input.model,
          });
          if (!response.candidates?.[0]?.content?.parts?.[0]?.text) {
            throw new Error("Invalid response from Gemini API");
          }
          responseContent = response.candidates[0].content.parts[0].text;
        } else {
          // Chat with Ollama (non-streaming)
          const response = (await ollamaService.chat(
            input.model,
            [systemMessage, ...messages],
            {
              stream: false,
              temperature: 0.7,
            },
          )) as import("../_core/ollama").OllamaResponse;

          if (!response || !response.message || !response.message.content) {
            throw new Error("Invalid response from AI model");
          }
          responseContent = response.message.content;
        }

        // Save assistant response
        const assistantMessageId = await db.createAiMessage({
          conversationId: finalConversationId,
          role: "assistant",
          content: responseContent,
          model: input.model,
        });

        return {
          conversationId: finalConversationId,
          messageId: assistantMessageId,
          content: responseContent,
          model: input.model,
        };
      } catch (error: any) {
        console.error("AI chat error:", error);
        throw new Error(`Chat failed: ${error.message || "Unknown error"}`);
      }
    }),

  /**
   * Stream chat response (for real-time streaming)
   */
  streamChat: protectedProcedure
    .input(
      z.object({
        conversationId: z.number(),
        message: z.string(),
        model: z.string().default("llama3.2"),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      // This would require tRPC subscriptions for true streaming
      // For now, return the full response
      return { message: "Streaming not yet implemented. Use chat endpoint." };
    }),

  /**
   * Transcribe voice audio to text
   */
  transcribeVoice: protectedProcedure
    .input(
      z.object({
        audioData: z.string(), // base64 encoded audio
        language: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // Convert base64 to buffer
        const audioBuffer = Buffer.from(input.audioData, "base64");

        // Upload to S3
        const timestamp = Date.now();
        const { url: audioUrl } = await storagePut(
          `voice/${ctx.user.id}/recording-${timestamp}.webm`,
          audioBuffer,
          "audio/webm",
        );

        // Transcribe using Whisper API
        const result = await transcribeAudio({
          audioUrl,
          language: input.language || "en",
        });

        // Check if transcription was successful
        if ("error" in result) {
          throw new Error(result.error);
        }

        return {
          text: result.text,
          language: result.language || input.language || "en",
          audioUrl,
        };
      } catch (error: any) {
        console.error("Voice transcription error:", error);
        throw new Error(`Transcription failed: ${error.message}`);
      }
    }),

  /**
   * Get all conversations for current user
   */
  getConversations: protectedProcedure.query(async ({ ctx }) => {
    return await getAiConversations(ctx.user.id);
  }),

  /**
   * Get messages for a conversation
   */
  getMessages: protectedProcedure
    .input(z.object({ conversationId: z.number() }))
    .query(async ({ input, ctx }) => {
      // Verify conversation belongs to user
      const conversations = await getAiConversations(ctx.user.id);
      const conversation = conversations.find(
        (c) => c.id === input.conversationId,
      );

      if (!conversation) {
        throw new Error("Conversation not found");
      }

      return await db.getAiMessages(input.conversationId);
    }),

  /**
   * Create a new conversation
   */
  createConversation: protectedProcedure
    .input(
      z.object({
        title: z.string().optional(),
        modelName: z.string().default("llama3.2"),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const conversationId = await db.createAiConversation({
        userId: ctx.user.id,
        title: input.title || "New Conversation",
        modelName: input.modelName,
      });

      return { conversationId };
    }),

  /**
   * Delete a conversation
   */
  deleteConversation: protectedProcedure
    .input(z.object({ conversationId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      // Verify ownership
      const conversations = await getAiConversations(ctx.user.id);
      const conversation = conversations.find(
        (c) => c.id === input.conversationId,
      );

      if (!conversation) {
        throw new Error("Conversation not found");
      }

      await db.deleteAiConversation(input.conversationId);
      return { success: true };
    }),

  /**
   * List available Ollama models
   */
  listModels: protectedProcedure.query(async () => {
    try {
      const models = await ollamaService.listModels();
      const result = models.map((model) => ({
        name: model.name,
        size: model.size,
        modifiedAt: model.modified_at,
        family: model.details?.family || "unknown",
        parameterSize: model.details?.parameter_size || "unknown",
      }));

      // Add Gemini models if API key is present
      if (ENV.geminiApiKey) {
        const geminiModels = [
          "gemini-1.5-flash",
          "gemini-1.5-pro",
          "gemini-2.0-flash",
          "gemini-2.0-flash-lite",
          "gemini-2.5-flash-lite",
        ];

        // Ensure current default model is included
        if (ENV.geminiModel && !geminiModels.includes(ENV.geminiModel)) {
          geminiModels.push(ENV.geminiModel);
        }

        geminiModels.forEach((modelName) => {
          result.push({
            name: modelName,
            size: 0,
            modifiedAt: new Date().toISOString(),
            family: "gemini",
            parameterSize: "cloud",
          });
        });
      }

      return result;
    } catch (error: any) {
      console.error("Failed to list models:", error);
      return [];
    }
  }),

  /**
   * Pull a new model from Ollama registry
   */
  pullModel: protectedProcedure
    .input(z.object({ modelName: z.string() }))
    .mutation(async ({ input }) => {
      try {
        const success = await ollamaService.pullModel(input.modelName);
        return {
          success,
          message: success
            ? "Model pulled successfully"
            : "Failed to pull model",
        };
      } catch (error: any) {
        console.error("Failed to pull model:", error);
        return { success: false, message: error.message };
      }
    }),

  /**
   * Delete a model
   */
  deleteModel: protectedProcedure
    .input(z.object({ modelName: z.string() }))
    .mutation(async ({ input }) => {
      try {
        const success = await ollamaService.deleteModel(input.modelName);
        return {
          success,
          message: success
            ? "Model deleted successfully"
            : "Failed to delete model",
        };
      } catch (error: any) {
        console.error("Failed to delete model:", error);
        return { success: false, message: error.message };
      }
    }),

  /**
   * Get all prompt templates
   */
  getTemplates: publicProcedure.query(async () => {
    return PROMPT_TEMPLATES;
  }),

  /**
   * Get templates by category
   */
  getTemplatesByCategory: publicProcedure
    .input(
      z.object({
        category: z.enum([
          "inventory",
          "deliveries",
          "quality",
          "reports",
          "analysis",
          "forecasting",
          "bulk_import",
        ]),
      }),
    )
    .query(async ({ input }) => {
      return getTemplatesByCategory(input.category as TemplateCategory);
    }),

  /**
   * Search templates
   */
  searchTemplates: publicProcedure
    .input(z.object({ query: z.string() }))
    .query(async ({ input }) => {
      return searchTemplates(input.query);
    }),

  /**
   * Get template by ID
   */
  getTemplate: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const template = getTemplateById(input.id);
      if (!template) {
        throw new Error("Template not found");
      }
      return template;
    }),

  /**
   * Execute an agentic tool
   */
  executeTool: protectedProcedure
    .input(
      z.object({
        toolName: z.string(),
        parameters: z.record(z.string(), z.any()),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const result = await executeTool(
          input.toolName,
          input.parameters,
          ctx.user.id,
        );
        return result;
      } catch (error: any) {
        console.error("Tool execution error:", error);
        // Return error response instead of throwing
        return {
          success: false,
          toolName: input.toolName,
          parameters: input.parameters,
          error: error.message || "Unknown error",
        };
      }
    }),

  /**
   * Extract text from image using OCR
   */
  extractTextFromImage: protectedProcedure
    .input(
      z.object({
        imageUrl: z.string().url(),
        model: z.string().optional(),
        language: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        const result = await extractTextFromImage(input.imageUrl, {
          model: input.model,
          language: input.language,
        });
        return {
          success: true,
          text: result.text,
          confidence: result.confidence,
        };
      } catch (error: any) {
        console.error("OCR extraction error:", error);
        return {
          success: false,
          error: error.message || "Failed to extract text from image",
        };
      }
    }),

  /**
   * Extract text from PDF
   */
  extractTextFromPDF: protectedProcedure
    .input(
      z.object({
        pdfUrl: z.string().url(),
        model: z.string().optional(),
        maxPages: z.number().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        const result = await extractTextFromPDF(input.pdfUrl, {
          model: input.model,
          maxPages: input.maxPages,
        });
        return {
          success: true,
          text: result.text,
          pageCount: result.pageCount,
        };
      } catch (error: any) {
        console.error("PDF extraction error:", error);
        return {
          success: false,
          error: error.message || "Failed to extract text from PDF",
        };
      }
    }),

  /**
   * Analyze image with custom prompt
   */
  analyzeImage: protectedProcedure
    .input(
      z.object({
        imageUrl: z.string().url(),
        prompt: z.string(),
        model: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        const result = await analyzeImageWithVision(
          input.imageUrl,
          input.prompt,
          {
            model: input.model,
          },
        );
        return {
          success: true,
          analysis: result,
        };
      } catch (error: any) {
        console.error("Image analysis error:", error);
        return {
          success: false,
          error: error.message || "Failed to analyze image",
        };
      }
    }),

  /**
   * Extract structured data from document images
   */
  extractStructuredData: protectedProcedure
    .input(
      z.object({
        imageUrl: z.string().url(),
        dataType: z.enum(["invoice", "receipt", "form", "table"]),
        model: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        const result = await extractStructuredData(
          input.imageUrl,
          input.dataType,
          {
            model: input.model,
          },
        );
        return {
          success: true,
          data: result,
        };
      } catch (error: any) {
        console.error("Structured data extraction error:", error);
        return {
          success: false,
          error: error.message || "Failed to extract structured data",
        };
      }
    }),

  /**
   * Analyze quality control images
   */
  analyzeQualityControlImage: protectedProcedure
    .input(
      z.object({
        imageUrl: z.string().url(),
        model: z.string().optional(),
        analysisType: z
          .enum(["defect-detection", "sample-analysis", "general"])
          .optional(),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        const result = await analyzeQualityControlImage(input.imageUrl, {
          model: input.model,
          analysisType: input.analysisType,
        });
        return {
          success: true,
          ...result,
        };
      } catch (error: any) {
        console.error("QC image analysis error:", error);
        return {
          success: false,
          error: error.message || "Failed to analyze quality control image",
        };
      }
    }),

  /**
   * Get available vision models
   */
  getVisionModels: protectedProcedure.query(async () => {
    try {
      const models = await getAvailableVisionModels();
      return {
        success: true,
        models,
      };
    } catch (error: any) {
      console.error("Failed to get vision models:", error);
      return {
        success: false,
        models: [],
        error: error.message,
      };
    }
  }),
});
