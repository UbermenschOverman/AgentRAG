const { createReactAgent } = require("@langchain/langgraph/prebuilt");
const { ChatGoogleGenerativeAI } = require("@langchain/google-genai");
const { PromptTemplate } = require("@langchain/core/prompts");
const { getCampaigns } = require("./campagin");
const dayjs = require("dayjs");

const {
  ragTool,
  reservationTool,
  assetSearchTool,
  escalatedMesTool,
} = require("./ragTool");

require("dotenv").config(); // Tải biến môi trường từ file .env
// ===== MAIN (Dùng để thử nghiệm agent) =====
async function reActAgent(
  tenantId,
  conversationId,
  businessDescription,
  userInput,
  summary,
  sub_prompt,
  userInformation,
  clientId,
  mode
) {
  console.log("--- Running ReAct Agent Test ---");

  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey) {
    console.error("Lỗi: Biến môi trường GEMINI_API_KEY chưa được thiết lập.");
    console.log(
      "Hãy tạo file .env ở thư mục gốc của dự án và thêm vào dòng: GEMINI_API_KEY=your_actual_api_key"
    );
    return;
  }

  const model = new ChatGoogleGenerativeAI({
    model: "gemini-2.5-flash-preview-05-20",
    temperature: 0,
    maxRetries: 2,
    apiKey: geminiApiKey,
  });

  const now = dayjs();
  const today_with_weekday = now.format("dddd, YYYY-MM-DD HH:mm:ss");
  tenantId = tenantId || " "; // Gán tạm
  businessDescription = businessDescription || " ";
  conversationId = conversationId || " "; // Gán tạm
  summary = summary || " ";
  userInformation = userInformation || "";
  const campaigns = (await getCampaigns(tenantId)) || []; // Lấy danh sách chiến dịch từ cơ sở dữ liệu
  const sysPrompt = new PromptTemplate({
    inputVariables: [
      "businessDescription",
      "tenantId",
      "conversationId",
      "today_time_date",
      "sub_prompt",
      "userInput",
      "summary",
      "userInformation",
      "clientId",
      "campaigns",
      "mode", // Thêm mode vào inputVariables
    ],
    template: `Bạn là trợ lý hỗ trợ khách hàng ảo của doanh nghiệp {businessDescription}. 
    Dựa trên chế độ vận hành của doanh nghiệp, bạn sẽ đóng vai trò: a, chế độ vận hành = auto bạn là nhân viên giao tiếp trực tiếp với khách hàng. b, chế độ vận hành là manual bạn là hệ trợ giúp quyết định, cung cấp phản hồi gợi ý cho nhân viên con người.

    Dù vai trò của bạn là gì, mục tiêu của bạn là thỏa mãn nhu của khách hàng dựa trên ngữ cảnh. 
    Câu trả lời của bạn cần phải tự nhiên và lịch sự, khuyến khích cung cấp giải thích để câu trả lời thuyết phục hơn. 

    Để bắt đầu quá trình, bạn sẽ được cung cấp ***Tin nhắn của khách hàng*** và ***Gợi ý sử dụng công cụ***
    Biết ***Gợi ý sử dụng công cụ*** luôn có dạng là một mảng các ý định đã trích xuất từ ***Tin nhắn của khách hàng*** và API gợi ý tương ứng.
    Chú ý với API ChitChat, câu trả lời đã chứa trong ***Gợi ý sử dụng công cụ***. Còn các API khác thì bạn phải gọi công cụ để lấy kết quả.
    Nếu sub-prompt có API = \"Chitchat API\", bạn không được gọi bất kỳ công cụ nào khác, kể cả RAG hoặc Reservation.
    *** TRẢ LỜI MÀ KHÔNG GỌI CÔNG CỤ NÀO SẼ BỊ TÍNH LÀ VI PHẠM. NGOẠI TRỪ TRƯỜNG HỢP CHITCHAT API.
    *** TRẢ LỜI PHẢI ĐÁP ỨNG ĐƯỢC NHU CẦU CỦA KHÁCH HÀNG, NẾU KHÔNG THÌ PHẢI GỌI CÔNG CỤ ĐỂ LẤY KẾT QUẢ. KHÔNG TRẢ VỀ QUÁ TRÌNH LÊN KẾ HOẠCH.

    Các tool mà bạn có thể sử dụng:
    1. Reservation: Công cụ này thực hiện lên đơn cũng như cập nhật đơn sử dụng dịch vụ. Gọi khi khách hàng thể hiện nhu cầu sử dụng dịch vụ hoặc cung cấp thông tin để hoàn thiện quy trình lên đơn, LUÔN PHẢI GỌI CÔNG CỤ NÀY KHI ĐƯỢC NHẬN GỢI Ý SỬ DỤNG CÔNG CỤ.
    
    2. RAG: Công cụ này sẽ cung cấp câu trả lời cho các thắc mắc liên quan đến doanh nghiệp kèm theo giải thích chi tiết lý do cho câu trả lời đó. Công cụ này hoạt động tốt nhất khi câu hỏi chỉ chứa 1 intent, nếu câu hỏi có nhiều intent, hãy chia nhỏ nó ra thành các câu hỏi đơn giản hơn và hỏi lại. Công cụ này không thể tìm kiếm ảnh, chỉ tìm kiếm văn bản

    3. assetSearch: Công cụ này tìm kiếm hình ảnh/ file trong cơ sở dữ liệu của doanh nghiệp dựa trên mô tả. Gọi khi khách hàng yêu cầu hình ảnh/ assets liên quan đến doanh nghiệp hoặc bạn nhận thấy hình ảnh/assets là cần thiết để trả lời câu hỏi của khách hàng.

    4. ComplaintEscalation: Công cụ này sẽ chuyển tiếp thông tin khiếu nại lên nhân viên phụ trách. Gọi khi khách hàng có khiếu nại, phàn nàn về dịch vụ hoặc yêu cầu hỗ trợ từ nhân viên con người.

      ***Ví dụ minh họa 1 (KHÔNG phải input):
      "Tin nhắn": Cho tôi đặt bàn nếu nhà hàng có món chay.
      "Gợi ý sử dụng công cụ":
      [
        {{"Rank": "1", "sub_prompt": "khách hàng hỏi về món chay của nhà hàng", "result": null, "API": "RAG"}},
        {{"Rank": "2", "sub_prompt": "Nếu nhà hàng có món chay thì khách muốn đặt bàn", "result": null, "API": "Reservation"}}
      ]

      Xử lý:
      - Bạn thấy hai sub_prompt có ràng buộc điều kiện.
      - Gọi RAG để xử lý sub_prompt Rank 1.
      - Nếu RAG trả lời là "có", tiếp tục gọi Reservation.
      - Nếu RAG trả lời là "không", không gọi Reservation nữa.

      Hướng dẫn:
      - Xử lý lần lượt theo thứ tự Rank.
      - Luôn kiểm tra ràng buộc logic nếu có.
      - Khi xử lý ChitChat API thì không gọi công cụ.

      ***Ví dụ 2 (KHÔNG phải input):
      "Gợi ý sử dụng công cụ":
      [
        {{"Rank": 1, "sub_prompt": "Khách nói: Cảm ơn bạn!", "result": "Cảm ơn anh/chị đã liên hệ!", "API": "Chitchat API"}}
      ]
      Xử lý:
      - Vì API là Chitchat, bạn không gọi bất kỳ công cụ nào khác.
      - Bạn chỉ cần viết lại câu trả lời từ \"result\" theo cách thân thiện và phù hợp với doanh nghiệp.

      Kết quả cuối cùng:
      - "Cảm ơn anh/chị đã liên hệ, thông tin của anh/chị đã được lưu lại, nhân viên của bên em sẽ liên hệ lại với anh chị trong thời gian sớm nhất!".

    ***ĐẶC BIỆT LƯU Ý:***
    luôn xưng em, gọi khách hàng bằng anh/ chị, không dùng từ "bạn" hay "mày". Chủ động viết lại câu trả lời để phù hợp với ràng buộc trên.
    Không được tư vấn về các dịch vụ mà khách hàng không hỏi đến, chỉ trả lời các câu hỏi liên quan đến dịch vụ mà khách hàng đã đề cập. Tư vấn tự động mà không có yêu cầu sẽ bị coi là VI PHẠM.
    TRẢ LỜI MÀ KHÔNG GỌI CÔNG CỤ NÀO SẼ BỊ TÍNH LÀ VI PHẠM. NGOẠI TRỪ TRƯỜNG HỢP CHITCHAT API.
    ĐỐI VỚI CÁC CÂU HỎI LIÊN QUAN ĐẾN NGHIỆP VỤ, BẠN PHẢI GỌI CÔNG CỤ RAG ĐỂ TÌM KIẾM THÔNG TIN. BẠN KHÔNG ĐƯỢC VI PHẠM LUẬT NÀY
    
    =====BẮT ĐẦU XỬ LÝ=====
    Mô tả của doanh nghiệp : {businessDescription}
    Các sự kiện đang diễn ra của doanh nghiệp: {campaigns}
    Trạng thái vận hành của doanh nghiệp: {mode}
    Thông tin khách hàng: {userInformation}
    Tenant ID hiện tại: {tenantId}
    ID cuộc trò chuyện: {conversationId}
    ID khách hàng: {clientId}
    Thời gian hiện tại: {today_time_date}
    Tóm tắt nội dung cuộc trò chuyện trước đó: {summary}

***Gợi ý sử dụng công cụ***
{sub_prompt}
    `,
  });
  //"businessDescription", "tenantId", "conversationId", "today_time_date", "sub_prompt", "input"
  const prompt = await sysPrompt.format({
    businessDescription: businessDescription,
    tenantId: tenantId,
    conversationId: conversationId,
    today_time_date: today_with_weekday,
    summary: summary,
    userInput: userInput,
    sub_prompt: sub_prompt,
    userInformation: userInformation,
    clientId: clientId, // Thêm clientId nếu có
    campaigns: campaigns, // Chuyển đổi mảng campaigns thành chuỗi
    mode: mode  // Thêm mode vào prompt
  });
  // console.log("System Prompt:", prompt); // In ra để kiểm tra

  const agent = createReactAgent({
    llm: model,
    tools: [ragTool, reservationTool, assetSearchTool, escalatedMesTool], // Agent sẽ tự biết về tool này và mô tả của nó
    prompt: prompt, // Sử dụng chuỗi prompt đã được cập nhật
  });

  try {
    let result = await agent.invoke({
      messages: [{ role: "user", content: userInput }], // ✅ đúng định dạng expected
    });
    console.log("\n======Gọi agent với input sau=====\n", {
      businessDescription: businessDescription,
      tenantId: tenantId,
      conversationId: conversationId,
      today_time_date: today_with_weekday,
      summary: summary,
      userInput: userInput,
      sub_prompt: sub_prompt,
      userInformation: userInformation,
    });
    // console.log("\n=== Agent Raw Response ===\n", result, "\n", typeof result);
    const finalResponse = result?.messages?.at(-1)?.content; // Trả về phản hồi cuối cùng của agent
    return finalResponse;
  } catch (error) {
    console.error("\n❌ Error invoking agent:", error);
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error("Unhandled error in main:", err);
  });
}

module.exports = { reActAgent };
