const redis = require("../redisClient");

// ✅ Thêm tenantId vào key
const getQueueKey = (tenantId, socketId) =>
  `tenant:${tenantId}:unclaimed_mes_queue:${socketId}`;

module.exports = {
  // Tạo hàng đợi mới nếu chưa có (Redis tự tạo khi push) nếu có rôi thì không cần
  async initQueue(tenantId, socketId) {
    const exists = await redis.exists(getQueueKey(tenantId, socketId));
    if (!exists) {
      // Push tạm để tạo list
      await redis.rPush(getQueueKey(tenantId, socketId), "");
      await redis.lPop(getQueueKey(tenantId, socketId));
    }
  },

  // Đẩy tin nhắn vào hàng đợi
  async push(tenantId, clientId, message) {
    await redis.rPush(getQueueKey(tenantId, clientId), message);
  },

  // Lấy toàn bộ tin nhắn trong hàng đợi
  async getAll(tenantId, socketId) {
    return await redis.lRange(getQueueKey(tenantId, socketId), 0, -1);
  },

  // Xóa hàng đợi nếu rỗng
  async deleteIfEmpty(tenantId, socketId) {
    const len = await redis.lLen(getQueueKey(tenantId, socketId));
    if (len === 0) {
      await redis.del(getQueueKey(tenantId, socketId));
    }
  },

  // Xóa hoàn toàn hàng đợi (sau khi chuyển tin nhắn vào conversation)
  async delete(tenantId, socketId) {
    await redis.del(getQueueKey(tenantId, socketId));
  },

  // Kiểm tra xem hàng đợi có tồn tại không
  async hasQueue(tenantId, socketId) {
    return (await redis.exists(getQueueKey(tenantId, socketId))) === 1;
  },

  // Lấy độ dài hàng đợi
  async length(tenantId, socketId) {
    return await redis.lLen(getQueueKey(tenantId, socketId));
  },
};
