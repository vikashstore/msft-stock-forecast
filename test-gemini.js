require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

async function testModels() {
  console.log('Testing available Gemini models...\n');
  
  const models = [
    'gemini-1.5-pro',
    'gemini-1.5-flash',
    'gemini-pro',
    'gemini-1.0-pro'
  ];
  
  for (const modelName of models) {
    try {
      console.log(`Testing: ${modelName}...`);
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent('Say hello');
      const response = await result.response;
      console.log(`✅ ${modelName} WORKS!`);
      console.log(`Response: ${response.text()}\n`);
      break; // Stop at first working model
    } catch (error) {
      console.log(`❌ ${modelName} failed: ${error.message}\n`);
    }
  }
}

testModels();
