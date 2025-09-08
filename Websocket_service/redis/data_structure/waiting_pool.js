const redis = require("../redisClient");

// ✅ Key Redis có thêm tenantId
const getWaitingPoolKey = (tenantId) => `tenant:${tenantId}:waiting_pool`;

module.exports = {
  // ✅ Thêm socketId vào pool
  async add(tenantId, socketId) { // add nếu chưa có
    const exists = await redis.sIsMember(getWaitingPoolKey(tenantId), socketId);
    if (exists) {
      return; // Nếu đã có thì không thêm nữa
    }
    await redis.sAdd(getWaitingPoolKey(tenantId), socketId);
  },

  // ✅ Xoá socketId khỏi pool
  async remove(tenantId, socketId) {
    await redis.sRem(getWaitingPoolKey(tenantId), socketId);
  },

  // ✅ Kiểm tra xem socketId có trong pool không
  async has(tenantId, socketId) {
    return await redis.sIsMember(getWaitingPoolKey(tenantId), socketId);
  },

  // ✅ Lấy toàn bộ socketId trong pool
  async getAll(tenantId) {
    return await redis.sMembers(getWaitingPoolKey(tenantId));
  },
};
