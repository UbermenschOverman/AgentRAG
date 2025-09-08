const {
  createOrderTool,
  updateOrderContentTool,
  updateOrderMetaTool,
  blockedbyEventTool,
} = require("./tool");
const { createReactAgent } = require("@langchain/langgraph/prebuilt");
const { getCampaigns } = require("./campaign");
const { ChatGoogleGenerativeAI } = require("@langchain/google-genai");
const { PromptTemplate } = require("@langchain/core/prompts");
const { connectDB } = require("../../mogo_service/mogodb");
const dayjs = require("dayjs");
require('dotenv').config();

async function reActAgent(context, intent, tenantId, conversationId, clientId) {
  try {
    const db = await connectDB();
    const ordersCollection = db.collection("orders");
    const clientsCollection = db.collection("clients");

    let relevantOrder = {};
    const lastestOrderMeta = await clientsCollection.findOne({
      tenantId,
      clientId,
    });
    const { orders } = lastestOrderMeta || {};
    const latest = orders?.[orders.length - 1];

    if (latest) {
      const order = await ordersCollection.findOne({
        tenantId,
        orderId: latest,
      });
      if (order) {
        relevantOrder = {
          orderId: order.orderId,
          content: order.content,
          meta: order.meta,
        };
      } else {
        console.error(`Không tìm thấy đơn hàng với orderId: ${latest}`);
      }
    }
    const campaigns = await getCampaigns(tenantId);
    const llm = new ChatGoogleGenerativeAI({
      model: "gemini-2.5-flash-preview-05-20",
      temperature: 0,
      maxRetries: 2,
      apiKey: process.env.GEMINI_API_KEY,
    });
    const sysPrompt = new PromptTemplate({
      inputVariables: [
        "context",
        "intent",
        "tenantId",
        "conversationId",
        "clientId",
        "relevantOrderId",
        "relevantOrderContent",
        "relevantOrderMeta",
        "campaigns",
      ],
      template: `
      Bạn là phòng ban quản lý đơn hàng của doanh nghiệp {context}.
      Bạn sẽ nhận được yêu cầu từ bộ phận chăm sóc khách hàng để tạo đơn hàng mới hoặc cập nhật đơn hàng hiện tại.
      Bạn sẽ được cung cấp thông tin về các sự kiện, chương trình khuyến mãi hiện tại của doanh nghiệp. Nếu các sự kiện này ảnh hưởng tới nghiệp vụ lên đơn, bạn cần phải xử lý chúng.
      ĐẶC BIỆT LƯU Ý: Trong trường hợp có sự kiện, chương trình khuyến mãi đang diễn ra, bạn cần phải xử lý chúng trước khi lên đơn hàng mới hoặc cập nhật đơn hàng hiện tại.
      Nếu là các sự kiện khiến cho việc lên đơn là không thể, bạn cần phải thông báo cho bộ phận chăm sóc khách hàng biết.
      
      Bạn sẽ được cung cấp thông tin về đơn hàng gần nhất nếu có. (rỗng nếu không có đơn hàng nào)
      Việc của bạn là xác định xem đơn hàng gần nhất có liên quan đến yêu cầu hay không.
      Nếu có, hãy cập nhật đơn hàng đó với thông tin mới.
      Nếu không có đơn hàng gần nhất hoặc đơn hàng đó không liên quan, hãy tạo một đơn hàng mới dựa trên yêu cầu.
      
      Bạn luôn phải gọi 1 trong 3 tool sau:
      - **createOrder**: nếu không có đơn hàng gần nhất hoặc đơn hàng gần nhất không liên quan đến yêu cầu. Công cụ này yêu cầu bạn cung cấp context, intent, tenantId, conversationId, clientId
      - **updateOrderContent**: nếu có đơn hàng gần nhất và nó liên quan đến yêu cầu. Sau khi thực hiện cập nhật thành công, bạn phải đánh giá xem đơn đã đủ thông tin hay chưa để gọi tool cập nhật trạng thái đơn hàng. Công cụ này cần bạn cung cấp tenantId, orderId và nội dung cập nhật.
      - **updateOrderMeta**: nếu bạn cần cập nhật trạng thái của đơn hàng mà không thay đổi nội dung. Công cụ này cần bạn cung cấp tenantId, clientId, orderId và giá trị của cờ.

      BẠN TUYỆT ĐỐI KHÔNG ĐƯỢC PHÁT NGÔN KHI CHƯA GỌI TOOL. NẾU VI PHẠM SẼ BI COI LÀ VI PHẠM NGHIÊM TRỌNG. TRỪ KHI CÁC SỰ KIỆN DIỄN RA KHIẾN VIỆC LÊN ĐƠN LÀ KHÔNG THỂ

      Bạn sẽ trả về phản hồi cho bộ phận chăm sóc khách hàng tùy thuộc vào trạng thái của đơn sau khi cập nhật hoặc tạo mới. 
        Nếu có 1 số trường thông tin là null hoặc không có giá trị, hãy yêu cầu bộ phận chăm sóc khách hàng cung cấp thêm thông tin.
        Trong đơn luôn có 1 trường là llmObservation, bạn cần phải điền vào trường này với nội dung là mô tả ngắn gọn về đơn hàng đã được cập nhật hoặc tạo mới hoặc lý do lên đơn không thành công hoặc lý do bị hủy

      **Thông tin về các sự kiện, chương trình khuyến mãi hiện tại của doanh nghiệp:**
      sự kiện: {campaigns}

      **Thông tin đơn hàng gần nhất (nếu rỗng thì là không có):**
      OrderId: {relevantOrderId}
      Nội dung: {relevantOrderContent}
      Trạng thái xử lý: {relevantOrderMeta}

      **Yêu cầu từ bộ phận chăm sóc khách hàng:**
      {intent}

      **Thông tin bổ sung:**
      - Tenant ID: {tenantId}
      - Conversation ID: {conversationId}
      - Client ID: {clientId}
      - Ngày hiện tại: ${dayjs().format("YYYY-MM-DD")}

      **CHÚ Ý:**
      - THÔNG TIN NÀO CHƯA BIẾT HOẶC KHÔNG CÓ GIÁ TRỊ THÌ ĐỂ LÀ "" (chuỗi rỗng).

      ***Trả về phản hồi cuối cùng cho bộ phận chăm sóc khách hàng theo định dạng JSON như sau***
      {{
        "response": "Phản hồi cho bộ phận chăm sóc khách hàng cần những thông tin gì thêm của khách hàng hoặc yêu cầu xác nhận nếu đã đủ thông tin",
        "remainingFields": {{"Các trường thông tin trong content còn thiếu hoặc giá trị null, dạng object key-value"}} object rỗng nếu không thể lên/ cập nhật đơn vì lý do nào đó,
        "orderId": "ID của đơn hàng đã được cập nhật hoặc tạo mới hoặc null nếu  nếu không thể lên/ cập nhật đơn vì lý do nào đó",
        "content": {{"Đơn hàng đã được cập nhật hoặc tạo mới, dạng object key-value" object rỗng nếu không thể lên/ cập nhật đơn vì lý do nào đó}},
        "meta": {{"Trạng thái xử lý của đơn hàng hoặc object rỗng {{}} nếu không thể lên/ cập nhật đơn vì lý do nào đó}}
  }}
    `,
    });

    console.log("🪵 Debug variables for sysPrompt:");
    console.log("context:", context);
    console.log("intent:", intent);
    console.log("tenantId:", tenantId);
    console.log("conversationId:", conversationId);
    console.log("clientId:", clientId);
    console.log("relevantOrderId:", relevantOrder.orderId || " không có");
    console.log(
      "relevantOrderContent:",
      relevantOrder.content
        ? JSON.stringify(relevantOrder.content, null, 2)
        : {}
    );
    console.log(
      "relevantOrderMeta:",
      relevantOrder.meta ? JSON.stringify(relevantOrder.meta, null, 2) : {}
    );
    console.log("campaigns:", JSON.stringify(campaigns, null, 2));

    const prompt = await sysPrompt.format({
      context,
      intent,
      tenantId,
      conversationId,
      clientId,
      relevantOrderId: relevantOrder.orderId || "",
      relevantOrderContent: relevantOrder.content
        ? JSON.stringify(relevantOrder.content, null, 2)
        : "",
      relevantOrderMeta: relevantOrder.meta
        ? JSON.stringify(relevantOrder.meta, null, 2)
        : "",
      campaigns: JSON.stringify(campaigns, null, 2),
    });

    const agent = createReactAgent({
      llm,
      tools: [
        createOrderTool,
        updateOrderContentTool,
        updateOrderMetaTool,
        blockedbyEventTool,
      ],
      prompt,
    });

    const result = await agent.invoke({
      messages: [{ role: "user", content: intent }],
    });

    const finalres =
      result?.messages
        ?.at(-1)
        ?.content?.replace(/^```json\n|\n```$/g, "")
        .trim() || "[❌ Không có phản hồi từ agent]";
    console.log("➡️ finalres từ agent:", finalres);
    const response = JSON.parse(finalres);

    // Chỉ fetch meta từ DB khi có orderId
    if (response.orderId) {
      const orderDoc = await ordersCollection.findOne({
        tenantId,
        orderId: response.orderId,
      });
      // nếu không tìm thấy, để meta = {}
      response.meta = orderDoc?.meta ?? {};
    } else {
      // trường hợp block by event (orderId === null)
      // giữ meta do agent trả về (có thể empty) hoặc mặc định {}
      response.meta = response.meta ?? {};
    }

    // Nếu đã có orderId mà agent không trả content hoặc meta thì là lỗi
    if (
      response.orderId &&
      (!response.content || Object.keys(response.meta).length === 0)
    ) {
      throw new Error("Phản hồi không hợp lệ từ agent. Vui lòng kiểm tra lại.");
    }

    // Cuối cùng trả về luôn, cho phép cả case block event
    return response;
  } catch (error) {
    console.error("❌ Lỗi trong reActAgent:", error.message);
    throw error;
  }
}

module.exports = { reActAgent };
