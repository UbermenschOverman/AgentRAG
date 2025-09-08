const redis = require("../redisClient");

// Các key builder
const getConversationToCmsKey = (conversationId) =>
  `conversation:${conversationId}:cmsId`;
const getCmsToConversationKey = (cmsId) => `cms:${cmsId}:conversationId`;

module.exports = {
  // 📝 Cập nhật conversationId -> cmsId
  async setConversationToCms(conversationId, cmsId) {
    await redis.set(getConversationToCmsKey(conversationId), cmsId);
    await redis.set(getCmsToConversationKey(cmsId), conversationId);
  },

  // 🔍 Tìm cmsId từ conversationId
  async getCmsIdFromConversation(conversationId) {
    return await redis.get(getConversationToCmsKey(conversationId));
  },

  // 🔍 Tìm conversationId từ cmsId
  async getConversationIdFromCms(cmsId) {
    return await redis.get(getCmsToConversationKey(cmsId));
  },

  // ❌ Xóa ánh xạ của một conversationId và cmsId
  async clearConversationMapping(conversationId) {
    const cmsId = await redis.get(getConversationToCmsKey(conversationId));
    if (cmsId) {
      await redis.del(getConversationToCmsKey(conversationId)); // Xóa conversation -> cmsId ánh xạ
      await redis.del(getCmsToConversationKey(cmsId)); // Xóa cmsId -> conversation ánh xạ
    }
  },

  // ❌ Xóa ánh xạ của một cmsId
  async clearCmsMapping(cmsId) {
    const conversationId = await redis.get(getCmsToConversationKey(cmsId));
    if (conversationId) {
      await redis.del(getConversationToCmsKey(conversationId)); // Xóa conversationId -> cmsId ánh xạ
      await redis.del(getCmsToConversationKey(cmsId)); // Xóa cmsId -> conversation ánh xạ
    }
  },
};
