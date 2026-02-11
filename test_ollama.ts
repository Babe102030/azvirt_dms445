/**
 * Test Ollama Connection
 *
 * This script tests the connection to the local Ollama instance
 * and verifies that models are available.
 */

import { ollamaService } from './server/_core/ollama';

async function testOllamaConnection() {
  console.log('🤖 Testing Ollama Connection...\n');

  // Test 1: Check if Ollama is available
  console.log('1️⃣ Checking if Ollama is running...');
  const isAvailable = await ollamaService.isAvailable();

  if (!isAvailable) {
    console.error('❌ Ollama is not running or not accessible');
    console.error('   Please start Ollama: ollama serve');
    console.error('   Or check OLLAMA_BASE_URL environment variable');
    process.exit(1);
  }

  console.log('✅ Ollama is running!\n');

  // Test 2: List available models
  console.log('2️⃣ Listing available models...');
  const models = await ollamaService.listModels();

  if (models.length === 0) {
    console.warn('⚠️  No models installed');
    console.warn('   Install a model: ollama pull llama3.2');
  } else {
    console.log(`✅ Found ${models.length} model(s):\n`);
    models.forEach((model) => {
      const sizeMB = (model.size / (1024 * 1024)).toFixed(2);
      console.log(`   📦 ${model.name}`);
      console.log(`      Size: ${sizeMB} MB`);
      console.log(`      Family: ${model.details?.family || 'unknown'}`);
      console.log(`      Parameters: ${model.details?.parameter_size || 'unknown'}`);
      console.log(`      Modified: ${new Date(model.modified_at).toLocaleDateString()}`);
      console.log('');
    });
  }

  // Test 3: Try a simple chat if models are available
  if (models.length > 0) {
    const testModel = models[0].name;
    console.log(`3️⃣ Testing chat with model: ${testModel}...`);

    try {
      const response = await ollamaService.chat(
        testModel,
        [
          {
            role: 'user',
            content: 'Say "Hello from AzVirt DMS!" in one sentence.',
          },
        ],
        { stream: false }
      );

      if ('message' in response && response.message) {
        console.log('✅ Chat successful!\n');
        console.log('   Response:', response.message.content);
        console.log('');

        // Display performance metrics
        if (response.total_duration) {
          const totalSeconds = (response.total_duration / 1e9).toFixed(2);
          console.log(`   ⏱️  Total time: ${totalSeconds}s`);
        }
        if (response.eval_count && response.eval_duration) {
          const tokensPerSecond = (response.eval_count / (response.eval_duration / 1e9)).toFixed(2);
          console.log(`   🚀 Speed: ${tokensPerSecond} tokens/s`);
        }
      }
    } catch (error: any) {
      console.error('❌ Chat test failed:', error.message);
    }
  }

  console.log('\n✨ Ollama connection test complete!\n');
}

// Run the test
testOllamaConnection().catch((error) => {
  console.error('Test failed with error:', error);
  process.exit(1);
});
