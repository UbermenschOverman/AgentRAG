// // consumer.js
// const { kafka } = require("../config/kafka"); // Kafka connector
// const { registry, getSchemaIdByTopic } = require("../config/schemaRegistry"); // Schema registry client

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

// async function runKeyConsumer(topic, topic_key, topic_value, groupId, call_back) {
//   const consumer = kafka.consumer({ groupId });

//   try {
//     await consumer.connect();
//     await consumer.subscribe({ topic, fromBeginning: false });

//     console.log(
//       `🚀 Listening for messages on topic '${topic}' with groupId '${groupId}'...`
//     );

//     // Lấy schemaId một lần trước khi bắt đầu consume
//     const schemaId_key = getSchemaIdByTopic(topic_key);
//     const schemaId_value = getSchemaIdByTopic(topic_value);

//     await consumer.run({
//       eachMessage: async ({ topic, partition, message }) => {
//         try {
//           const key = await registry.decode(message.key, schemaId_key);
//           const value = await registry.decode(message.value, schemaId_value);

//           console.log("🔥 Received decoded message:", value, " : ", key);

//           await call_back(key, value);
//         } catch (err) {
//           console.error("❌ Error decoding or processing message:", err);
//         }
//       },
//     });
//   } catch (err) {
//     console.error(`❌ Failed to start consumer for topic '${topic}':`, err);
//   }
// }


// module.exports = { runConsumer,runKeyConsumer };

// consumer.js
const { kafka } = require("../config/kafka"); // Kafka connector
const { registry } = require("../config/schemaRegistry"); // Schema registry client - chỉ cần client, không cần getSchemaIdByTopic

async function runConsumer(topic, groupId, call_back) {
  const consumer = kafka.consumer({ groupId });

  await consumer.connect();
  await consumer.subscribe({ topic, fromBeginning: false });

  console.log(
    `🚀 Listening for messages on topic '${topic}' with groupId '${groupId}'...`
  );

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      try {
        // KHÔNG CẦN LẤY schemaId TỪ TOPIC NỮA
        // Thư viện registry.decode sẽ tự động đọc schemaId từ message.value
        const decoded = await registry.decode(message.value); // Loại bỏ tham số schemaId

        // console.log("🔥 Received decoded message:", decoded);

        await call_back(decoded);
      } catch (err) {
        console.error("❌ Error decoding or processing message:", err);
      }
    },
  });
}

async function runKeyConsumer(topic, groupId, call_back) { // Loại bỏ topic_key và topic_value
  const consumer = kafka.consumer({ groupId });

  try {
    await consumer.connect();
    await consumer.subscribe({ topic, fromBeginning: false });

    console.log(
      `🚀 Listening for messages on topic '${topic}' with groupId '${groupId}'...`
    );

    // KHÔNG CẦN LẤY schemaId TỪ TOPIC NỮA CHO KEY VÀ VALUE
    // Thư viện registry.decode sẽ tự động đọc schemaId từ message.key và message.value
    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const key = await registry.decode(message.key);   // Loại bỏ tham số schemaId_key
          const value = await registry.decode(message.value); // Loại bỏ tham số schemaId_value

          console.log("🔥 Received decoded message:", value, " : ", key);

          await call_back(key, value);
        } catch (err) {
          console.error("❌ Error decoding or processing message:", err);
        }
      },
    });
  } catch (err) {
    console.error(`❌ Failed to start consumer for topic '${topic}':`, err);
  }
}

module.exports = { runConsumer, runKeyConsumer };