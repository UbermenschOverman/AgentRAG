const { getDefaultOrder } = require("../mogo_service/mogoService");
const { PromptTemplate } = require("@langchain/core/prompts");
const { z } = require("zod");
const { ChatGoogleGenerativeAI } = require("@langchain/google-genai");

const LLMResponseSchema = z.object({
  updatedOrder: z.record(z.any()).describe("Đơn hàng sau khi cập nhật, dạng object key-value"),
  isFullyFilled: z.enum(["true","false"]).describe("Trạng thái form sau cập nhật đã đầy đủ thông tin bắt buộc hay chưa"),
  response: z.string().describe("Phản hồi cho bộ phận chăm sóc khách hàng"),
});

async function updateOrderLLM(oldOrder, updatedOrder, tenantId) {
  try {
    const defaultOrder = await getDefaultOrder(tenantId);
    const defaultOrderText = JSON.stringify(defaultOrder, null, 2);

    const structuredLlm = new ChatGoogleGenerativeAI({
      model: "gemini-2.0-flash",
      temperature: 0,
      maxRetries: 2,
      apiKey: process.env.GEMINI_API_KEY, // nên dùng .env
    }).withStructuredOutput(LLMResponseSchema);

    const sysPrompt = new PromptTemplate({
      inputVariables: ["oldOrder", "updatedOrder", "defaultOrder"],
      template: `
        Bạn là nhân viên cập nhật đơn hàng cho doanh nghiệp.
        Bạn sẽ nhận được thông tin đơn hàng cũ và thông tin cập nhật từ bộ phận chăm sóc khách hàng.
        Nhiệm vụ của bạn là cập nhật đơn hàng cũ dựa trên thông tin mới mà bộ phận chăm sóc khách hàng đã cung cấp.
        Nếu đã đủ thông tin, hãy đánh dấu isFullyFilled là true, nếu không thì false.
        Cung cấp phản hồi cho bộ phận chăm sóc khách hàng về các trường còn thiếu hoặc đã được cập nhật.

        === GIẢI THÍCH TRƯỜNG TRONG ĐƠN ===
        {defaultOrder}

        === ĐƠN HÀNG CŨ ===
        {oldOrder}

        === CẬP NHẬT MỚI ===
        {updatedOrder}
      `,
    });

    const chain = sysPrompt.pipe(structuredLlm);

    const result = await chain.invoke({
      oldOrder: JSON.stringify(oldOrder, null, 2),
      updatedOrder: JSON.stringify(updatedOrder, null, 2),
      defaultOrder: defaultOrderText,
    });

    return result;
  } catch (error) {
    console.error("❌ Lỗi trong updateOrderLLM:", error.message);
    throw error;
  }
}


module.exports = { updateOrderLLM };
