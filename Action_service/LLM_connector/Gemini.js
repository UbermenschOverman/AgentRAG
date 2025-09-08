const {
  ChatGoogleGenerativeAI,
  GoogleGenerativeAIEmbeddings,
} = require("@langchain/google-genai");
const { TaskType } = require("@google/generative-ai");

require("dotenv").config();

// 🛡️ Đổi key thật trong môi trường production!
/**
 * Tạo instance embeddings theo mục đích sử dụng.
 * @param {"document" | "query"} type
 * @returns GoogleGenerativeAIEmbeddings
 */
function embeddingLLM(type = "document") {
  return new GoogleGenerativeAIEmbeddings({
    model: "text-embedding-004",
    taskType:
      type === "document"
        ? TaskType.RETRIEVAL_DOCUMENT
        : TaskType.RETRIEVAL_QUERY,
    title: type === "document" ? "Document title" : undefined,
    apiKey:  process.env.GEMINI_API_KEY,
  });
}

/**
 * Tạo instance LLM cho tác vụ trả lời câu hỏi.
 * @param {string} model
 * @returns ChatGoogleGenerativeAI
 */
function genLLM() {
  return new ChatGoogleGenerativeAI({
    model: "gemini-2.5-flash",
    temperature: 0,
    maxRetries: 2,
    apiKey:  process.env.GEMINI_API_KEY,
  });
}

module.exports = {
  embeddingLLM,
  genLLM,
};
