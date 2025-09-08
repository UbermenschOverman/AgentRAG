// schemaRegistry.js
const { SchemaRegistry } = require("@kafkajs/confluent-schema-registry");

const registry = new SchemaRegistry({
  host: "http://localhost:8081", // URL Schema Registry server
});

// Hardcode ánh xạ topic -> schema ID
// const topicSchemaMapping = {
//   LLM_mes: 8  , // ví dụ: schema ID 4 cho topic LLM_mes
//   rec_Answer: 7, // ví dụ: schema ID 5 cho topic LLM_reply
//   orderQueue_key: 9,
//   orderQueue_value: 10,
//   // thêm các topic khác nếu cần
// };

// // Hàm để lấy schema ID từ topic
// function getSchemaIdByTopic(topic) {
//   const schemaId = topicSchemaMapping[topic];
//   if (!schemaId) {
//     throw new Error(`Schema ID not found for topic: ${topic}`);
//   }
//   return schemaId;
// }

module.exports = {
  registry,
  // getSchemaIdByTopic,
};
