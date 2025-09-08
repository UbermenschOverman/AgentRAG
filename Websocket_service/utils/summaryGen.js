const client = require("../redis/data_structure/tenant_Client");
const {getContext} = require("../tenent_service/tenantService.js");
const conversation = require("../redis/data_structure/conversation_Store");
const { PromptTemplate } = require("@langchain/core/prompts");
const { ChatGoogleGenerativeAI } = require("@langchain/google-genai");
require('dotenv').config();

// lấy environment từ biến môi trường
const geminiApiKey = process.env.GEMINI_API_KEY;

const genLLM = new ChatGoogleGenerativeAI({
    model: "gemini-2.0-flash",
    temperature: 0,
    maxRetries: 2,
    apiKey: geminiApiKey,
});

// buildContextOnSystemReply summaryGen
async function buildContextOnSystemReply(
  tenantId,
  conversationId,
  input,
  response
) {
  // lấy summary từ redis
  const {clientId} = await conversation.getMetaData(tenantId, conversationId);
  if(!clientId?.trim()){
    throw new Error("ClientId is not found in conversation metadata");
  }
  const {summary} = await client.getClientData(tenantId, clientId);

  // lấy thông tin doanh nghiệp
  const businessDetail = await getContext(tenantId);

  const promptTemplate = PromptTemplate.fromTemplate(
    `Bạn là trợ lý tổng hợp hội thoại chuyên nghiệp cho doanh nghiệp {bussiness_detail}. Hãy cập nhật bản tóm tắt hội thoại theo QUY TRÌNH SAU:
        
        1. PHÂN TÍCH THÔNG TIN:
        - Đọc kỹ bản tóm tắt cũ: 
        - Phân tích tin nhắn mới
        - Phân tích câu trả lời mới
        - Xác định thông tin mới quan trọng cần thêm vào (vấn đề, yêu cầu, số liệu...)
        - Loại bỏ thông tin trùng lặp/không quan trọng/ đã giải quyết xong
      
        2. NGUYÊN TẮC VIẾT:
        - Giữ ngắn gọn < 250 từ
        - Dùng ngôn ngữ tự nhiên, mạch lạc
        - Ưu tiên thông tin mới nhất
        - Giữ lại các chi tiết quan trọng từ lịch sử
        - Ghi rõ trạng thái vấn đề (đã giải quyết/đang xử lý)
      
      
        ### VÍ DỤ MINH HỌA:
        Khách hàng phản ánh lỗi thanh toán, đã hướng dẫn reset cache
        Tin nhắn mới: "Tôi vẫn chưa thanh toán được, mã GD 2211 vẫn lỗi"
        
        =>
        - Lỗi thanh toán mã GD 2211 
        - Đã hướng dẫn reset cache nhưng chưa giải quyết được
        - Yêu cầu hỗ trợ kỹ thuật khẩn
        Trạng thái: Đang xử lý
      
        ### THỰC HIỆN:
        Bản tóm tắt cũ: {summary}
        Tin nhắn mới: {input}
        Câu trả lời mới nhất {finalResponseResult}
        
        Bản cập nhật mới (viết bằng Tiếng Việt):`
  );
  const chain = promptTemplate.pipe(genLLM);
  const aiMsg = await chain.invoke({
    bussiness_detail: businessDetail,
    summary,
    input,
    finalResponseResult: response,
  });
  console.log("AI Message:", typeof aiMsg, ": ", aiMsg);
  // Lưu bản tóm tắt vào Redis
   await client.update(tenantId, clientId, conversationId, {summary: aiMsg.content});
  return aiMsg.content;
}

async function buildContextOnClientMessage(
    tenantId,
  conversationId,
  clientId,
  input,
){
  // lấy summary từ redis
  const {summary} = await client.getClientData(tenantId, clientId);
  // Lấy các tin nhắn gấn nhất không phải là của khách
  const history = await conversation.getMessagesSinceLastUserMessage(tenantId, conversationId);
  // lấy thông tin doanh nghiệp
  const businessDetail = await getContext(tenantId);
  const promptTemplate = PromptTemplate.fromTemplate(
    `Bạn là trợ lý hỗ trợ tóm tắt hội thoại chuyên nghiệp của doanh nghiệp {bussiness_detail}. 

Hãy cập nhật bản tóm tắt theo QUY TRÌNH SAU:

1. PHÂN TÍCH THÔNG TIN:
- Đọc kỹ bản tóm tắt cũ: Xác định vấn đề tồn đọng, trạng thái xử lý
- Phân tích history (tin nhắn từ doanh nghiệp): 
   + Kiểm tra giải pháp/nội dung đã cung cấp
   + Đánh dấu vấn đề ĐÃ GIẢI QUYẾT nếu có phản hồi thích hợp
- Phân tích input mới (tin nhắn khách): 
   + Phát hiện yêu cầu/vấn đề mới 
   + Ghi nhận thông tin quan trọng (mã GD, lỗi kỹ thuật...)
- Loại bỏ thông tin đã xử lý xong hoặc trùng lặp
- Loại bỏ các câu hỏi đã được trả lời

2. NGUYÊN TẮC VIẾT:
- Chỉ giữ lại <250 từ, ưu tiên thông tin MỚI NHẤT
- Dùng tiếng Việt tự nhiên, mạch lạc
- Chỉ giữ những việc Đang xử lý và thông tin của khách hàng
- Kết hợp thông tin từ cả 3 nguồn: summary cũ, history và input

### VÍ DỤ:
Bản cũ: Khách báo lỗi thanh toán GD2211, đang chờ kỹ thuật
History: ["Đã gửi hướng dẫn reset cache lúc 14:30"]
Input mới: "Tôi làm theo rồi vẫn lỗi, thêm lỗi hiện GD2215"

=> 
- Lỗi thanh toán GD2211: Đã hướng dẫn reset cache nhưng chưa khắc phục (Đang xử lý)
- Phát sinh lỗi mới GD2215 khi thực hiện giao dịch (Yêu cầu mới)
Trạng thái tổng: Đang xử lý

### THỰC HIỆN:
Bản tóm tắt cũ: {summary} 
History: {history} 
Input mới: {input}

Bản cập nhật mới (Tiếng Việt):
    `
  )
 const chain = promptTemplate.pipe(genLLM);
 const aiMsg = await chain.invoke({
    bussiness_detail: businessDetail,
    summary,
    history,
    input
  });
  console.log("AI Message:", typeof aiMsg, ": ", aiMsg);
  // Lưu bản tóm tắt vào Redis
  await client.update(tenantId, clientId, conversationId, {summary: aiMsg.content});
  return aiMsg.content;
}
module.exports = { buildContextOnSystemReply, buildContextOnClientMessage };
