// const { PromptTemplate } = require("@langchain/core/prompts");
// const { genLLM } = require("../LLM_connector/Gemini");

// async function multihop(tenantId, bussiness_detail, context, query) {
//       const llm = genLLM();
//       const promptTemplate = PromptTemplate.fromTemplate(
//         'Bạn là trợ lý hỏi đáp thông tin cho doanh nghiệp {bussiness_detail}. ' +
//         `Khách hàng hỏi: {query}. ` +
//         'Bạn được cung cấp kết quả truy vấn từ tương ứng từ vector data base: {context}. ' + 
//         `Dựa vào kết quả truy vấn và câu hỏi, hãy tạo câu hỏi follow-up để thỏa mãn yêu câu của khách. ` +
//       )
// }

// module.exports = { multihop };