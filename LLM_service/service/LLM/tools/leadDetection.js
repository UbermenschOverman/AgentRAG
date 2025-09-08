const { PromptTemplate  } = require("@langchain/core/prompts");// const { genLLM } = require("../../config/gemini");
const {
  ChatGoogleGenerativeAI,
} = require("@langchain/google-genai");
const { z } = require("zod");
require('dotenv').config();

const lead =  z.object({
      name: z.string().describe("Tên người dùng."),
      phoneNumber: z.string().describe("Số điện thoại của người dùng."),
      interestedProducts: z.array(z.string()).describe("Những sản phẩm mà người dùng quan tâm."),
      customerCharacteristics: z.array(z.string()).describe("Đặc điểm của khách hàng."),
    })

const structuredLlm  = new ChatGoogleGenerativeAI({
      model: "gemini-2.0-flash",
      temperature: 0,
      maxRetries: 2,
      apiKey: process.env.GEMINI_API_KEY,
    }).withStructuredOutput(lead);

const sysPrompt = new PromptTemplate({
    inputVariables: ["businessDescription","userInput","summary", "userInformation"  ],
    template:`
    Bạn là trợ lý hỗ trợ khách hàng của doanh nghiệp {businessDescription}. Mục tiêu của bạn là trích xuất thông tin cá nhân của khách hàng từ tin nhắn hiện tại và từ tóm tắt hội thoại được cung cấp.
    Bạn được cung cấp thông tin khách hàng đã có từ vòng trước, dựa vào tin nhắn đến và hội thoại, quyết định xem có phải bổ sung, cập nhật hay không.
    Nếu không cần cập nhật, bổ sung, hãy trả về kết quả cũ.
    Nếu cần cập nhật, bổ sung, hãy trả về thông tin mới.

    *** thông tin khách hàng đã có từ vòng trước:
    {userInformation}

    *** Tin nhắn của khách hàng:
    {userInput}

    *** Tóm tắt hội thoại trước đó:
    {summary}

    ===== BẮT ĐẦU =====
    `,
})

// === Tạo chuỗi runnable ===
const chain = sysPrompt.pipe(structuredLlm);

// === Hàm chính ===
async function leadDetection(businessDescription, userInput, summary, userInformation) {
  const result = await chain.invoke({
    businessDescription,
    userInput,
    summary,
    userInformation,
  });

  console.log("===> Trả về từ leadDetection:", result);
  return result;
}

module.exports = { leadDetection };