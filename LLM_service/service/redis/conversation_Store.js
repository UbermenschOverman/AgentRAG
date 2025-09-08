const redis = require("./redisClient");
const { v4: uuidv4 } = require("uuid");
// trong này có 2 ds là ConversationMap ánh xạ  tenantId, clientId tới conversationId
// ✅ Key builders có tenantId
const getConversationMapKey = (tenantId, clientId) =>
  `tenant:${tenantId}:conversation_map:${clientId}`;

const getConversationKey = (tenantId, conversationId) =>
  `tenant:${tenantId}:conversation:${conversationId}`;

module.exports = {
  // 🔍 Kiểm tra client có conversation chưa
  async hasConversation(tenantId, clientId) {
    return await redis.exists(getConversationMapKey(tenantId, clientId));
  },

  // 🔁 Tạo mới conversation nếu chưa có, trả về conversationId
  async ensureConversation(tenantId, clientId) {
    let conversationId = await redis.get(
      getConversationMapKey(tenantId, clientId)
    );
    if (!conversationId) {
      conversationId = uuidv4();
      await redis.set(
        getConversationMapKey(tenantId, clientId),
        conversationId
      );
    }
    return conversationId;
  },

  // 📨 Thêm tin nhắn mới vào hội thoại
  async addMessage(tenantId, clientId, message) {
    const conversationId = await this.ensureConversation(tenantId, clientId);
    const key = getConversationKey(tenantId, conversationId);
    console.log("Conversation_Store: ", message);
    const entry = JSON.stringify(message);
    await redis.rPush(key, entry);
    // Optional TTL (ví dụ: 7 ngày)
    await redis.expire(key, 7 * 24 * 60 * 60);
  },

  async addMessage_bot(tenantId, conversationId, message) {
    const key = getConversationKey(tenantId, conversationId);
    console.log("Conversation_Store: ", message);
    const entry = JSON.stringify(message);
    await redis.rPush(key, entry);
    // Optional TTL (ví dụ: 7 ngày)
    await redis.expire(key, 7 * 24 * 60 * 60);
  },

  // 📜 Lấy tất cả tin nhắn trong hội thoại
  async getMessages(tenantId, clientId) {
    const conversationId = await redis.get(
      getConversationMapKey(tenantId, clientId)
    );
    if (!conversationId) return [];
    const key = getConversationKey(tenantId, conversationId);
    const list = await redis.lRange(key, 0, -1);
    return list.map((msg) => JSON.parse(msg));
  },

  // 📜 Lấy tất cả tin nhắn trong hội thoại
  async getMessages_bot(tenantId, conversationId) {
    if (!conversationId) return [];
    const key = getConversationKey(tenantId, conversationId);
    const list = await redis.lRange(key, 0, -1);
    return list.map((msg) => JSON.parse(msg));
  },

  // ❌ Xóa/reset hội thoại
  async clearConversation(tenantId, clientId) {
    const conversationId = await redis.get(
      getConversationMapKey(tenantId, clientId)
    );
    if (conversationId) {
      await redis.del(getConversationMapKey(tenantId, clientId));
      await redis.del(getConversationKey(tenantId, conversationId));
    }
  },
};
