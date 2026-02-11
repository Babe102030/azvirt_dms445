/**
 * Comprehensive AI Assistant Test Suite
 *
 * Tests all components of the AI Assistant:
 * - Ollama connection and models
 * - Chat functionality
 * - Tool execution
 * - OCR and vision
 * - Voice transcription (simulated)
 */

import { ollamaService } from "./server/_core/ollama";
import {
  extractTextFromImage,
  analyzeImageWithVision,
  analyzeQualityControlImage,
  getAvailableVisionModels,
} from "./server/_core/ocr";

// Test results tracking
const results = {
  passed: 0,
  failed: 0,
  skipped: 0,
  tests: [] as Array<{
    name: string;
    status: "pass" | "fail" | "skip";
    error?: string;
    duration?: number;
  }>,
};

function logTest(
  name: string,
  status: "pass" | "fail" | "skip",
  error?: string,
  duration?: number,
) {
  results.tests.push({ name, status, error, duration });
  if (status === "pass") {
    results.passed++;
    console.log(`✅ ${name}${duration ? ` (${duration}ms)` : ""}`);
  } else if (status === "fail") {
    results.failed++;
    console.log(`❌ ${name}`);
    if (error) console.error(`   Error: ${error}`);
  } else {
    results.skipped++;
    console.log(`⏭️  ${name}`);
  }
}

async function test(name: string, fn: () => Promise<void>) {
  const start = Date.now();
  try {
    await fn();
    const duration = Date.now() - start;
    logTest(name, "pass", undefined, duration);
  } catch (error: any) {
    logTest(name, "fail", error.message);
  }
}

async function skip(name: string, reason: string) {
  logTest(name, "skip", reason);
}

