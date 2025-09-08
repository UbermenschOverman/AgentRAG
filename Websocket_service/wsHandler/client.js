const queueStore = require("../redis/data_structure/redis_Queue");
const waitingPool = require("../redis/data_structure/waiting_pool");
const cms = require("../redis/data_structure/claimed_Client");
const conversation = require("../redis/data_structure/conversation_Store");
const client = require("../redis/data_structure/tenant_Client");
const sendToKafka = require("../kafka/sendToKafka");
const { buildContextOnClientMessage } = require("../utils/summaryGen");
const { connectDB } = require("../config/mongo");

// connect tới MongoDB
let db = null;

// Hàm lấy kết nối, chỉ connect 1 lần
async function getDb() {
  if (!db) {
    db = await connectDB();
  }
  return db;
}

async function handleClientConnection(socket, io) {
  const clientId = socket.data?.clientId;
  const tenantId = socket.tenantId;
  try {
    console.log(
      `🔌 [${tenantId}] Client connection event received: ${clientId}`
    );
    if (!clientId || !tenantId) {
      console.error(
        `[ERROR] Connection failed: Missing clientId or tenantId. socket.id=${socket.id}`
      );
      throw new Error("Missing clientId or tenantId on connection");
    }

    // 1. Ensure Redis client & conversation
    await client.ensureClient(tenantId, clientId, "web", socket.id);
    const conversationId = await client.ensureConversation(tenantId, clientId);

    // 3. Gắn dữ liệu vào socket
    socket.data.conversationId = conversationId;

    const { mode } = await conversation.getMetaData(tenantId, conversationId);
    socket.data.mode = mode;

    // 4. Nếu ở chế độ manual thì đưa vào queue và waiting pool
    if (mode === "manual") {
      await queueStore.initQueue(tenantId, clientId);
    }

    await waitingPool.add(tenantId, clientId);
    console.log(clientId, " added to waiting pool");

    // 5. Gửi thông báo xác nhận & broadcast tới CMS
    socket.emit("ack", { message: "Setup completed" });
    io.of("/cms").emit(`${tenantId}_waiting_client`, [clientId]);

    // 6. Gửi lịch sử hội thoại cho client
    const messages = await conversation.getMessages(tenantId, conversationId);
    socket.emit(`conversation_history`, messages);

    console.log(
      `✅ [${tenantId}] Client connected: ${clientId} added to waiting pool`
    );
  } catch (err) {
    console.error(
      `[FATAL] Error during client connection (, tenant: ${tenantId}):`,
      err
    );
    socket.emit("error", { message: "Client connection failed" });
  }
}

async function handleClientMessage(socket, io, message, clientId, tenantId) {
  try {
    // 1. Ensure conversation
    const conversationId = await client.ensureConversation(tenantId, clientId);

    // 2. Update lastSeen in Mongo
    const db = await getDb();
    const collection = db.collection("clients");
    await collection.updateOne(
      { clientId },
      { $set: { lastSeen: Date.now() } }
    );

    // 3. Build message object
    const msgObj = {
      text: message.text ?? "",
      time: message.time ?? Date.now(),
      role: message.role ?? "client",
    };

    // 4. Get mode
    const { mode } = await conversation.getMetaData(tenantId, conversationId);
    const isWaiting = await waitingPool.has(tenantId, clientId);

    // 5. Handle manual mode
    if (mode === "manual") {
      if (isWaiting) {
        await queueStore.push(tenantId, clientId, JSON.stringify(msgObj));
        console.log(`📥 [${tenantId}] Message queued (unclaimed): ${clientId}`);
        return;
      }

      await buildContextOnClientMessage(
        tenantId,
        conversationId,
        clientId,
        message.text
      );
    }

    // 6. Save message
    await conversation.addMessage(tenantId, conversationId, msgObj);

    // 7. Push to Kafka
    await sendToKafka.sendMessageToLLMmes(
      tenantId,
      conversationId,
      msgObj,
      clientId
    );
    console.log(`[KAFKA] [${tenantId}] Prompt sent to LLM_mes`);

    await cms.clientToCms(io, tenantId, clientId, msgObj);
  } catch (err) {
    console.error(`[ERROR] Failed to handle client message:`, err);
  }
}

async function handleClientDisconnect(socket, io) {
  const clientId = socket.data?.clientId || null;
  const tenantId = socket.tenantId || null;
  try {
    // ⚠️ Kiểm tra thiếu thông tin bắt buộc
    if (!clientId || !tenantId) {
      console.error(
        `[ERROR] Disconnect missing required info. socket.id=${socket.id}, clientId=${clientId}, tenantId=${tenantId}`
      );
      throw new Error("Client disconnect failed: missing clientId or tenantId");
    }

    console.log(
      `🔌 [${tenantId}] Disconnect event received for client: ${clientId}`
    );

    // 1. Xóa khỏi hàng đợi nếu còn tồn tại
    await queueStore.delete(tenantId, clientId);
    console.log(`🧹 [${tenantId}] Queue deleted for client: ${clientId}`);

    // 2. Tìm CMS đang quản lý client
    const { cmsId } = await client.getClientData(tenantId, clientId);
    if (cmsId?.trim()) {
      // Cập nhật trạng thái CMS → bỏ claim client
      await cms.update(tenantId, cmsId, { clientId: "", conversationId: "" });

      // Gửi thông báo ngắt tới CMS (nếu có socket)
      const { cmsSocketId } = await cms.getCmsDetail(tenantId, cmsId);
      if (cmsSocketId?.trim()) {
        io.of("/cms").to(cmsSocketId).emit("client_disconnected", clientId);
        console.log(`🔁 [${tenantId}] CMS ${cmsId} lost client ${clientId}`);
      }
    }

    // 3. Xoá khỏi pool chờ
    await waitingPool.remove(tenantId, clientId);
    console.log(`❌ [${tenantId}] Removed from waiting pool: ${clientId}`);

    // 4. Xoá khỏi danh sách client tạm thời
    await client.removeClient(tenantId, clientId);
    console.log(`🗑️ [${tenantId}] Client removed from Redis: ${clientId}`);
  } catch (err) {
    console.error(
      `[FATAL] Error during disconnect of client ${clientId} (tenant: ${tenantId}):`,
      err
    );
    // Có thể emit socket event lỗi nếu cần
  }
}

module.exports = {
  handleClientConnection,
  handleClientMessage,
  handleClientDisconnect,
};
