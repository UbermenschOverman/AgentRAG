// gemini connector
const {
    ChatGoogleGenerativeAI,
  } = require("@langchain/google-genai");
  require("dotenv").config();
  
  function genLLM() {
    return new ChatGoogleGenerativeAI({
      model: "gemini-2.0-flash",
      temperature: 0,
      maxRetries: 2,
      apiKey: process.env.GEMINI_API_KEY,
    });
  }
  
  module.exports = {
    genLLM,
  };
  