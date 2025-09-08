const { ensuresummary, updatesummary, del } = require("../redis/summary");
const { PromptTemplate } = require("@langchain/core/prompts");
const { genLLM } = require("../../config/gemini");

async function summaryGen(
  bussiness_detail,
  tenantId,
  conversationId,
  input,
  summary,
  finalResponseResult
) {
  const promptTemplate = PromptTemplate.fromTemplate(
    `Bạn là trợ lý tổng hợp hội thoại chuyên nghiệp cho doanh nghiệp {bussiness_detail}. Hãy cập nhật bản tóm tắt hội thoại theo QUY TRÌNH SAU:
        
        1. PHÂN TÍCH THÔNG TIN:
        - Đọc kỹ bản tóm tắt cũ: 
        - Phân tích tin nhắn mới
        - Phân tích câu trả lời mới
        - Xác định thông tin mới quan trọng cần thêm vào (vấn đề, yêu cầu, số liệu...)
        - Loại bỏ thông tin trùng lặp/không quan trọng/ đã giải quyết xong cũ và không thể giải quyết.
        
        Đặc biệt chú ý rằng các câu hỏi không liên quan đến nghiệp vụ của doanh nghiệp {bussiness_detail} không cần phải đưa vào bản tóm tắt.
      
        2. NGUYÊN TẮC VIẾT:
        - Giữ ngắn gọn < 250 từ
        - Dùng ngôn ngữ tự nhiên, mạch lạc
        - Ưu tiên thông tin mới nhất
        - Giữ lại các chi tiết quan trọng từ lịch sử
        - Ghi rõ trạng thái vấn đề (đã giải quyết/Không thể xử lý)
      
      
        ### VÍ DỤ MINH HỌA:
        Khách hàng phản ánh lỗi thanh toán, đã hướng dẫn reset cache
        Tin nhắn mới: "Tôi vẫn chưa thanh toán được, mã GD 2211 vẫn lỗi"
        
        =>
        - Lỗi thanh toán mã GD 2211 
        - Đã hướng dẫn reset cache nhưng chưa giải quyết được
        - Yêu cầu hỗ trợ kỹ thuật khẩn
        Trạng thái: Không thể xử lý
      
        ### THỰC HIỆN:
        Bản tóm tắt cũ: {summary}
        Tin nhắn mới: {input}
        Câu trả lời mới nhất {finalResponseResult}
        
        Bản cập nhật mới (viết bằng Tiếng Việt):`
  );
  const chain = promptTemplate.pipe(genLLM);
  const aiMsg = await chain.invoke({
    bussiness_detail,
    summary,
    input,
    finalResponseResult,
  });
  console.log("AI Message:", typeof aiMsg, ": ", aiMsg);
  await updatesummary(tenantId, conversationId, aiMsg.content);
  return aiMsg.content;
}
module.exports = { summaryGen };
