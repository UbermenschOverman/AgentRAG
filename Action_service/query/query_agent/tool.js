const { tool } = require("@langchain/core/tools");
const { z } = require("zod");
const {retrieval} = require("../../query/queryEmbedder.js");
// tool truy vấn weaviate
const queryTool = tool(
  async (inputArgs) => {
    const { tenantId, text } = inputArgs;
    try {
      const response = await retrieval(tenantId, text);
      return response;
    } catch (error) {
      console.error("❌ Lỗi khi truy vấn Weaviate:", error);
      throw error; // Ném lại lỗi để xử lý ở nơi gọi hàm
    }
  },
  {
    name: "Query",
    description: "Công cụ vector search dựa trên truy vấn",
    schema: z.object({
      tenantId: z.string().describe("ID của tenant."),
      text: z.string().describe("Câu hỏi."),
    }),
  }
);

module.exports = { queryTool };