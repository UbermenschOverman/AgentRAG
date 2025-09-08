const { getDefaultOrder } = require("../mogo_service/mogoService");
const { PromptTemplate } = require("@langchain/core/prompts");
const { z } = require("zod");
const { ChatGoogleGenerativeAI } = require("@langchain/google-genai");

require('dotenv').config();

const LLMResponseSchema = z.object({
  content: z.array(
    z.object({
      name: z.string(),
      value: z.string(),
      required: z.string(),
    })
  ),
  isFullyFilled: z.string(),
  nullFields: z.array(z.string()),
});

async function createOrderLLM(tenantId, context, intent) {
  try {
    const defaultOrder = await getDefaultOrder(tenantId);
    const defaultOrderText = JSON.stringify(defaultOrder, null, 2);

    const structuredLlm = new ChatGoogleGenerativeAI({
      model: "gemini-2.0-flash",
      temperature: 0,
      maxRetries: 2,
      apiKey: process.env.GEMINI_API_KEY,
    }).withStructuredOutput(LLMResponseSchema);

    const sysPrompt = new PromptTemplate({
      inputVariables: ["context", "intent", "defaultOrder"],
      template: `
        Bạn là nhân viên tạo đơn cho doanh nghiệp {context}.
        Bạn sẽ nhận được yêu cầu lên đơn kèm thông tin từ bộ phận chăm sóc khách hàng.
        Bạn cũng sẽ nhận được biểu mẫu đơn hàng mặc định của doanh nghiệp.
        Nhiệm vụ của bạn là tạo một đơn hàng mới có cấu trúc như mẫu đơn và nội dung dựa trên thông tin bộ phận chăm sóc khách hàng đã cung cấp.
        
        *** LƯU Ý QUAN TRỌNG ***
        TRƯỜNG THÔNG TIN NÀO KHÔNG CÓ GIÁ TRỊ ĐỂ LÀ "" (chuỗi rỗng).

        *** THÔNG TIN KHÁCH HÀNG CUNG CẤP ***
        {intent}

        *** MẪU ĐƠN HÀNG MẶC ĐỊNH ***
        {defaultOrder}

        === BẮT ĐẦU ===
      `,
    });

    const chain = sysPrompt.pipe(structuredLlm);

    const result = await chain.invoke({
      context,
      intent,
      defaultOrder: defaultOrderText,
    });

    // Convert content from array -> object
    const OrderContent = result.content.reduce((acc, item) => {
      if (item.name && item.value !== undefined) {
        acc[item.name] = item.value;
      }
      return acc;
    }, {});

    result.content = OrderContent;

    // Append metadata
    result.isStaffConfirmed = "pending";
    result.state = "active";
    result.createdAt = new Date().toISOString();
    result.updatedAt = new Date().toISOString();

    console.log("✅ Kết quả từ LLM:", result);
    return result;
  } catch (error) {
    console.error("❌ Lỗi trong createOrderLLM:", error.message);
    throw error;
  }
}

module.exports = { createOrderLLM };
