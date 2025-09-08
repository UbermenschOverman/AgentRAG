const { runProducer } = require("./producer"); // Import runProducer từ file producer.js

// Hàm rec_AnswerProducer
async function rec_AnswerProducer(tenantId, conversationId,input, text, requestId) {
  try {
    // Tạo message từ các tham số input
    const message = {
      tenantId: tenantId,
      conversationId: conversationId,
      input: input, // Câu hỏi của người dùng
      text: text, // Câu trả lời của chatbot
      requestId: requestId, // ID của yêu cầu
    };

    // Gửi message vào Kafka
    await runProducer("rec_Answer", message);

    console.log(
      `🚀 Message sent to Kafka successfully for tenantId: ${tenantId}, conversationId: ${conversationId}`
    );
  } catch (error) {
    console.error("❌ Error in sending message to Kafka:", error);
  }
}

module.exports = { rec_AnswerProducer };