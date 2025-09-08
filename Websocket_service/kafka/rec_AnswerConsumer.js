// consumers/LLM_mesConsumer.js
const { runConsumer } = require("./consumer");
const conversation = require("../redis/data_structure/conversation_Store");
const client = require("../redis/data_structure/tenant_Client.js");
const cms = require("../redis/data_structure/claimed_Client.js");
const {buildContextOnSystemReply} = require("../utils/summaryGen");
async function rec_AnswerConsumer(io) {
  const topic = "rec_Answer"; // Topic cần lắng nghe
  const groupId = "ws-rec_Answer-group-" + Date.now(); // GroupId cho consumer

  // Callback để xử lý message
  const call_back = async (decodedMessage) => {
    try {
      // Kiểm tra tính hợp lệ của decodedMessage
      const { tenantId, conversationId, input, text } = decodedMessage;

      // Kiểm tra tất cả các trường thông tin cần thiết
      if (!tenantId || !conversationId || !text) {
        console.error("❌ Missing required fields in message:", decodedMessage);
        return; // Dừng xử lý nếu thiếu thông tin quan trọng
      }

      // Tạo đối tượng tin nhắn để lưu vào database
      const msgObj = {
        text: text ?? "", // Nếu không có text thì để là chuỗi rỗng
        time: Date.now(), // Thời gian tin nhắn
        role: "LLM", // Chỉ định vai trò của tin nhắn (LLM là bot)
      };
      // kiểm tra mode cua hội thoại
      const {mode} = await conversation.getMetaData(tenantId,conversationId);
      console.log(
        `🔍 [${tenantId}] Processing message for conversation ${conversationId} with mode "${mode}"`
      );
      // nếu mode là manual thì gửi tin nhắn đến CMS
      if (mode == "manual") {
        // Lấy thông tin cmsId từ conversation
        // gửi tin nhắn đến CMS đang claim client này
        await cms.botToCms(io, tenantId, conversationId, msgObj);
      } else if (mode == "auto") {
              // Thêm tin nhắn vào cơ sở dữ liệu cho conversation
        await conversation.addMessage(tenantId, conversationId, msgObj);
        // nếu mode là auto thì gửi tin nhắn đến client và CMS
        await cms.botToCms(io, tenantId, conversationId, msgObj);
        await client.botToClient(io, tenantId, conversationId, msgObj);
        // cập nhật summary cho clientId này
        await buildContextOnSystemReply(tenantId, conversationId, input, text);
      } else{
        console.error(`❌ Invalid mode "${mode}" for conversation ${conversationId} in tenant ${tenantId}`);
        return; // Dừng xử lý nếu mode không hợp lệ
      }
    } catch (err) {
      console.error("❌ Error in callback processing message:", err);
    }
  };

  // Chạy consumer với callback
  await runConsumer(topic, groupId, call_back);
}

module.exports = { rec_AnswerConsumer };
