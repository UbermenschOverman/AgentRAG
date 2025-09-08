const { kafka } = require("../../config/kafka"); // Kafka connector
const { registry, escalatedMesSchema } = require("../../config/schemaRegistry"); // Schema registry client

const producer = kafka.producer();
async function escalatedMesProducer(tenantId, clientd, conversationId,input, text, requestId, escalatedReason, tag) {
  await producer.connect();
  try {
    // nếu tag không trong 'khiếu nại', 'hỏi đáp' thì throw lỗi
    if (!tag || (tag !== 'khiếu nại' && tag !== 'hỏi đáp')) {
      throw new Error("Tag không hợp lệ. Chỉ chấp nhận 'khiếu nại' hoặc 'hỏi đáp'.");
    }
    const topic = "escalated_mes"; // Tên topic để gửi message
    const message = {
      tenantId: tenantId,
      conversationId: conversationId,
      clientId: clientd, // ID của khách hàng
      escalatedReason: escalatedReason, // Lý do chuyển tiếp
      input: input, // Câu hỏi của người dùng
      text: text, // Câu trả lời của chatbot
      requestId: requestId, // ID của yêu cầu
      tag: tag, // Thêm trường tag để phân loại thông tin chuyển tiếp
    };
    // 2. Mã hóa message theo schema
    const { id: schemaId } = await registry.register(escalatedMesSchema, { subject: "escalated_mes-value" }); // Đăng ký schema và lấy schema ID
    const encodedMessage = await registry.encode(schemaId, message);

    // 3. Gửi message đã mã hóa vào Kafka
    await producer.send({
      topic: topic,
      messages: [
        {
          value: encodedMessage,
        },
      ],
    });

    console.log(`🚀 Message sent to topic '${topic}' successfully.`);
  } catch (error) {
    throw new Error(`❌ Error sending message to Kafka: ${error.message}`);
  }
}

module.exports = { escalatedMesProducer };