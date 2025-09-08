const { PromptTemplate } = require("@langchain/core/prompts");
const { genLLM } = require("../LLM_connector/Gemini");
const dayjs = require("dayjs");
const {getCampaigns} = require("../reservation_handler/agent/campaign");
async function answering(tenantId, bussiness_detail, context, query) {
  const llm = genLLM();
  const now = dayjs();
  const today_with_weekday = now.format("dddd, YYYY-MM-DD HH:mm:ss");
  const campaigns = await getCampaigns(tenantId);
  const promptTemplate = PromptTemplate.fromTemplate(
    `Bạn là trợ lý hỏi đáp đáng tin cậy cho doanh nghiệp {bussiness_detail}.

Biết ngày hôm nay là {today_with_weekday} 
Các sự kiện, chương trình khuyến mãi hiện tại của doanh nghiệp là: {campaigns}

Trả lời câu hỏi bên dưới theo 2 bước:
1. **Giải thích suy luận của bạn dựa trên tài liệu và sự kiên được cung cấp**
2. **Đưa ra câu trả lời cuối cùng**

Nếu trong tài liệu không có thông tin nào liên quan đến câu hỏi, và câu hỏi không liên hệ trực tiếp đến các sự kiện, chương trình khuyến mãi hiện tại, hãy trả lời "TÔI KHÔNG BIẾT, TÔI SẼ LIÊN HỆ NHÂN VIÊN CON NGƯỜI GIẢI ĐÁP CHO BẠN TRONG THỜI GIAN SỚM NHẤT".

***TÀI LIỆU THAM KHẢO***: {context}
***CÂU HỎI***: {query}

**Giải thích suy luận:**
...
**Câu trả lời:**`
  );

  const chain = promptTemplate.pipe(llm);
  const aiMsg = await chain.invoke({ bussiness_detail, context, query, today_with_weekday,campaigns });

  const answer = aiMsg.content?.trim() || "";

  // ✅ Check nếu mô hình nói "TÔI KHÔNG BIẾT"
  const isValid = !answer.toUpperCase().includes("TÔI KHÔNG BIẾT");

  console.log("➡️ Câu trả lời:", answer);
  console.log("✅ Có giá trị không?", isValid);

  return { answer, isValid };
}

module.exports = { answering };
