// schemaRegistry.js
const { SchemaRegistry } = require("@kafkajs/confluent-schema-registry");

const registry = new SchemaRegistry({
  host: "http://localhost:8081", // URL Schema Registry server
});

// Hàm để lấy schema ID từ topic
// function getSchemaIdByTopic(topic) {
//   const schemaId = topicSchemaMapping[topic];
//   if (!schemaId) {
//     throw new Error(`Schema ID not found for topic: ${topic}`);
//   }
//   return schemaId;
// }
const llmMesSchema = {
  type: "record",
  name: "LLM_mes",
  namespace: "com.chat.incomming_mes",
  doc: "Sample schema to help you get started.",
  fields: [
    { name: "tenantId", type: "string" },
    { name: "conversationId", type: "string" },
    { name: "input", type: "string" },
    { name: "text", type: "string" },
    { name: "requestId", type: "string" },
  ],
};

const escalatedMesSchema = {
  type: "record",
  name: "Escalated_mes",
  namespace: "com.chat.escalated_mes",
  fields: [
    { name: "tenantId", type: "string" },
    { name: "conversationId", type: "string" },
    { name: "clientId", type: "string" },
    { name: "escalatedReason", type: "string" },
    { name: "input", type: "string" },
    { name: "text", type: "string" },
    { name: "requestId", type: "string" },
    {type: "string", name: "tag", default: "default" }, // Thêm trường mode với giá trị mặc định là "auto"
  ],
};

module.exports = {
  registry,
  llmMesSchema,
  escalatedMesSchema,
  // getSchemaIdByTopic,
};
