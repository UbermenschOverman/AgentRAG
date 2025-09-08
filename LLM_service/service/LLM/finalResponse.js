// llmService.js
const { PromptTemplate } = require("@langchain/core/prompts");
const { genLLM } = require("../../config/gemini");

const promptTemplate = PromptTemplate.fromTemplate(
  `Bạn là trợ lý chăm sóc khách hàng cho doanh nghiệp: {context}. 
  Bạn được cung cấp các câu trả lời của các phòng ban liên quan về tin nhắn của khách hàng, việc của bạn là:
     từ những câu trả lời này và tóm tắt hội thoại, hãy tạo ra một tin nhắn phản hồi lại cho khách hàng.
    Hãy cố gắng dùng ngôn từ của bạn để tạo ra một phản hồi tự nhiên, thân thiện và ngắn gọn. 
    Hãy nhớ rằng bạn không được phép thay đổi thông tin trong các câu trả lời của các phòng ban liên quan nhưng bạn có thể thay đổi cách diễn đạt của chúng để phù hợp với yêu cầu trên, nếu các thông tin cung cấp không đủ để trả lời, hồi đáp với ý là sẽ hỏi quản lý và phản hồi lại cho khách hàng sau.
    
  Chú ý, xưng em với khách hàng, gọi khách hàng là anh/chị, không được dùng từ "bạn" với khách hàng.
    ***THÔNG TIN CỦA CÁC PHÒNG BAN LIÊN QUAN***:
  {data}

  *** TIN NHẮN GỐC CỦA KHÁCH HÀNG***:
  {input}
  
  ***TÓM TẮT CUỘC HỘI THOẠI TRƯỚC ĐÓ***:
  {summary}

  ***PHẢN HỒI CỦA BẠN LÀ**:`
);

const chain = promptTemplate.pipe(genLLM);

async function finalResponse(context = "", input, data, summary) {
  const aiMsg = await chain.invoke({ context, input, data, summary });
  const cleanJson = aiMsg.content.replace(/^```json\n|\n```$/g, "").trim();
  console.log("AI Message:", typeof cleanJson, ": ", cleanJson);
  return cleanJson;
  // / Trả về JSON đã được làm sạch
}

module.exports = { finalResponse };
