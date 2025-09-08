// // conversationHistory.js
// const redis = require("./redisClient");

// // Key builder cho Redis
// const getConversationSummaryKey = (tenantId, conversationId) =>
//   `tenant:${tenantId}:conversation:${conversationId}:summary`;

// // hàm ensuresummary nhận vào  (conversationId, text) trả về summary hoặc tạo summary mới chính = text

// // hàm cập nhật updatesummary nhận vào (conversationId, text), thay summary = text mới

// // hàm xóa del ((conversationId)

// module.exports = {
//     ensuresummary,
//     updatesummary,
// };
// conversationHistory.js
const redis = require("./redisClient");

// Key builder cho Redis
const getConversationSummaryKey = (tenantId, conversationId) =>
  `tenant:${tenantId}:conversation:${conversationId}:summary`;

// ensuresummary: Trả về summary hiện tại hoặc tạo summary mới nếu chưa có
const ensuresummary = async (tenantId, conversationId, text) => {
  const summaryKey = getConversationSummaryKey(tenantId, conversationId);
  const existingSummary = await redis.get(summaryKey);

  if (existingSummary) {
    return existingSummary; // Nếu đã có summary, trả về nó
  }

  // Nếu chưa có, tạo summary mới
  await redis.set(summaryKey, text);
  return "chưa có tóm tắt";
};

// updatesummary: Cập nhật summary với text mới
const updatesummary = async (tenantId, conversationId, text) => {
  const summaryKey = getConversationSummaryKey(tenantId, conversationId);
  await redis.set(summaryKey, text); // Cập nhật summary mới
  return text;
};

// del: Xóa summary của conversation
const del = async (tenantId, conversationId) => {
  const summaryKey = getConversationSummaryKey(tenantId, conversationId);
  await redis.del(summaryKey); // Xóa summary khỏi Redis
};

module.exports = {
  ensuresummary,
  updatesummary,
  del,
};
