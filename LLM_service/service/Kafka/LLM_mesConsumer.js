// consumers/LLM_mesConsumer.js
const { runConsumer } = require("./consumer");
const { pipeline } = require("../LLM/pipeline"); // Import pipeline để gọi
const { getContext } = require("../dataStore");
const { rec_AnswerProducer } = require("./rec_AnswerProducer");

// Định nghĩa consumer cho LLM_mes
async function LLMMesConsumer() {
  const topic = "LLM_mes"; // Topic cần lắng nghe
  const groupId = "llm-mes-group" ; // GroupId cho consumer (có thể tùy chỉnh)

  // Callback để xử lý message
  const call_back = async (decodedMessage) => {
    try {
      // Kiểm tra tính hợp lệ của decodedMessage
      const { tenantId, conversationId, text, requestId, summary, clientId, mode } = decodedMessage;
      if (!tenantId || !conversationId || !text|| !requestId || !summary || !clientId|| !mode) {
        console.error("❌ Missing required fields in message:", decodedMessage);
        return; // Dừng xử lý nếu thiếu thông tin quan trọng
      }

      // Lấy context của tenant
      const context = await getContext(tenantId);
      if (!context) {
        console.error(`❌ Context not found for tenant: ${tenantId}`);
        return;
      }
      console.log('decodedMessage:', decodedMessage);
      // Gọi pipeline để xử lý (chatbot trả lời)
      const answer = await pipeline(tenantId, context, conversationId, text,summary, clientId, mode);
      console.log("==> answer:", answer);
      // Kiểm tra xem chatbot có trả lời không
      if (answer) {
        // Gửi câu trả lời lên Kafka
        await rec_AnswerProducer(tenantId, conversationId,text, answer, requestId);

      } else {
        console.error(
          `❌ No answer generated for tenant: ${tenantId}, conversation: ${conversationId}`
        );
      }
    } catch (err) {
      console.error("❌ Error in callback processing message:", err);
    }
  };

  // Chạy consumer với callback
  await runConsumer(topic, groupId, call_back);
}

module.exports = { LLMMesConsumer };