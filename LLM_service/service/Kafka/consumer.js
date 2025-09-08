// // consumer.js
// const { kafka } = require("../../config/kafka"); // Kafka connector
// const { registry, getSchemaIdByTopic } = require("../../config/schemaRegistry"); // Schema registry client

// async function runConsumer(topic, groupId, call_back) {
//   const consumer = kafka.consumer({ groupId });

//   await consumer.connect();
//   await consumer.subscribe({ topic, fromBeginning: false });

//   console.log(
//     `🚀 Listening for messages on topic '${topic}' with groupId '${groupId}'...`
//   );

//   await consumer.run({
//     eachMessage: async ({ topic, partition, message }) => {
//       try {
//         // 1. Lấy schema ID từ topic
//         const schemaId = getSchemaIdByTopic(topic);

//         // 2. Decode message từ Kafka với schema ID lấy được
//         const decoded = await registry.decode(message.value, schemaId);

//         console.log("🔥 Received decoded message:", decoded);

//         // 3. Gọi callback với message đã decode
//         await call_back(decoded);
//       } catch (err) {
//         console.error("❌ Error decoding or processing message:", err);
//       }
//     },
//   });
// }

// module.exports = { runConsumer };

// consumer.js
const { kafka } = require("../../config/kafka"); // Kafka connector
// Chỉ cần import 'registry', không cần 'getSchemaIdByTopic' nữa
const { registry } = require("../../config/schemaRegistry"); // Schema registry client

async function runConsumer(topic, groupId, call_back) {
  const consumer = kafka.consumer({ groupId, sessionTimeout: 100000, });

  await consumer.connect();
  await consumer.subscribe({ topic, fromBeginning: false });

  console.log(
    `🚀 Listening for messages on topic '${topic}' with groupId '${groupId}'...`
  );

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      try {
        // KHÔNG CẦN LẤY schema ID từ topic nữa!
        // Thư viện registry.decode sẽ TỰ ĐỘNG đọc schemaId từ 5 byte đầu tiên của message.value
        // và truy vấn Schema Registry để lấy định nghĩa schema phù hợp.
        const decoded = await registry.decode(message.value);

        console.log("🔥 Received decoded message:", decoded);

        // 3. Gọi callback với message đã decode
        await call_back(decoded);
      } catch (err) {
        console.error("❌ Error decoding or processing message:", err);
      }
    },
  });
}

module.exports = { runConsumer };