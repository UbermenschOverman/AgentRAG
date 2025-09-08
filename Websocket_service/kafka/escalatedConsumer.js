const client = require("../redis/data_structure/tenant_Client.js");
const { runConsumer } = require("./consumer"); // Vẫn sử dụng runKeyConsumer

async function escalatedConsumer(io) {
  const groupId = "ws-escalated_mes-group-" + Date.now();
  const topic = "escalated_mes";
  const call_back = async (decodedContent) => {
    try {
      const {
        tenantId,
        conversationId,
        clientId,
        escalatedReason,
        input,
        text,
        requestId,
        tag
      } = decodedContent;
      const request = {
        escalatedReason: escalatedReason,
        input: input,
        text: text,
        requestId: requestId,
        tag: tag
      };
      // Thêm escalated vào client
      await client.addEscalatedToClient(
        tenantId,
        clientId,
        conversationId,
        request
      );
      // broad cast cho room tenantId
      console.log(
        `🚀 [${tenantId}] New escalated message for conversation ${conversationId} from client ${clientId} req :`,
        {
          conversationId: conversationId,
          clientId: clientId,
          request: request,
        }
      );
      const socketsInRoom = await io.of('/cms').in(`tenant:${tenantId}`).fetchSockets();
      console.log(`🧠 Clients in tenant:${tenantId}:`, socketsInRoom.length);
      io.of('/cms').to(`tenant:${tenantId}`).emit("new_escalated_mes_created", {
        conversationId: conversationId,
        clientId: clientId,
        request: request,
      });
    } catch (err) {
      console.error("❌ Error in callback processing message:", err);
    }
  };
  // Chạy Kafka consumer
  await runConsumer(topic, groupId, call_back);
}

module.exports = { escalatedConsumer };
