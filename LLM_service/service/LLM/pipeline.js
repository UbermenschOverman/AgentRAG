const { workflow } = require("./tools/test"); // đường dẫn tới workflow của bạn
const { MemorySaver } = require("@langchain/langgraph");
const { connectDB } = require("../../config/mongo");

const memory = new MemorySaver();
const graph = workflow.compile({ checkpointer: memory });

/**
 * Pipeline chính cho chatbot:
 * - Lấy thông tin khách hàng từ Mongo
 * - Build state ban đầu
 * - Invoke graph
 * - Bắt lỗi và trả về kết quả
 */
async function pipeline(
  tenantId,
  businessDescription,
  conversationId,
  userInput,
  summary,
  clientId,
  mode
) {
  // Gán default để tránh undefined
  tenantId = tenantId || "";
  businessDescription = businessDescription || "";
  conversationId = conversationId || "";
  userInput = userInput || "";
  summary = summary || "";
  clientId = clientId || "";
  mode = mode ||"lỗi trạng thái hội thoại"
  try {
    // 1) Lấy thông tin client
    const db = await connectDB();
    console.log("🔍 Lấy thông tin client:", clientId);
    const clientInfo = await db.collection("clients").findOne({ clientId });

    if (!clientInfo) {
      throw new Error(`Client với ID=${clientId} không tìm thấy`);
    }
    const {
      name = "",
      phoneNumber = "",
      interestedProducts = [],
      customerCharacteristics = [],
    } = clientInfo;

    // 2) Build state cho graph
    const state = {
      userInformation: {
        name,
        phoneNumber,
        interestedProducts,
        customerCharacteristics,
      },
      tenantId,
      conversationId,
      bussinessDetail: businessDescription,
      input: userInput,
      mode: mode, // Thêm mode để xác định trạng thái hội thoại
      summary,
      sub_prompt: [],     // sẽ do node decompose điền vào
      output: "",         // graph sẽ gán kết quả vào đây
      clientId,
    };

    const threadConfig = { configurable: { thread_id: conversationId } };

    // 3) Invoke graph, bắt lỗi riêng để fallback
    let result;
    try {
      result = await graph.invoke(state, threadConfig);
    } catch (err) {
      console.error("❌ Lỗi khi chạy graph.invoke:", err);
      result = { output: `🚨 Lỗi nội bộ: ${err.message}` };
    }

    // 4) Trả về output cuối cùng
    return result.output;
  } catch (error) {
    console.error("❌ Error in pipeline:", error);
    throw error;
  }
}

module.exports = { pipeline };
