const { tool } = require("@langchain/core/tools");
const { z } = require("zod");
const axios = require("axios");
require("dotenv").config(); // Tải biến môi trường từ file .env
const {RAG} = require('../toolCalling');
const {escalatedMesProducer} = require("../../Kafka/escalatedProducer");
const { imageSearch } = require("./imageSearch");

const baseUrl = process.env.RESERVATION || "http://localhost:7101/reservation";
const baseUrlRAG = process.env.RAG || "http://localhost:7101/query";

// ===== TOOL ĐỊNH NGHĨA =====
// tool để thực hiện truy vấn RAG (Retrieval-Augmented Generation)
const ragTool = tool(
  async (inputArgs) => { // Đổi tên tham số để rõ ràng hơn
    const { 
      tenantId, clientId, conversationId, query, summary, mode, bussinessDetail
    } = inputArgs;
    console.log("[ragTool] Called with:", { query, bussinessDetail, tenantId });

    if (!query || !bussinessDetail || !tenantId) {
      // Trả về một chuỗi lỗi thay vì throw để agent có thể xử lý như một observation
      const missingParams = [];
      if (!query) missingParams.push("query");
      if (!bussinessDetail) missingParams.push("bussinessDetail");
      if (!tenantId) missingParams.push("tenantId");
      const errorMessage = `[ragTool] Missing required parameters: ${missingParams.join(", ")}. Please provide all necessary details.`;
      console.error(errorMessage);
      return errorMessage;
    }
    // Đây là nơi bạn thực thi truy vấn thật trong thực tế
    // Ví dụ: Dựa vào query, bussinessDetail, tenantId để tìm thông tin
    // Trong ví dụ này, chúng ta trả về thông tin cố định
    const response = await RAG(query, bussinessDetail, tenantId);
    console.log("valid: ",response.isValid, "mode: ", mode, "type: ", typeof response.isValid,"mode: ", typeof mode );
    if ( !response.isValid && mode === 'auto') {
      const requestId = conversationId + "-" + Date.now(); // Tạo ID yêu cầu duy nhất
      // gủi kafka
        await escalatedMesProducer(tenantId, clientId, conversationId, query, "", requestId, "", 'hỏi đáp');
        return {"phản hồi từ trợ lý RAG": "Xin lỗi, tôi không thể trả lời câu hỏi này. Tôi đã chuyển tiếp đến nhân viên hỗ trợ. Bạn báo với khách hàng và coi như đã giải quyết xong."};
    }

    return {"phản hồi từ trợ lý RAG": response.answer};
  },
  {
    name: "RAG",
    description:
      "Trả lời các câu hỏi liên quan đến doanh nghiệp kèm theo giải thích chi tiết lý do cho câu trả lời đó. Công cụ này hoạt động tốt nhất khi câu hỏi chỉ chứa 1 intent, nếu câu hỏi có nhiều intent, hãy chia nhỏ nó ra thành các câu hỏi đơn giản hơn và hỏi lại.",
    schema: z.object({
      query: z.string().describe("Câu hỏi của khách."),
      bussinessDetail: z.string().describe("Mô tả doanh nghiệp. Ví dụ: 'Mikan Village - Khu nghỉ dưỡng cuối tuần phong cách Nhật tại Yên Bái, Ba Vì, Hà Nội.'"),
      tenantId: z.string().describe("ID đơn vị kinh doanh. Ví dụ: 'VillaChunk'"),
      clientId: z.string().describe("ID khách hàng. Ví dụ: 'client123'"),
      conversationId: z.string().describe("ID cuộc trò chuyện. Ví dụ: 'conversation456'"),
      summary: z.string().describe("Tóm tắt nội dung cuộc trò chuyện trước đó."),
      mode: z.enum(['auto','manual']).describe("Trạng thái vận hành của doanh nghiệp. Ví dụ: 'auto' hoặc 'manual'."),
    }),
  }
);

// tool để thực hiện truy vấn Lên đơn (Reservation)
const reservationTool = tool(
  async (inputArgs) => { // Đổi tên tham số để rõ ràng hơn
    const { context, intent, tenantId, conversationId, clientId } = inputArgs;
    console.log("[ReservationTool] Called with:", { context, intent, tenantId, conversationId });

    if (!context || !intent || !tenantId || !conversationId) {
      // Trả về một chuỗi lỗi thay vì throw để agent có thể xử lý như một observation
      const missingParams = [];
      if (!context) missingParams.push("context");
      if (!intent) missingParams.push("intent");
      if (!tenantId) missingParams.push("tenantId");
      if (!conversationId) missingParams.push("conversationId");
      const errorMessage = `[ReservationTool] Missing required parameters: ${missingParams.join(", ")}. Please provide all necessary details.`;
      console.error(errorMessage);
      return errorMessage;
    }

    // Đây là nơi bạn thực thi truy vấn thật trong thực tế
    // Ví dụ: Dựa vào context, intent, tenantId, conversationId để tìm thông tin
    // Trong ví dụ này, chúng ta trả về thông tin cố định
    const response = await axios.post(baseUrl, {
                context,
                intent,
                tenantId,
                conversationId,
                clientId: clientId || null // Thêm clientId nếu có
            });
            const { orderId, content, meta , response:LLM_res, remainingFields } = response.data;
            console.log("Response from Reservation API:", response.data);

    return {"đơn hiện tại": content, "trạng thái xử lý": meta, "phản hồi từ trợ lý lên đơn": LLM_res, "remainingFields": remainingFields};
  },
  {
    name: "Reservation",
    description:
      "Thực hiện lên đơn sử dụng dịch vụ. Công cụ này cần các thông tin: ngữ cảnh (context), ý định của khách hàng (intent), ID đơn vị kinh doanh (tenantId), và ID cuộc trò chuyện (conversationId).",
    schema: z.object({
      context: z.string().describe("Mô tả doanh nghiệp."),
      intent: z.string().describe("Mô tả tin nhắn hiện tại của khách hàng hoặc thông tin cần thiết để lên đơn"),
      tenantId: z.string().describe("ID đơn vị kinh doanh."),
      conversationId: z.string().describe("ID cuộc trò chuyện."),
      clientId: z.string().describe("ID khách hàng"),
    }),
  }
);

