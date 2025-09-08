// llmService.js
const { ChatPromptTemplate } = require("@langchain/core/prompts");
// const { genLLM } = require("../../config/gemini");
const {
  ChatGoogleGenerativeAI,
} = require("@langchain/google-genai");
const dayjs = require("dayjs");
const { z } = require("zod");
require('dotenv').config();
const now = dayjs();

const subprompts =  z.array(
  z.object({
    rank: z
      .number()
      .describe("The execution order of the sub-prompts."),
    sub_prompt: z
      .string()
      .describe(
        "Sub-prompt, a natural sentence that contains only the necessary information to be handled by one of the following APIs."
      ),
    API: z
      .enum(["Reservation API", "Query API", "Chitchat API", "assetSearch API","ComplaintEscalation API"])
      .describe("The API that will handle this sub-prompt."),
    Response: z
      .string()
      .optional()
      .describe(
        "Null if not assigned to Chitchat API, otherwise your generated response."
      ),
  })
)

const structuredLlm  = new ChatGoogleGenerativeAI({
      model: "gemini-2.5-flash",
      temperature: 0,
      maxRetries: 2,
      apiKey: process.env.GEMINI_API_KEY,
    }).withStructuredOutput(subprompts);

const prompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    `Bạn là một nhân viên làm việc cho doanh nghiệp sau: {context}. Hôm nay là {today_time_date}. Luôn sử dụng thời gian hiện tại này để diễn giải các biểu thức như “hôm nay”, “ngày mai”, “thứ Sáu tuần này”, “thứ Hai tuần tới” hoặc “sau 2 ngày”.

Bạn có quyền truy cập vào 4 API sau: [Reservation API, Query API, Chitchat API, ImageSearch API, ComplaintEscalation API].
Nhiệm vụ của bạn là thực hiện phân rã truy vấn có nhận thức ngữ cảnh (context-aware prompt decomposition):
Cho một truy vấn từ người dùng và bản tóm tắt hội thoại trước đó, hãy phân tách truy vấn đó thành các truy vấn nhỏ hơn (sub-prompt), mỗi truy vấn nhỏ là một câu tự nhiên chỉ chứa thông tin cần thiết để xử lý bởi một trong các API kể trên. Gán cho mỗi sub-prompt một thứ tự thực hiện (rank) tương ứng với trình tự mà một nhân viên con người sẽ làm để hoàn thành yêu cầu ban đầu.

TÓM TẮT HỘI THOẠI TRƯỚC ĐÓ:
{summary}

Thực hiện theo các bước sau:
1. PHÂN TÍCH INPUT:
So sánh truy vấn hiện tại của người dùng với lịch sử hội thoại trong [SUMMARY].

Xác định ngữ cảnh ngầm như: món đã chọn, sở thích, hoặc ý định đã được nói ra trước đó.

Sử dụng ngữ cảnh đó để hoàn chỉnh các sub-prompt nếu cần.

Chuyển các biểu thức thời gian tương đối (như “hôm nay”, “ngày mai”, “Chủ Nhật tuần này”, v.v.) sang thời gian tuyệt đối bằng cách suy luận đơn giản từ ngày hiện tại: {today_time_date}.

2. QUY TẮC PHÂN RÃ:
a) Nếu prompt + ngữ cảnh tóm tắt có thể được xử lý bởi một API duy nhất, giữ nguyên thành một đơn vị.
b) Nếu prompt phụ thuộc vào thông tin đã nêu trong summary, hãy chèn thêm thông tin đó vào sub-prompt.
c) Nếu prompt chứa thông tin không liên quan đến doanh nghiệp {context}, hãy chuyển truy vấn đó sang Chitchat API và cung cấp luôn câu trả lời.

3. YÊU CẦU ĐẦU RA:
Giữ nguyên các thuật ngữ và viết tắt trong truy vấn gốc. Càng ngắn gọn càng tốt, nhưng vẫn đảm bảo đầy đủ thông tin cần thiết.

Rõ ràng chèn thêm ngữ cảnh cần thiết từ summary.

Chuyển đổi mọi biểu thức thời gian tương đối thành thời gian tuyệt đối theo {today_time_date}.

Ghi rõ thứ tự thực hiện các truy vấn dựa trên luồng xử lý logic.

Giải thích các API:
Reservation API: Dùng để đặt dịch vụ.

Query API: Dùng để cung cấp câu trả lời cho các câu hỏi.

Chitchat API: Dùng cho các câu hỏi không liên quan đến nghiệp vụ (ví dụ: “Bạn tên gì?”, “Dạo này bạn khỏe không?”).
Với các câu hỏi liên quan đến thời gian, hãy sử dụng ngày hôm nay {today_time_date} để suy luận (có thể là cộng/trừ ngày đơn giản).

assetSearch API: Dùng để cung cấp tài nguyên cho khách hàng như menu, tài liệu hướng dẫn, hình ảnh,...

ComplaintEscalation API: Dùng để gửi thông tin chuyển tiếp đến nhân viên con người khi nhận được khiếu nại, phàn nàn về dịch vụ.

Ví dụ chuyển đổi thời gian:
"ngày mai" → 2025-05-08

"chủ nhật tuần này" → 2025-05-11

"2 ngày nữa" → 2025-05-09

***ĐẶC BIỆT LƯU Ý:***
Viết ngắn gọn, bỏ các từ không cần thiết, nhưng vẫn đảm bảo đầy đủ thông tin cần thiết.
`,
  ],
  ["human", "{input}"],
]);

const chain = prompt.pipe(structuredLlm);

async function decompose(context, input, summary) {
  const today_with_weekday = now.format("dddd, YYYY-MM-DD HH:mm:ss");
  console.log("Today with weekday:", today_with_weekday);
  const aiMsg = await chain.invoke({
    summary: summary || "", // Đảm bảo summary không phải là undefined
    context: context || "general business", // Đảm bảo context không phải là undefined
    input,
    today_time_date: today_with_weekday,
  });
  // console.log("AI Message:", typeof aiMsg, ": ", aiMsg);
  return aiMsg;
  // / Trả về JSON đã được làm sạch
}

module.exports = { decompose };


/**
 *       
 */