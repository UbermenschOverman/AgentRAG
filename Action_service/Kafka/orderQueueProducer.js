const { registry,   orderValueSchema,
  orderKeySchema } = require("./schemaRegistry"); // Schema registry client
const { kafka } = require("./kafkaClient"); // Kafka connector

const producer = kafka.producer();

// Hàm orderQueueProducer
async function orderQueueProducer(tenantId, conversationId, clientId, orderId, meta, content) {
  try {
    // 1. Lấy schema ID từ topic
     
    const {id:keyId} = await registry.register(orderKeySchema, { subject: "orderQueue-key" });

    const {id:schemaId} = await registry.register(orderValueSchema, { subject: "orderQueue-value" });
    const topic = "orderQueue";

    // Dữ liệu cần mã hóa
    const keyData = {
      tenantId: tenantId,
      conversationId: conversationId,
      clientId: clientId,
    };

    const valueData = {
      orderId: orderId,
      meta: meta,
      content: content,
    };

    // 2. Mã hóa key và value theo schema
    const encodedKey = await registry.encode(keyId, keyData);
    const encodedValue = await registry.encode(schemaId, valueData);

    // 3. Kết nối Kafka producer
    await producer.connect();

    // 4. Gửi message vào Kafka
    await producer.send({
      topic: topic,
      messages: [
        {
          key: encodedKey,
          value: encodedValue,
        },
      ],
    });

    console.log(
      `🚀 Message sent to Kafka successfully for tenantId: ${tenantId}, conversationId: ${conversationId}`
    );
  } catch (error) {
    console.error("❌ Error in sending message to Kafka:", error);
  } finally {
    // Đảm bảo ngắt kết nối producer sau khi gửi
    try {
      await producer.disconnect();
    } catch (disconnectError) {
      console.error("❌ Error disconnecting producer:", disconnectError);
    }
  }
}

module.exports = { orderQueueProducer };
