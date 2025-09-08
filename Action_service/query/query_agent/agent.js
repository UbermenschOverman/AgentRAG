const { createReactAgent } = require("@langchain/langgraph/prebuilt");
const { ChatGoogleGenerativeAI } = require("@langchain/google-genai");
const { PromptTemplate } = require("@langchain/core/prompts");
const { queryTool } = require("./tool");
require("dotenv").config();

async function queryAgent(bussiness_detail, userQuestion, tenant_Id) {
  try {
    const llm = new ChatGoogleGenerativeAI({
      model: "gemini-2.5-flash-preview-05-20",
      temperature: 0,
      maxRetries: 2,
      apiKey: process.env.GEMINI_API_KEY,
    });
    const sysPrompt = new PromptTemplate({
      inputVariables: ["bussiness_detail", "userQuestion", "tenant_Id"],
      template: `Bạn là trợ lý hỏi đáp thông tin cho doanh nghiệp {bussiness_detail} có id là {tenant_Id}.
      
        Khách hàng hỏi: {userQuestion}.
        Dựa vào thông tin doanh nghiệp và câu hỏi, hãy trả lời câu hỏi của khách hàng một cách chính xác và đầy đủ nhất có thể.
        
        Bạn PHẢI sử dụng tool sau để tra cứu thông tin từ hệ thống:
        -**Query**: Truy vấn thông tin từ hệ thống dựa trên câu hỏi của khách hàng.

        Một câu hỏi có thể cần nhiều lần gọi tool để có đủ thông tin để trả lời.
        Nếu thông tin trả về từ các lần gọi tool không đủ để trả lời câu hỏi, bạn trả về "TÔI KHÔNG BIẾT, TÔI SẼ LIÊN HỆ NHÂN VIÊN CON NGƯỜI GIẢI ĐÁP CHO BẠN TRONG THỜI GIAN SỚM NHẤT".

        Quy trình trả lời của bạn như sau:
        1. **Sử dụng tool Query** để tra cứu thông tin từ hệ thống dựa trên câu hỏi của khách hàng.
        2. **Phân tích thông tin trả về** từ tool Query để xác định xem có đủ thông tin để trả lời câu hỏi hay không. Nếu có, trì trả lời, nếu không thì phải xét, trong các câu trả lời trả về, có ý nào liên quan. Nếu có thì tạo câu hỏi follow-up để lấy thêm thông tin.
        3. **Sử dụng tool Query** để gửi câu hỏi follow-up nếu cần thiết, hoặc trả lời câu hỏi của khách hàng nếu đã đủ thông tin.
        4. **Trả lời câu hỏi của khách hàng** dựa trên thông tin đã tra cứu và phân tích.

        `,
    });
    const prompt = await sysPrompt.format({
      bussiness_detail,
      userQuestion,
      tenant_Id,
    });
    const agent = createReactAgent({
      llm,
      tools: [queryTool],
      prompt,
      verbose: true,
    });
    const result = await agent.invoke({
      messages: [{ role: "user", content: userQuestion }],
    });
    const finalres =
      result?.messages
        ?.at(-1)
        ?.content?.replace(/^```json\n|\n```$/g, "")
        .trim() || "[❌ Không có phản hồi từ agent]";
    console.log("➡️ finalres từ agent:", finalres);
    const isValid = !finalres.includes("TÔI KHÔNG BIẾT");
    return { finalres, isValid };
  } catch (error) {
    console.error("❌ Lỗi khi khởi tạo agent:", error);
    return {
      finalres:
        "TÔI KHÔNG BIẾT, TÔI SẼ LIÊN HỆ NHÂN VIÊN CON NGƯỜI GIẢI ĐÁP CHO BẠN TRONG THỜI GIAN SỚM NHẤT",
      isValid: false,
    };
  }
}

module.exports = { queryAgent };