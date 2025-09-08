const { PromptTemplate } = require("@langchain/core/prompts");
const { genLLM } = require("../LLM_connector/Gemini");

async function rewriteQuery(business_detail, query, context, answer) {
  // Khởi tạo LLM
  const llm = genLLM();

  // Tạo prompt template cho việc cải tiến câu hỏi
  const promptTemplate = PromptTemplate.fromTemplate(
    `
    bạn là nhân viên tạo câu hỏi của doanh nghiệp {business_detail}
bạn sẽ được cung cấp câu hỏi của khách hàng và thông tin tra cứu được ở vòng trước.
Biết câu hỏi này đã được tìm kiếm và nhân viên vòng trước không thể đưa ra câu trả lời từ dữ liệu trả về .

Nhiệm vụ của bạn là từ các thông tin tra cứu được, phản hồi của vòng trước và câu hỏi của khách, tạo ra N truy vấn followup giúp hệ thống có đủ thông tin để trả lời.
Các truy vấn mới có thể là phiên bản của câu hỏi ban đầu được viết lại với vốn từ chuyên ngành hơn, hoặc là các đơn vị kiến thức mà có liên quan/ khách hàng đề cập tới.
bạn tự chọn N trong khoảng 0 đến 1 tùy theo mức độ đáp ứng của tài liệu và độ phức tạp của câu hỏi với N=0 khi tài liệu cung cấp hoàn toàn không liên quan gì tới câu hỏi.

// Nếu N=0 trả lời ***TÔI KHÔNG BIẾT***

Câu hỏi mới cần được làm sạch filler word như "tôi, hỏi, bao nhiêu, như, là, ...". Làm sạch stopword.

===Tin nhắn của khách hàng:
    {query}
===Thông tin tra cứu được:
    {context}
=== Lý do không trả lời được câu hỏi:
    {answer}
===Câu hỏi mới:
    `
  );

  // Tạo chain với prompt template và LLM
  const chain = promptTemplate.pipe(llm);

  try {
    // Gửi request và nhận câu trả lời cải tiến
    const aiResponse = await chain.invoke({ business_detail, query, context, answer });
    const rewrittenQuery = aiResponse.content?.trim();
    console.log("Câu hỏi mới:", rewrittenQuery);
    return rewrittenQuery;
  } catch (error) {
    console.error("Lỗi khi cải tiến câu hỏi:", error);
    throw error;
  }
}

module.exports = { rewriteQuery };
