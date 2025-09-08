
const { z } = require("zod");
const { START, END, StateGraph } = require("@langchain/langgraph");
const { reActAgent } = require("./reActAgent");
// const { rec_AnswerProducer } = require("../../Kafka/rec_AnswerProducer");
const { decompose } = require("../decompose");
const {leadDetection} = require("./leadDetection");
const { client,connectDB } = require("../../../config/mongo");

// bắt đầu phần setup
const OverallState = z.object({
  userInformation:
    z.object({
      name: z.string().describe("Tên người dùng."),
      phoneNumber: z.string().describe("Số điện thoại của người dùng."),
      interestedProducts: z.array(z.string()).describe("Những sản phẩm mà người dùng quan tâm."),
      customerCharacteristics: z.array(z.string()).describe("Đặc điểm của khách hàng."),
    })
  ,

  tenantId: z.string(),
  conversationId: z.string(),
  bussinessDetail: z.string(),
  input: z.string(),
  summary: z.string(),
  sub_prompt: z.array(
    z.object({
      rank: z.string().describe("The execution order of the sub-prompts."),
      sub_prompt: z
        .string()
        .describe(
          "Sub-prompt, a natural sentence that contains only the necessary information to be handled by one of the following APIs."
        ),
      API: z
        .enum(["Reservation API", "Query API", "Chitchat API"])
        .describe("The API that will handle this sub-prompt."),
      Response: z
        .string()
        .optional()
        .describe("Null if not assigned to Chitchat API, generated response."),
    })
  ),
  output: z.string(),
  clientId: z.string().describe("ID của khách hàng trong hệ thống."), // Thêm clientId để lưu thông tin khách hàng
  // requestId: z.string(),
});

const decomposeTool = async (state) => {
  // Write to OverallStateAnnotation
  const { bussinessDetail, input, summary } = state;
  console.log("==> Decomposing input:");
  console.log("context:", bussinessDetail);
  console.log("input:", input);
  console.log("summary:", summary);
  const Response = await decompose(bussinessDetail, input, summary);
  return { sub_prompt: Response };
};

const leadDetectionTool = async (state) => {
  const {
    bussinessDetail,
    input,
    summary,
    userInformation,
    conversationId,
    clientId,
  } = state;

  console.log("==> Lead detection:");
  console.log("context:", bussinessDetail);
  console.log("input:", input);
  console.log("summary:", summary);
  console.log("userInformation (current state):", userInformation);

  let currentInfo = userInformation;

  // ✅ Gọi LLM để cập nhật thông tin nếu cần
  const updatedInfo = await leadDetection(
    bussinessDetail,
    input,
    summary,
    currentInfo
  );

  console.log("==> Thông tin khách hàng sau khi cập nhật từ LLM:", updatedInfo);
  // ✅ Truy vấn từ DB nếu đã có thông tin lead trước đó
   const db = await connectDB();
    const collection = db.collection("clients");
    // Tìm client theo clientId
    
  // ✅ Cập nhật vào DB
  await collection.updateOne(
    { clientId: clientId },
    { $set: { ...updatedInfo } },
    { upsert: true } // nếu chưa có thì insert mới
  );

  // ✅ Trả về state mới cho LangGraph
  return { userInformation: updatedInfo };
};


const agent = async (state) => {
  const {
    tenantId,
    conversationId,
    bussinessDetail,
    input,
    summary,
    sub_prompt,
    userInformation,
    clientId,
    mode
  } = state;
  // console.log("==> Calling LLM with:");
  // console.log("tenantId:", tenantId);
  // console.log("conversationId:", conversationId);
  // console.log("bussinessDetail:", bussinessDetail);
  // console.log("summary:", summary);
  // console.log("sub_prompt:", sub_prompt);
  // console.log("input:", input);
  // console.log("userInformation:", userInformation);
  // console.log("clientId:", clientId); // Thêm log để kiểm tra clientId
  // console.log("mode:", mode); // Thêm log để kiểm tra mode
  try {
    const response = await reActAgent(
      tenantId,
      conversationId,
      bussinessDetail,
      input,
      summary,
      sub_prompt,
      userInformation,
      clientId,
      mode
    );
    if (!response || response.trim() === "") {
      console.warn("❗ Agent trả về rỗng.");
      return { output: "Xin lỗi, tôi chưa thể xử lý yêu cầu này vào lúc này." };
    }
    return { output: response };
  } catch (error) {
    console.error("❌ Agent gọi LLM thất bại:", error);
    return { output: "Hệ thống đang bận. Vui lòng thử lại sau." };
  }
};

const workflow = new StateGraph(OverallState)
  .addNode("decomposeTool", decomposeTool)
  .addNode("leadDetectionTool", leadDetectionTool)
  .addNode("agent", agent)
  .addEdge(START, "decomposeTool")
  .addEdge(START, "leadDetectionTool")
  .addEdge("leadDetectionTool", "agent")
  .addEdge("decomposeTool", "agent")
  .addEdge("agent", END);

module.exports = { workflow };
