const { genLLM } = require("../LLM_connector/Gemini");
const {
  ensureOrder,
  replaceOrder,
  getOrder,
} = require("../redis/datastructure/incompleted_order_queue");
const { PromptTemplate } = require("@langchain/core/prompts");
const { orderQueueProducer } = require("../Kafka/orderQueueProducer");

const { MongoClient } = require("mongodb");

const uri = `mongodb://localhost:27017/`;
const client = new MongoClient(uri);
const database = client.db("CSKH");
const leads = database.collection("leads");


async function reservationPipeline(context, intent, tenantId, conversationId, clientId) {
  let form = await ensureOrder(tenantId, conversationId, clientId);
  form = JSON.stringify(form);
  const llm = genLLM();
  console.log("dạng đơn: ", form);
  const promptTemplate = PromptTemplate.fromTemplate(`
Bạn là một trợ lý hỗ trợ khách hàng đáng tin cậy của doanh nghiệp {context} đang hợp tác cùng trợ lý chăm sóc khách hàng để hỗ trợ doanh nghiệp lên đơn. 
Bạn sẽ được biểu mẫu bên CSKH đang thu thập và yêu cầu của bên chăm sóc khách hàng. 
Nhiệm vụ của bạn là từ yêu cầu của bên chăm sóc khách hàng cố gắng điền vào các trường thông tin còn trống trong form mà không thay đổi bất kỳ trường nào trong form.

**Quan trọng:** 
- Không thay đổi tên các trường hoặc cấu trúc của form.
- Chỉ điền vào các trường còn thiếu, giữ nguyên các trường đã có dữ liệu.
- Trả về form đã được điền thông tin mà không thay đổi danh sách các trường.
- Nếu có trường còn thiếu thông tin, hãy thông báo lại cho bên chăm sóc khách hàng để họ có thể hỏi thêm.
- Đối với các trường thông tin không bắt buộc, nếu khách hàng không chủ động cung cấp thông tin, hãy để trống.
- Có 1 số thông tin bạn có thể suy luận hoặc làm các phép tính đơn giản như tính ngày trả phòng từ ngày check-in và thời gian sử dụng dịch vụ, hãy thực hiện và điền form.

## Trạng thái của đơn đặt dịch vụ được xác định dựa vào 2 biến:

1. **isFullyFilled**:
   - "true" nếu tất cả các trường bắt buộc đã có dữ liệu hợp lệ.
   - "false" nếu còn thiếu ít nhất 1 trường bắt buộc.

2. **isUserConfirmed**:
   - "true" nếu khách hàng đã xác nhận muốn sử dụng dịch vụ, và form đã đầy đủ thông tin bắt buộc ("isFullyFilled = true").
   - "false" nếu chưa có xác nhận, hoặc form chưa hoàn chỉnh.

## Các trạng thái có thể:
| Trạng thái              | Điều kiện logic                                      |
|-------------------------|-------------------------------------------------------|
| Đang thu thập thông tin | isFullyFilled = false, isUserConfirmed = false           |
| Chờ xác nhận            | isFullyFilled = true, isUserConfirmed = false            |
| Đã xác nhận             | isFullyFilled = true, isUserConfirmed = true             |

Lưu ý:
- Nếu "isFullyFilled = false", thì dù khách hàng có nói "ok", "chốt đơn", "xác nhận" → "isUserConfirmed" vẫn phải là "false".
- "isUserConfirmed = true" chỉ khi form đủ và khách xác nhận rõ ràng.

***Form hiện tại:***
{form}

***yêu cầu từ bên chăm sóc khách hàng:*** 
{intent}

***Trả lời:***
Trả về dữ liệu dạng JSON gồm:
- form: Form đã được điền đầy đủ.
- response: Một câu trả lời (không chứa ký tự đặc biệt) mà bạn muốn gửi cho bên chăm sóc khách hàng để hoàn thành nghiệp vụ.
- isFullyFilled: true nếu form đã được điền đầy đủ các trường bắt buộc, false nếu còn thiếu thông tin tại 1 trong các trường bắt buộc.
- isUserConfirmed: true nếu form đã được xác nhận với khách hàng, false nếu chưa xác nhận. Cờ này được xác định dựa trên tin nhắn của bộ phận chăm sóc khách hàng.

**Lưu ý:** Đảm bảo rằng response chỉ chứa văn bản không có ký tự đặc biệt như dấu ngoặc hoặc dấu phân cách JSON.
`.trim());


  const chain = promptTemplate.pipe(llm);
  const aiMsg = await chain.invoke({ context, form, intent });
  let answer = aiMsg.content?.replace(/^```json\n|\n```$/g, "").trim();
  console.log("đây là câu trả lời của LLM: ", answer);

  // Loại bỏ các ký tự backtick và đảm bảo là JSON hợp lệ
  answer = answer.replace(/`/g, ""); // Loại bỏ dấu backtick nếu có

  // Parse dữ liệu JSON
  let parsedAnswer = null;
  try {
    parsedAnswer = JSON.parse(answer);
  } catch (error) {
    console.error("Lỗi khi phân tích LLM response:", error);
  }

  // Kiểm tra và xử lý nếu có lỗi khi phân tích JSON
  if (!parsedAnswer) {
    throw new Error("LLM response không hợp lệ.");
  }

  
  // Xử lý form đã điền và các trường còn thiếu
  const { form: newForm, isFullyFilled,isUserConfirmed , response } = parsedAnswer;
  // Kiểm tra xem có số điện thoại chưa
  // nếu có rồi thì lưu lead
  // log parsedAnswer
  console.log("parsedAnswer: ", parsedAnswer);
  // Cập nhật thông tin vào Redis nếu có
  if (newForm) {
    console.log(typeof newForm, " ", newForm);
    await replaceOrder(conversationId, tenantId, newForm);
  }
  console.log("new_form: ", JSON.stringify(newForm));
  // tạo sự kiện và gửi kafka topic orderQueue
  await orderQueueProducer(tenantId, conversationId, JSON.stringify(newForm));
  // Trả về kết quả
  return parsedAnswer;
}

module.exports = reservationPipeline;