// assetSearchTool là một công cụ tìm kiếm hình ảnh dựa trên mô tả
const assetSearchTool = tool(
  async (inputArgs) => {
    const { tenantId, imagedescription } = inputArgs;
    console.log("[assetSearchTool] Called with:", { tenantId, imagedescription });

    if (!tenantId || !imagedescription) {
      // Trả về một chuỗi lỗi thay vì throw để agent có thể xử lý như một observation
      const missingParams = [];
      if (!tenantId) missingParams.push("tenantId");
      if (!imagedescription) missingParams.push("imagedescription");
      const errorMessage = `[imageSearchTool] Missing required parameters: ${missingParams.join(", ")}. Please provide all necessary details.`;
      console.error(errorMessage);
      return errorMessage;
    }

    // Gọi hàm tìm kiếm hình ảnh
    const results = await imageSearch(tenantId, imagedescription);
    // json hóa kết quả để trả về
    if (!results || results.length === 0) {
      console.warn("[assetSearchTool] No assets found for the given description.");
      return {"Matchingassets": "Không tìm thấy hình ảnh nào phù hợp với mô tả."};
    }
    return {"Matchingasset": results};
  },
  {
    name: "AssetSearch",
    description:
      "Tìm kiếm hình ảnh/ file dựa trên mô tả. Cần ID đơn vị kinh doanh và mô tả hình ảnh/file.",
    schema: z.object({
      tenantId: z.string().describe("ID đơn vị kinh doanh."),
      imagedescription: z.string().describe("Mô tả hình ảnh cần tìm kiếm."),
    }),
  }
);

// escalatedMesTool là một công cụ để gửi thông tin chuyển tiếp lên Kafka
const escalatedMesTool = tool(
  async (inputArgs) => {
    try{
    const { tenantId, clientId, conversationId, input, text, requestId, escalatedReason, mode, tag } = inputArgs;
    console.log("[escalatedMesTool] Called with:", { tenantId, clientId, conversationId, input, text, requestId, escalatedReason });
    if(mode =="manual"){return {"message": "Chế độ vận hành là manual, đã chuyển tiếp thành công."};}
    if (!tenantId || !clientId || !conversationId || !input || !text || !requestId || !escalatedReason) {
      // Trả về một chuỗi lỗi thay vì throw để agent có thể xử lý như một observation
      const missingParams = [];
      if (!tenantId) missingParams.push("tenantId");
      if (!clientId) missingParams.push("clientId");
      if (!conversationId) missingParams.push("conversationId");
      if (!input) missingParams.push("input");
      if (!text) missingParams.push("text");
      if (!requestId) missingParams.push("requestId");
      if (!escalatedReason) missingParams.push("escalatedReason");
      const errorMessage = `[escalatedMesTool] Missing required parameters: ${missingParams.join(", ")}. Please provide all necessary details.`;
      console.error(errorMessage);
      return errorMessage;
    }

    // Gọi hàm gửi thông tin chuyển tiếp lên Kafka
    await escalatedMesProducer(tenantId, clientId, conversationId, input, text, requestId, escalatedReason,tag);
    return {"message": "Thông tin đã được gửi thành công."};
  } catch (error) {
      console.error("[escalatedMesTool] Error sending escalated message:", error);
      return {"error": `Không thể gửi thông tin chuyển tiếp: ${error.message}`};
    }
  },
  {
    name: "ComplaintEscalation",
    description:
      "Gửi thông tin chuyển tiếp lên Kafka. Cần các thông tin: ID đơn vị kinh doanh (tenantId), ID khách hàng (clientId), ID cuộc trò chuyện (conversationId), câu hỏi của người dùng (input), câu trả lời của chatbot (text), ID yêu cầu (requestId) và lý do chuyển tiếp (escalatedReason).",
    schema: z.object({
      tenantId: z.string().describe("ID đơn vị kinh doanh."),
      clientId: z.string().describe("ID khách hàng."),
      conversationId: z.string().describe("ID cuộc trò chuyện."),
      input: z.string().describe("Câu hỏi của người dùng."),
      text: z.string().describe("Câu trả lời của chatbot."),
      requestId: z.string().describe("ID của yêu cầu."),
      escalatedReason: z.string().describe("Lý do chuyển tiếp. cung cấp ngữ cảnh cho người tiếp nhận thông tin."),
      mode: z.string().describe("Chế độ vận hành của doanh nghiệp. Ví dụ: 'auto' hoặc 'manual'."),
      tag: z.enum(["khiếu nại", "hỏi đáp"]).describe("Phân loại thông tin chuyển tiếp. Chỉ chấp nhận 'khiếu nại' hoặc 'hỏi đáp'.")
    }),
  }

)

module.exports = { ragTool, reservationTool, assetSearchTool, escalatedMesTool };