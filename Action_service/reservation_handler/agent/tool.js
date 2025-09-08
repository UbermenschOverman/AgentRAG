const { tool } = require("@langchain/core/tools");
const { z } = require("zod");

const client  = require("../../redis/datastructure/client")

// ===== TOOL ĐỊNH NGHĨA =====
// tool để thực hiện truy vấn RAG (Retrieval-Augmented Generation)
const createOrderTool = tool(
  async (inputAgrs)=>{
    const {context, intent, tenantId, conversationId, clientId} = inputAgrs;

    const order= await client.createOrderClient(context, intent, tenantId, conversationId, clientId);
    if (!order) {
      throw new Error("Không thể tạo đơn hàng mới.");
    }
    return { order, message: "Đơn hàng đã được tạo thành công." };
},
  {
    name: "createOrder",
    description: "Tạo đơn hàng mới cho khách hàng. Cần cung cấp context, intent, tenantId, conversationId và clientId.",
    schema: z.object({
      context: z.string().describe("Ngữ cảnh doanh nghiệp hiện tại."),
      intent: z.string().describe("thông tin của khách để tạo đơn."),
      tenantId: z.string().describe("ID của tenant."),
      conversationId: z.string().describe("ID của cuộc trò chuyện."),
      clientId: z.string().describe("ID của khách hàng."),
    }),
  }
)

const updateOrderContentTool = tool(
  async (inputArgs) => {
    const { tenantId, orderId, updatedContent } = inputArgs;
    const success = await client.updateOrderContentClient(tenantId, orderId, updatedContent);
    if (!success) {
      throw new Error("Không thể cập nhật nội dung đơn hàng.");
    }
    return { message: "cập nhật thành công" };
  },
  {
    name: "updateOrderContent",
    description: "Cập nhật nội dung đơn hàng cho khách hàng. Cần cung cấp tenantId, clientId, orderId và updatedContent.",
    schema: z.object({
      tenantId: z.string().describe("ID của tenant."),
      clientId: z.string().describe("ID của khách hàng."),
      orderId: z.string().describe("ID của đơn hàng cần cập nhật."),
      updatedContent: z.string().describe("Đơn hàng mới sau khi cập nhật. Đây là một đối tượng JSON string chứa các trường cần cập nhật."),
    }),
  }
)

const updateOrderMetaTool = tool(
  async (inputArgs) => {
    const { tenantId, clientId, orderId, updatedMeta } = inputArgs;
    const success = await client.updateOrderMetaClient(tenantId,clientId, orderId, updatedMeta);

    if (!success) {
      throw new Error("Không thể cập nhật metadata đơn hàng.");
    }
    return { message: "Cập nhật metadata đơn hàng thành công."};
  },
  {
    name: "updateOrderMeta",
    description: "Cập nhật metadata của đơn hàng. Cần cung cấp tenantId, orderId và updatedMeta.",
    schema: z.object({
      tenantId: z.string().describe("ID của tenant."),
      clientId: z.string().describe("ID của khách hàng."),
      orderId: z.string().describe("ID của đơn hàng."),
      updatedMeta: z.object({
        isFullyFilled: z.enum(["true","false"]).describe("Trạng thái đã hoàn thành của đơn hàng."),
      }).describe("Đối tượng JSON chứa metadata cần cập nhật."),
    }),
  },
);

const blockedbyEventTool = tool(
  async (input) =>{
    const {reason} = input;
    return {
      message: `Đơn hàng không thể được xử lý do sự kiện hiện tại: ${reason}. Vui lòng kiểm tra lại thông tin hoặc liên hệ với bộ phận hỗ trợ.`,
    }
  }
,
  {
  name: "blockedbyEvent",
  description: "Thông báo lỗi khi đơn hàng không thể được xử lý do sự kiện hiện tại.",
  schema: z.object({
    reason: z.string().describe("Lý do đơn hàng không thể được xử lý."),
  })
}
)

module.exports = {
  createOrderTool,
  updateOrderContentTool,
  updateOrderMetaTool,
  blockedbyEventTool
};