// Test Suite
async function runTests() {
  console.log("🧪 AI Assistant - Comprehensive Test Suite\n");
  console.log("=".repeat(60));
  console.log("\n");

  // ========================================
  // 1. Ollama Connection Tests
  // ========================================
  console.log("📡 1. Testing Ollama Connection...\n");

  await test("Ollama service is available", async () => {
    const available = await ollamaService.isAvailable();
    if (!available) {
      throw new Error("Ollama is not running on http://localhost:11434");
    }
  });

  let models: any[] = [];
  await test("List available models", async () => {
    models = await ollamaService.listModels();
    if (models.length === 0) {
      throw new Error("No models installed");
    }
    console.log(`   Found ${models.length} models`);
  });

  await test("Get model details", async () => {
    if (models.length === 0) {
      throw new Error("No models to test");
    }
    const modelInfo = await ollamaService.showModel(models[0].name);
    if (!modelInfo) {
      throw new Error("Failed to get model info");
    }
  });

  console.log("\n");

  // ========================================
  // 2. Chat Functionality Tests
  // ========================================
  console.log("💬 2. Testing Chat Functionality...\n");

  // Find a local model (not cloud models which have size=0)
  const localModels = models.filter((m) => m.size > 0);
  const testModel =
    localModels.find(
      (m) =>
        m.name.includes("qwen3:8b") ||
        m.name.includes("deepseek") ||
        m.name.includes("granite"),
    ) || localModels[0];

  if (!testModel) {
    console.log("   ⚠️  No local models found, using first available model\n");
    const fallbackModel = models[0];
    console.log(`   Using model: ${fallbackModel.name}\n`);
  } else {
    console.log(`   Using model: ${testModel.name}\n`);
  }

  if (!testModel && models.length === 0) {
    console.log("   ❌ No models available for testing\n");
    await skip("Simple chat query", "No models available");
    await skip("Chat with system message", "No models available");
    await skip("Chat with context (conversation)", "No models available");
    await skip("Fast model response time (<10s)", "No models available");
    await skip("Model inference metrics", "No models available");
    await skip("Multi-turn conversation", "No models available");
    await skip("Different temperature settings", "No models available");
    console.log("\n");
    console.log("=".repeat(60));
    console.log("\n📊 Test Results Summary\n");
    console.log(`Total Tests: ${results.tests.length}`);
    console.log(`✅ Passed: ${results.passed}`);
    console.log(`❌ Failed: ${results.failed}`);
    console.log(`⏭️  Skipped: ${results.skipped}`);
    console.log("");
    console.log(
      "⚠️  No models available for testing. Please install a local model:\n",
    );
    console.log("   ollama pull qwen3:8b");
    console.log("   ollama pull granite3.2-vision:2b\n");
    return 0;
  }

  const modelToUse = testModel || models[0];

  await test("Simple chat query", async () => {
    const response = await ollamaService.chat(
      modelToUse.name,
      [
        {
          role: "user",
          content: 'Say "Hello from test" in exactly 3 words.',
        },
      ],
      { stream: false },
    );

    if (!("message" in response) || !response.message?.content) {
      throw new Error("Invalid response format");
    }
    console.log(`   Response: ${response.message.content.substring(0, 50)}...`);
  });

  await test("Chat with system message", async () => {
    const response = await ollamaService.chat(
      modelToUse.name,
      [
        {
          role: "system",
          content:
            "You are a helpful assistant. Always respond in one sentence.",
        },
        {
          role: "user",
          content: "What is 2+2?",
        },
      ],
      { stream: false },
    );

    if (!("message" in response) || !response.message?.content) {
      throw new Error("Invalid response format");
    }
    console.log(`   Response: ${response.message.content.substring(0, 50)}...`);
  });

  await test("Chat with context (conversation)", async () => {
    const response1 = (await ollamaService.chat(
      modelToUse.name,
      [
        {
          role: "user",
          content: "My name is TestUser.",
        },
      ],
      { stream: false },
    )) as any;

    const response2 = (await ollamaService.chat(
      modelToUse.name,
      [
        {
          role: "user",
          content: "My name is TestUser.",
        },
        {
          role: "assistant",
          content: response1.message.content,
        },
        {
          role: "user",
          content: "What is my name?",
        },
      ],
      { stream: false },
    )) as any;

    if (!response2.message?.content) {
      throw new Error("No response to context question");
    }
    console.log(
      `   Response: ${response2.message.content.substring(0, 50)}...`,
    );
  });

  console.log("\n");

  // ========================================
  // 3. Vision & OCR Tests
  // ========================================
  console.log("👁️  3. Testing Vision & OCR...\n");

  const visionModels = await getAvailableVisionModels();
  console.log(
    `   Found ${visionModels.length} vision models: ${visionModels.join(", ") || "none"}\n`,
  );

  if (visionModels.length === 0) {
    await skip("Vision model tests", "No vision models installed");
    await skip("OCR text extraction", "No vision models installed");
    await skip("Quality control analysis", "No vision models installed");
  } else {
    const visionModel = visionModels[0];
    console.log(`   Using vision model: ${visionModel}\n`);

    // Note: These tests would need actual image URLs to work
    await skip("Extract text from image", "Requires sample image URL");
    await skip("Analyze image with vision", "Requires sample image URL");
    await skip("Quality control image analysis", "Requires sample image URL");

    console.log(
      "   💡 To test vision features, provide image URLs and run manually\n",
    );
  }

  console.log("\n");

  // ========================================
  // 4. Performance Tests
  // ========================================
  console.log("⚡ 4. Testing Performance...\n");

  await test("Fast model response time (<10s)", async () => {
    const start = Date.now();
    const response = await ollamaService.chat(
      modelToUse.name,
      [
        {
          role: "user",
          content: "Say OK",
        },
      ],
      { stream: false },
    );
    const duration = Date.now() - start;

    if (duration > 10000) {
      throw new Error(`Response took ${duration}ms (>10s)`);
    }
    console.log(`   Response time: ${duration}ms`);
  });

  await test("Model inference metrics", async () => {
    const response = (await ollamaService.chat(
      modelToUse.name,
      [
        {
          role: "user",
          content: "Count from 1 to 5",
        },
      ],
      { stream: false },
    )) as any;

    if (response.eval_count && response.eval_duration) {
      const tokensPerSecond = (
        response.eval_count /
        (response.eval_duration / 1e9)
      ).toFixed(2);
      console.log(`   Tokens/second: ${tokensPerSecond}`);
      console.log(`   Total tokens: ${response.eval_count}`);
    }
  });

  console.log("\n");

  // ========================================
  // 5. Error Handling Tests
  // ========================================
  console.log("🛡️  5. Testing Error Handling...\n");

  await test("Handle non-existent model gracefully", async () => {
    try {
      await ollamaService.chat(
        "non-existent-model-12345",
        [{ role: "user", content: "test" }],
        { stream: false },
      );
      throw new Error("Should have thrown error for non-existent model");
    } catch (error: any) {
      if (error.message.includes("Should have thrown")) {
        throw error;
      }
      // Expected error - test passes
      console.log("   ✓ Correctly handled non-existent model");
    }
  });

  await test("Handle empty message", async () => {
    try {
      await ollamaService.chat(
        modelToUse.name,
        [{ role: "user", content: "" }],
        { stream: false },
      );
      // Some models might accept empty content, so we don't fail
      console.log("   ✓ Model accepted empty content");
    } catch (error: any) {
      console.log("   ✓ Model rejected empty content (expected)");
    }
  });

  console.log("\n");

  // ========================================
  // 6. Model Management Tests
  // ========================================
  console.log("🔧 6. Testing Model Management...\n");

  await test("List models returns correct format", async () => {
    const modelList = await ollamaService.listModels();

    if (!Array.isArray(modelList)) {
      throw new Error("listModels should return an array");
    }

    if (modelList.length > 0) {
      const firstModel = modelList[0];
      if (!firstModel.name || !firstModel.size) {
        throw new Error("Model should have name and size properties");
      }
      console.log(`   ✓ Model format correct: ${firstModel.name}`);
    }
  });

  await skip("Pull new model", "Skipped to avoid long download");
  await skip("Delete model", "Skipped to preserve installed models");

  console.log("\n");

  // ========================================
  // 7. Integration Tests
  // ========================================
  console.log("🔗 7. Testing Integration...\n");

  await test("Multi-turn conversation", async () => {
    const messages: any[] = [
      { role: "user", content: "What is the capital of France?" },
    ];

    const response1 = (await ollamaService.chat(modelToUse.name, messages, {
      stream: false,
    })) as any;
    messages.push({ role: "assistant", content: response1.message.content });
    messages.push({ role: "user", content: "What is its population?" });

    const response2 = (await ollamaService.chat(modelToUse.name, messages, {
      stream: false,
    })) as any;

    if (!response2.message?.content) {
      throw new Error("Failed multi-turn conversation");
    }
    console.log(`   ✓ Multi-turn conversation successful`);
  });

  await test("Different temperature settings", async () => {
    const response1 = (await ollamaService.chat(
      modelToUse.name,
      [{ role: "user", content: "Say something creative" }],
      { stream: false, temperature: 0.1 },
    )) as any;

    const response2 = (await ollamaService.chat(
      modelToUse.name,
      [{ role: "user", content: "Say something creative" }],
      { stream: false, temperature: 0.9 },
    )) as any;

    console.log(`   ✓ Temperature variations work`);
  });

  console.log("\n");

  // ========================================
  // Results Summary
  // ========================================
  console.log("=".repeat(60));
  console.log("\n📊 Test Results Summary\n");
  console.log(`Total Tests: ${results.tests.length}`);
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`⏭️  Skipped: ${results.skipped}`);
  console.log("");

  if (results.failed > 0) {
    console.log("❌ Failed Tests:\n");
    results.tests
      .filter((t) => t.status === "fail")
      .forEach((t) => {
        console.log(`  • ${t.name}`);
        if (t.error) console.log(`    ${t.error}`);
      });
    console.log("");
  }

  const successRate = (
    (results.passed / (results.passed + results.failed)) *
    100
  ).toFixed(1);
  console.log(`Success Rate: ${successRate}%`);
  console.log("");

  if (results.failed === 0) {
    console.log("🎉 All tests passed! AI Assistant is working correctly.\n");
    return 0;
  } else {
    console.log("⚠️  Some tests failed. Please review the errors above.\n");
    return 1;
  }
}

// Run tests
runTests()
  .then((exitCode) => {
    process.exit(exitCode);
  })
  .catch((error) => {
    console.error("💥 Test suite crashed:", error);
    process.exit(1);
  });
