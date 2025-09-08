// producer.js
const { kafka } = require("../../config/kafka"); // Kafka connector
const { registry, llmMesSchema } = require("../../config/schemaRegistry"); // Schema registry client

const producer = kafka.producer();

async function runProducer(topic, message) {
  await producer.connect();
  try {

    // 2. Mã hóa message theo schema
    const {id: schemaId} = await registry.register(llmMesSchema, {subject:"rec_Answer-value"}); // Đăng ký schema và lấy schema ID
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
    console.error("❌ Error sending message:", error);
  }
}

module.exports = { runProducer };
