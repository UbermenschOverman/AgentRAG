// const { getSchemaIdByTopic } = require("../config/schemaRegistry");
// const { producer, registry, LLM_MES_SCHEMA } = require("./producer");
// const { v4: uuidv4 } = require("uuid");
// const client = require("../redis/data_structure/tenant_Client.js");

// async function sendMessageToLLMmes(tenantId, conversationId, msgObj, clientId) {
//   // tin nhắn được đẩy vào topic LLM_mes
//   const mes = msgObj.text ?? "";
//   const schemaId = getSchemaIdByTopic("LLM_mes");
//   // lấy summary từ redis
//   const data = await client.getClientData(tenantId, clientId);
//   const summary = data?.summary || "summary trống";
//   const encodedPayload = await registry.encode(schemaId, {
//     tenantId: tenantId,
//     conversationId: conversationId,
//     text: mes,
//     requestId: uuidv4(),
//     summary: summary,
//     clientId: clientId,
//   });
  
//   await producer.send({
//     topic: "LLM_mes",
//     messages: [{ value: encodedPayload }],
//   });
// }

// module.exports = {
//   sendMessageToLLMmes,
// };


const { producer, registry, LLM_MES_SCHEMA } = require("./producer"); // Giả định 'producer.js' là file cấu hình chung của bạn
const { v4: uuidv4 } = require("uuid");
const client = require("../redis/data_structure/tenant_Client.js");
const conversationStore = require("../redis/data_structure/conversation_Store.js");

async function sendMessageToLLMmes(tenantId, conversationId, msgObj, clientId) {
  // Lấy nội dung tin nhắn
  const mes = msgObj.text ?? "";

  // --- Loại bỏ dòng lấy schemaId thủ công ---
  // const schemaId = getSchemaIdByTopic("LLM_mes"); // <-- Xóa dòng này

  // Lấy summary từ Redis
  const data = await client.getClientData(tenantId, clientId);
  const summary = data?.summary || "summary trống";
  const {mode} = await conversationStore.getMetaData(tenantId, conversationId); // Lấy mode từ conversationStore
  if(!mode){throw new Error(`Mode not found for tenant: ${tenantId}, conversation: ${conversationId}`);}
  if(mode == 'offChatbot') return;
  // Chuẩn bị payload dữ liệu dựa trên định nghĩa schema Avro
  const payload = {
    tenantId: tenantId,
    conversationId: conversationId,
    text: mes,
    requestId: uuidv4(),
    summary: summary,
    clientId: clientId,
    mode: mode,
  };
  
  // --- Thay đổi cách gọi registry.encode ---
  // Gọi registry.encode() với ĐỊNH NGHĨA SCHEMA (LLM_MES_SCHEMA) và payload dữ liệu.
  // Thư viện sẽ tự động quản lý schema ID (đăng ký nếu cần, lấy ID hiện có và nhúng vào payload).
  const { id:schemaId } = await registry.register( LLM_MES_SCHEMA,   { subject: 'LLM_mes-value' } )
  const encodedPayload = await registry.encode(schemaId, payload); // Sửa từ (schemaId, payload) thành (LLM_MES_SCHEMA, payload)

  // Gửi message lên Kafka topic
  await producer.send({
    topic: "LLM_mes",
    messages: [{ value: encodedPayload }],
  });

  console.log(`✅ Message sent to topic 'LLM_mes' for tenant: ${tenantId}, client: ${clientId} with mode: ${mode}`);
}

module.exports = {
  sendMessageToLLMmes,
};