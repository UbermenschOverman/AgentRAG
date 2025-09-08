const redis = require("../redisClient");
const { getDefaultMode } = require("../../tenent_service/tenantService.js");
const { connectDB } = require("../../config/mongo");

// trong này có 2 ds là ConversationMap ánh xạ  tenantId, clientId tới conversationId
// ✅ Key builders có tenantId

const TTL_SECONDS = 3600 * 24;

const keyToConversationMeta = (tenantId, conversationId) => {
  if (!tenantId || !conversationId) {
    throw new Error("Thiếu tenantId:", tenantId, "conversationId" ,conversationId);
  }
  return `tenant:${tenantId}:conversation:${conversationId}:meta`;
};
const keyToConversationContent = (tenantId, conversationId) =>
  `tenant:${tenantId}:conversation:${conversationId}:content`;

module.exports = {
  // 🔍 Kiểm tra client có conversation chưa
  // async hasConversation(tenantId, clientId) {
  //   return await redis.exists(getKeyToConversationId(tenantId, clientId));
  // },

  // 🔁 Tạo mới conversation nếu chưa có, trả về conversationId
  // lưu dict (tenantId, clientId) -> conversationId
  async ensureConvoForClient(tenantId, conversationId, clientId) {
    if (!tenantId || !conversationId || !clientId) {
      throw new Error("Thiếu tenantId, conversationId hoặc clientId");
    }
    // Kiểm tra xem đã có conversationId này chưa
    const key = keyToConversationMeta(tenantId, conversationId);
    const exists = await redis.exists(key);
    const defaultMode = await getDefaultMode(tenantId);
    const database = await connectDB();
    const conversations = database.collection("conversations");
    if (!exists) {
      // lưu vào convoMeta
      await redis.hSet(key, {
        clientId: clientId,
        cmsId: "",
        mode: defaultMode,
        EscalatedReq: "[]", // mảng escalateds rỗng
      });
      console.log(
        `[CONVERSATION] [${tenantId}] Đã tạo conversation mới với key ${key}: ${{
          clientId: clientId,
          cmsId: "",
          mode: defaultMode,
        }}`
      );
      // tìm kiếm xem đã có conversationId trong mongo chưa
      await conversations.updateOne(
        { clientId, tenantId, conversationId },
        {
          $setOnInsert: {
            clientId,
            tenantId,
            cmsId: "",
            conversationId: conversationId,
            date: new Date(),
            mode: defaultMode, // sử dụng defaultMode từ tenantService
            message: [],
            summary: "",
          },
        },
        { upsert: true }
      );
    }
    return conversationId;
  },

  // 📨 Thêm tin nhắn mới vào hội thoại
  // lưu hội thoại với khóa là conversationId
  // async addMessage(tenantId, clientId, message) {
  //   const conversationId = await this.ensureConversation(tenantId, clientId);
  //   const key = getKeytoConversationContent(tenantId, conversationId);
  //   console.log("Conversation_Store: ", message);
  //   const entry = JSON.stringify(message);
  //   await redis.rPush(key, entry);
  //   // Optional TTL (ví dụ: 7 ngày)
  //   await redis.expire(key, 7 * 24 * 60 * 60);
  //   // add vào mongo
  //   await conversations.updateOne(
  //     { conversationId: conversationId },
  //     { $push: { message: message } }
  //   );
  // },

  async addMessage(tenantId, conversationId, message) {
    const key = keyToConversationContent(tenantId, conversationId);
    console.log("Conversation_Store: ", message);
    const entry = JSON.stringify(message);
    await redis.rPush(key, entry);
    // Optional TTL (ví dụ: 7 ngày)
    await redis.expire(key, 7 * 24 * 60 * 60);
    const database = await connectDB();
    const conversations = database.collection("conversations");
    await conversations.updateOne(
      {
        conversationId: conversationId,
        tenantId: tenantId, // Thêm điều kiện tenantId để đảm bảo đúng hội thoại
      },
      { $push: { message: message } }
    );
  },

  // thêm escalated request vào hội thoại
async addEscalatedRequest(tenantId, conversationId, escalatedRequest) {
  try {
    const key = keyToConversationMeta(tenantId, conversationId);
    const raw = await redis.hGet(key, "EscalatedReq");
    const parsedEscalatedReq = raw ? JSON.parse(raw) : [];

    // Kiểm tra trùng
    if (!parsedEscalatedReq.includes(escalatedRequest)) {
      parsedEscalatedReq.push(escalatedRequest);
      await redis.hSet(key, "EscalatedReq", JSON.stringify(parsedEscalatedReq));
      console.log(`[ESCALATED] [${tenantId}] Thêm escalatedRequest ${requestStr} vào conversation ${conversationId}`);
    } else {
      console.log(`[ESCALATED] [${tenantId}] escalatedRequest ${requestStr} đã tồn tại trong conversation ${conversationId}`);
    }

    return true;
  } catch (err) {
    console.error("❌ Error adding escalated request:", err);
    return false;
  }
},

// lấy danh sách escalated request từ hội thoại
async getEscalatedRequests(tenantId, conversationId) {
  try {
    const key = keyToConversationMeta(tenantId, conversationId);
    const raw = await redis.hGet(key, "EscalatedReq");
    if (!raw) return []; // nếu không có escalated request thì trả về mảng rỗng
    
    const escalatedRequests = JSON.parse(raw);
    // biến các string trong mảng thành object nếu cần

    console.log(`[ESCALATED] [${tenantId}] Lấy danh sách escalated requests từ conversation ${conversationId}:`, escalatedRequests);
    return escalatedRequests;
  } catch (err) {
    console.error("❌ Error getting escalated requests:", err);
    return [];
  }
},

// delete escalated request from conversation theo requestId
async deleteEscalatedRequest(tenantId, conversationId, requestId) {
  try {
    const key = keyToConversationMeta(tenantId, conversationId);
    const raw = await redis.hGet(key, "EscalatedReq");

    if (!raw) {
      console.log(`[ESCALATED] [${tenantId}] Không có escalated requests trong conversation ${conversationId}`);
      return false;
    }

    let parsedEscalatedRequests;

    try {
      parsedEscalatedRequests = JSON.parse(raw); // nên là mảng JSON
    } catch (err) {
      console.error("❌ Không parse được escalated requests từ Redis:", err);
      return false;
    }

    if (!Array.isArray(parsedEscalatedRequests)) {
      console.warn("❗ EscalatedReq không phải là mảng.");
      return false;
    }

    // tìm index request cần xóa
    const index = parsedEscalatedRequests.findIndex(req => req.requestId === requestId);
    if (index === -1) {
      console.log(`❌ Không tìm thấy requestId ${requestId} trong escalated list.`);
      return false;
    }

    // xóa phần tử
    parsedEscalatedRequests.splice(index, 1);

    // ghi đè lại Redis
    await redis.hSet(key, "EscalatedReq", JSON.stringify(parsedEscalatedRequests));

    console.log(`✅ Đã xóa escalated request ${requestId} trong conversation ${conversationId}`);
    return true;
  } catch (err) {
    console.error("❌ Lỗi trong deleteEscalatedRequest:", err);
    return false;
  }
},


  // 📜 Lấy tất cả tin nhắn trong hội thoại
  async getMessages(tenantId, conversationId) {
    const contentKey = keyToConversationContent(tenantId, conversationId);
    const list = await redis.lRange(contentKey, 0, -1);
    return list.map((msg) => JSON.parse(msg));
  },

  // lấy các tin nhắn mới nhất mà không phải tin nhắn khách
  async getMessagesSinceLastUserMessage(tenantId, conversationId) {
    const contentKey = keyToConversationContent(tenantId, conversationId);
    const rawMessages = await redis.lRange(contentKey, 0, -1); // lấy toàn bộ lịch sử

    const messages = rawMessages.map((msg) => JSON.parse(msg));

    const result = [];
    // Duyệt từ cuối danh sách ngược về đầu
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (msg.role === "user" || msg.role === "client") {
        break; // Gặp tin nhắn của user thì dừng lại (không lấy)
      }
      result.unshift(msg); // Thêm vào đầu danh sách
    }

    return result;
  },

  // // ❌ Xóa/reset hội thoại
  // async clearConversation(tenantId, clientId) {
  //   const conversationId = await redis.get(
  //     getKeyToConversationId(tenantId, clientId)
  //   );
  //   if (conversationId) {
  //     await redis.del(getKeyToConversationId(tenantId, clientId));
  //     await redis.del(getKeytoConversationContent(tenantId, conversationId));
  //   }
  // },

  // lấy thông tin hội thoại từ conversationId
  async getMetaData(tenantId, conversationId) {
    const key = keyToConversationMeta(tenantId, conversationId);
    const meta = await redis.hGetAll(key);
    // console.log("[getMetaData]", { key, meta });
    if (!meta || Object.keys(meta).length === 0) return null;
    return meta;
  },
  // // tìm clientId từ conversationId
  // async getClientIdFromConversationId(conversationId) {
  //   const meta = await redis.hGetAll(
  //     getKeyToConversationMetaData(conversationId)
  //   );
  //   if (!meta || !meta.clientId) return null;
  //   return meta.clientId;
  // },

  // // lấy mode của hội thoại
  // async getModeFromConversationId(conversationId) {
  //   const meta = await redis.hGet(
  //     getKeyToConversationMetaData(conversationId),
  //     "mode"
  //   );
  //   return meta ?? null;
  // },

  // chuyển mode của hội thoại
  async setModeToConversationId(tenantId, conversationId, mode) {
    // kiểm tra mode có hợp lệ không
    const validModes = ["auto", "manual", "offChatbot"];
    if (!validModes.includes(mode)) {
      throw new Error(
        `Mode không hợp lệ: ${mode}. Chỉ chấp nhận ${validModes.join(", ")}`
      );
    }
    await redis.hSet(keyToConversationMeta(tenantId, conversationId), { mode });
    // cập nhật mode trong db
    const database = await connectDB();
    const conversations = database.collection("conversations");
    await conversations.updateOne(
      { conversationId: conversationId },
      { $set: { mode: mode } }
    );
    return mode;
  },

  // cập nhật thông tin hội thoại
  async update(tenantId, conversationId, updatedObject = {}) {
    const key = keyToConversationMeta(tenantId, conversationId);
    await redis.hSet(key, updatedObject);
    // cập nhật thông tin trong db
    const database = await connectDB();
    const conversations = database.collection("conversations");
    await conversations.updateOne(
      { conversationId: conversationId, tenantId: tenantId }, // Thêm điều kiện tenantId để đảm bảo đúng hội thoại
      { $set: updatedObject }
    );
  },
};
