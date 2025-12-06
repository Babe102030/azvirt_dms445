import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import * as db from "../db";
import { ollamaService } from "../_core/ollama";
import { executeTool } from "../_core/aiTools";
import { transcribeAudio } from "../_core/voiceTranscription";
import { storagePut } from "../storage";

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
        message: z.string(),
        model: z.string().default("llama3.2"),
        imageUrl: z.string().optional(),
        audioUrl: z.string().optional(),
        useTools: z.boolean().default(true),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.id;

      // Create or get conversation
      let conversationId = input.conversationId;
      if (!conversationId) {
        conversationId = await db.createAiConversation({
          userId,
          title: input.message.substring(0, 50),
          modelName: input.model,
        });
      }

      // Save user message
      await db.createAiMessage({
        conversationId,
        role: "user",
        content: input.message,
        audioUrl: input.audioUrl,
        imageUrl: input.imageUrl,
      });

      // Get conversation history
      const history = await db.getAiMessages(conversationId);
      const messages = history.map((msg) => ({
        role: msg.role as "user" | "assistant" | "system",
        content: msg.content,
        images: msg.imageUrl ? [msg.imageUrl] : undefined,
      }));

      // Add system message with DMS context
      const systemMessage = {
        role: "system" as const,
        content: `You are an AI assistant for AzVirt DMS (Delivery Management System), a concrete production and delivery management platform. You have access to real-time data about materials, deliveries, quality tests, documents, and inventory forecasting. 

Available tools:
- search_materials: Search and check inventory levels
- get_delivery_status: Track delivery status and history
- search_documents: Find documents and files
- get_quality_tests: Review quality control test results
- generate_forecast: Get inventory forecasting predictions
- calculate_stats: Calculate business metrics and statistics

When users ask about the system, provide helpful, accurate information. Use tools when appropriate to fetch real data. Be concise and professional.`,
      };

      // Chat with Ollama (non-streaming)
      const response = await ollamaService.chat(
        input.model,
        [systemMessage, ...messages],
        {
          stream: false,
          temperature: 0.7,
        }
      ) as import("../_core/ollama").OllamaResponse;

      // Save assistant response
      const assistantMessageId = await db.createAiMessage({
        conversationId,
        role: "assistant",
        content: response.message.content,
        model: input.model,
      });

      return {
        conversationId,
        messageId: assistantMessageId,
        content: response.message.content,
        model: input.model,
      };
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
      })
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
      })
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
          "audio/webm"
        );

        // Transcribe using Whisper API
        const result = await transcribeAudio({
          audioUrl,
          language: input.language || "en",
        });

        // Check if transcription was successful
        if ('error' in result) {
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
    return await db.getAiConversations(ctx.user.id);
  }),

  /**
   * Get messages for a conversation
   */
  getMessages: protectedProcedure
    .input(z.object({ conversationId: z.number() }))
    .query(async ({ input, ctx }) => {
      // Verify conversation belongs to user
      const conversations = await db.getAiConversations(ctx.user.id);
      const conversation = conversations.find((c) => c.id === input.conversationId);
      
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
      })
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
      const conversations = await db.getAiConversations(ctx.user.id);
      const conversation = conversations.find((c) => c.id === input.conversationId);
      
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
      return models.map((model) => ({
        name: model.name,
        size: model.size,
        modifiedAt: model.modified_at,
        family: model.details?.family || "unknown",
        parameterSize: model.details?.parameter_size || "unknown",
      }));
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
        return { success, message: success ? "Model pulled successfully" : "Failed to pull model" };
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
        return { success, message: success ? "Model deleted successfully" : "Failed to delete model" };
      } catch (error: any) {
        console.error("Failed to delete model:", error);
        return { success: false, message: error.message };
      }
    }),

  /**
   * Execute an agentic tool
   */
  executeTool: protectedProcedure
    .input(
      z.object({
        toolName: z.string(),
        parameters: z.record(z.string(), z.any()),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const result = await executeTool(
          input.toolName,
          input.parameters,
          ctx.user.id
        );
        return result;
      } catch (error: any) {
        console.error("Tool execution error:", error);
        throw new Error(`Tool execution failed: ${error.message}`);
      }
    }),
});
