const redis = require("../redisClient");
const { connectDB } = require("../../config/mongo");
const conversation = require("./conversation_Store");
const crypto = require("crypto");

let db = null;

// Hàm lấy kết nối, chỉ connect 1 lần
async function getDb() {
  if (!db) {
    db = await connectDB();
  }
  return db;
}

const clientKey = (tenantId, clientId) =>
  `tenant:${tenantId}:client:${clientId}`;
const TTL_SECONDS = 3600 * 24; // 24 giờ

/**
 * Thêm clientId riêng biệt với TTL cho tenant, đồng thời lưu platform
 */

// kiểm tra đầu tiên ở redis nếu không có thì kiểm tra ở mongoDB
/**
 * kiểm tra exist_in_redis, exist_in_mongoDB
 * nếu exist_in_redis && exist_in_mongoDB thì cập nhật lại TTL và socketId
 * nếu exist_in_redis==false && exist_in_mongoDB==true thì tạo entry mới trong redis
 * nếu exist_in_redis==true && exist_in_mongoDB==false thì báo lỗi
 * nếu exist_in_redis==false && exist_in_mongoDB==false thì tạo entry mới trong mongoDB và redis
 * trả về
 */
async function ensureClient(tenantId, clientId, platform, socketId) {
  // kiểm tra trong redis
  const key = clientKey(tenantId, clientId);
  const exist_in_redis = await redis.exists(clientKey(tenantId, clientId));
  // kiểm tra trong mongoDB
  const database = await getDb();
  const clientsCollection = database.collection("clients");
  const exist_in_mongoDB = await clientsCollection.findOne({
    tenantId,
    clientId,
  });
  if (clientsCollection && exist_in_mongoDB) {
    await redis.expire(key, TTL_SECONDS);
    await redis.hSet(key, { wsId: socketId });
    return; // Nếu đã có thì không thêm nữa
  }
  if (exist_in_mongoDB && !exist_in_redis) {
    await redis.hSet(key, {
      platform: platform,
      wsId: socketId,
      summary: "Summary trống",
      isClaim: 0, // chưa claim
      cmsId: "", // chưa có cmsId
      conversationId: "", // chưa có conversationId
      orders: "[]", // mảng orderIds rỗng
      escalatedIds: "[]", // mảng escalatedIds rỗng
    });
    await redis.expire(key, TTL_SECONDS);
    return;
  }
  if (!exist_in_mongoDB && !exist_in_redis) {
    // nếu không có trong redis và mongoDB thì tạo mới
    await redis.hSet(key, {
      platform: platform,
      wsId: socketId,
      summary: "Summary trống",
      isClaim: 0, // chưa claim
      cmsId: "", // chưa có cmsId
      conversationId: "", // tạo mới conversationId
      orders: "[]", // mảng orderIds rỗng
      escalatedIds: "[]", // mảng escalatedIds rỗng
    });
    await redis.expire(key, TTL_SECONDS);
    // thêm vào mongoDB
    const database = await getDb();
    const clientsCollection = database.collection("clients");
    const newClient = {
      clientId,
      tenantId,
      name: "",
      phoneNumber: "",
      conversations: [],
      orders: [],
      interestedProducts: [],
      customerCharacteristics: [],
      lastSeen: Date.now(),
      createdAt: Date.now(),
    };
    await clientsCollection.insertOne(newClient);
    console.log(
      `[CLIENT] [${tenantId}] Đã tạo client mới cho client ${clientId} `
    );
    return;
  }
  if (!exist_in_mongoDB && exist_in_redis) {
    // nếu có trong redis nhưng không có trong mongoDB thì báo lỗi
    throw new Error(
      `[CLIENT] [${tenantId}] ❌ Client ${clientId} đã tồn tại trong Redis nhưng không tìm thấy trong MongoDB`
    );
  }
}

/**
 * Ensure conversationId
 */
async function ensureConversation(tenantId, clientId) {
  // check đầu vào
  if (!tenantId?.trim() || !clientId?.trim()) {
    throw new Error("Thiếu tenantId hoặc clientId");
  }
  const key = clientKey(tenantId, clientId);
  const { conversationId } = await redis.hGetAll(key);
  if (!conversationId?.trim()) {
    const convoId = crypto.randomUUID();
    await conversation.ensureConvoForClient(tenantId, convoId, clientId);
    await redis.hSet(key, { conversationId: convoId });
    console.log(
      `[CONVERSATION] [${tenantId}] Đã tạo conversationId mới cho client ${clientId}: ${convoId}`
    );
    // add vào mảng conversations trong mongoDB
    const database = await getDb();
    const clientsCollection = database.collection("clients");
    await clientsCollection.updateOne(
      { tenantId, clientId },
      { $addToSet: { conversations: convoId } }
    );
    return convoId;
  }
  return conversationId;
}
/**
 * Xóa mềm clientId khỏi redis bằng cách set TTL về 5 phút
 */
async function removeClient(tenantId, clientId) {
  const key = clientKey(tenantId, clientId);
  await redis.expire(key, 30); // set TTL về 30 giây
}

/**
 * Kiểm tra clientId có trong  mongoDB và redis hay không, nếu có ở mongoDB thì trả về false
 */
async function hasClient(tenantId, clientId) {
  const key = clientKey(tenantId, clientId);
  const exists = await redis.exists(key);
  console.log(
    "kiểm tra tồn tại trong redis",
    tenantId,
    clientId,
    "exists:",
    exists,
    "key:",
    key
  );
  if (exists) {
    await redis.expire(key, TTL_SECONDS); // reset TTL
    return true;
  }
  return false;
}

/**
 * Lấy thông tin của client
 */
async function getClientData(tenantId, clientId) {
  const key = clientKey(tenantId, clientId);
  return await redis.hGetAll(key);
}
/**
 * câp nhật
 */
async function update(tenantId, clientId, conversationId, updatedObject = {}) {
  const database = await getDb();
  const conversations = database.collection("conversations");
  const key = clientKey(tenantId, clientId);
  await redis.hSet(key, updatedObject);
  await conversations.updateOne(
    { conversationId: conversationId },
    { $set: updatedObject }
  );
}
/**
 * claimed
 */
async function gettingClaimed(tenantId, clientId, cmsId) {
  // thực hiện chuẩn bị cho việc được claim, bước 1: update trạng thái nội bộ, bước 2: cập nhật hội thoại của khách này
  // bước 1: cập nhật trạng thái nội bộ
  const key = clientKey(tenantId, clientId);
  await redis.hSet(key, {
    isClaim: 1,
    cmsId: cmsId,
  });
  // bước 2: cập nhật hội thoại của khách này
  const conversationId = await ensureConversation(tenantId, clientId);
  await conversation.update(tenantId, conversationId, {
    cmsId: cmsId,
  });
  return conversationId;
}
/**
 * unclaimed
 */
async function gettingUnclaimed(tenantId, clientId) {
  // thực hiện unclaim, bước 1: cập nhật trạng thái nội bộ, bước 2: cập nhật hội thoại của khách này
  const key = clientKey(tenantId, clientId);
  await redis.hSet(key, {
    isClaim: 0,
    cmsId: "",
  });
  const conversationId = await ensureConversation(tenantId, clientId);
  conversation.update(tenantId, conversationId, {
    cmsId: "",
  });
  return conversationId;
}
/**
 * Gửi tin nhắn cho client khi biết conversationId
 */
async function botToClient(io, tenantId, conversationId, msgObj) {
  const { clientId } = await conversation.getMetaData(tenantId, conversationId);
  const { platform } = await getClientData(tenantId, clientId);
  if (!clientId?.trim()) {
    return console.warn(
      `[CMS_MESSAGE] [${tenantId}] Không tìm thấy clientId cho conversationId: ${conversationId}`
    );
  }
  // lấy socketId của client từ clientId
  const { wsId } = await getClientData(tenantId, clientId);
  if (!wsId?.trim()) {
    return console.warn(
      `[CMS_MESSAGE] [${tenantId}] Không tìm thấy socketId của client: ${clientId}`
    );
  }
  // kiểm tra mode của client
  if (platform === "web") {
    // gửi sự kiện tới client qua WebSocket
    io.of("/client").to(wsId).emit("cms_message", msgObj);
    console.log(
      `[CMS_MESSAGE] [${tenantId}] 💬 Bot gửi message đến client ${clientId}`
    );
    return;
  } else if (platform === "facebook") {
    // gửi tin nhắn đến facebook
    console.log(
      `[CMS_MESSAGE] [${tenantId}] Gửi tin nhắn đến facebook client ${clientId} : `,
      msgObj
    );
  } else {
    throw new Error(
      `[CMS_MESSAGE] [${tenantId}] ❌ Không hỗ trợ platform ${platform} cho client ${clientId}`
    );
  }
}

// thêm orderId vào mảng orders của client
async function addOrderIdToClient(tenantId, clientId, orderId) {
  if (!tenantId?.trim() || !clientId?.trim() || !orderId?.trim()) {
    throw new Error("Thiếu tenantId, clientId hoặc orderId");
  }
  const key = clientKey(tenantId, clientId);
  // lấy mảng orders hiện tại
  const raworders = await redis.hGet(key, "orders"); // hget là
  const orders = raworders ? JSON.parse(raworders) : [];
  // kiểm tra nếu orderId không được include trong mảng orders thì đẩy vào
  if (!orders.includes(orderId)) {
    await redis.hSet(key, {
      orders: JSON.stringify([...orders, orderId]),
    });
    console.log(
      `[ORDER] [${tenantId}] Đã thêm orderId ${orderId} vào client ${clientId}`
    );
  }
}

async function addEscalatedToClient(
  tenantId,
  clientId,
  conversationId,
  escalatedReq
) {
  if (
    !tenantId?.trim() ||
    !clientId?.trim() ||
    !escalatedReq?.requestId?.trim()
  ) {
    throw new Error("Thiếu tenantId, clientId hoặc escalatedReq.requestId");
  }

  try {
    const { requestId } = escalatedReq;

    // Thêm requestId vào escalatedIds của client
    const key = clientKey(tenantId, clientId);
    const rawEscalatedIds = await redis.hGet(key, "escalatedIds");
    const escalatedIds = rawEscalatedIds ? JSON.parse(rawEscalatedIds) : [];

    if (!escalatedIds.includes(requestId)) {
      escalatedIds.push(requestId);
      await redis.hSet(key, { escalatedIds: JSON.stringify(escalatedIds) });
      console.log(
        `[ESCALATED] [${tenantId}] Đã thêm escalatedId ${requestId} vào client ${clientId}`
      );
    } else {
      console.log(
        `[ESCALATED] [${tenantId}] escalatedId ${requestId} đã tồn tại trong client ${clientId}`
      );
    }

    // Thêm nội dung escalatedReq vào conversation (dùng clientId như conversationId ở đây)
    await conversation.addEscalatedRequest(
      tenantId,
      conversationId,
      escalatedReq
    );
  } catch (err) {
    console.error(
      `[ESCALATED] [${tenantId}] ❌ Lỗi khi thêm escalatedId vào client ${clientId}:`,
      err
    );
    throw err;
  }
}

// remove escalated id
async function removeEscalatedFromClient(tenantId, clientId, requestId) {
  try {
    console.log(
      `[ESCALATED] [${tenantId}] Bắt đầu xóa escalatedId ${requestId} khỏi client ${clientId}`
    );
    if (!tenantId?.trim() || !clientId?.trim() || !requestId?.trim()) {
      throw new Error("Thiếu tenantId, clientId hoặc requestId");
    }

    const key = clientKey(tenantId, clientId);
    const rawEscalatedIds = await redis.hGet(key, "escalatedIds");
    const conversationId = await redis.hGet(key, "conversationId");
    const escalatedIds = rawEscalatedIds ? JSON.parse(rawEscalatedIds) : [];

    if (!Array.isArray(escalatedIds)) {
      console.warn(
        `[ESCALATED] [${tenantId}] Trường escalatedIds của client ${clientId} không phải là mảng. Bỏ qua bước xóa Redis.`
      );
    } else if (escalatedIds.includes(requestId)) {
      const updatedEscalatedIds = escalatedIds.filter((id) => id !== requestId);
      await redis.hSet(key, {
        escalatedIds: JSON.stringify(updatedEscalatedIds),
      });
      console.log(
        `[ESCALATED] [${tenantId}] Đã xóa requestId ${requestId} khỏi escalatedIds của client ${clientId}`
      );
    } else {
      console.log(
        `[ESCALATED] [${tenantId}] requestId ${requestId} không tồn tại trong escalatedIds của client ${clientId}`
      );
    }

    // Xóa request khỏi conversation
    const deleted = await conversation.deleteEscalatedRequest(
      tenantId,
      conversationId,
      requestId
    );
    if (deleted) {
      console.log(
        `[ESCALATED] [${tenantId}] Đã xóa escalated request ${requestId} khỏi conversation của client ${clientId}`
      );
    } else {
      console.log(
        `[ESCALATED] [${tenantId}] escalated request ${requestId} không tồn tại trong conversation của client ${clientId}`
      );
    }
  } catch (err) {
    console.error(
      `[ESCALATED] [${tenantId}] ❌ Lỗi khi xóa escalatedId khỏi client ${clientId}:`,
      err
    );
    throw err;
  }
}

async function getEscalatedRequests(tenantId, clientId) {
  if (!tenantId || !clientId) {
    throw new Error("Thiếu tenantId hoặc clientId");
  }
  const key = clientKey(tenantId, clientId);
  const conversationId = await redis.hGet(key, "conversationId");
  if (!conversationId) {
    throw new Error(
      `[ESCALATED] [${tenantId}] Không tìm thấy conversationId cho client ${clientId}`
    );
  }
  const escalatedRequests = await conversation.getEscalatedRequests(
    tenantId,
    conversationId
  );
  return escalatedRequests || [];
}
async function getAllClients(tenantId) {
  const key = `tenant:${tenantId}:client:*`;
  const clientKeys = await redis.keys(key);
  // loại bỏ tiền tố `tenant:${tenantId}:client:` để lấy clientId
  for (let i = 0; i < clientKeys.length; i++) {
    clientKeys[i] = clientKeys[i].replace(`tenant:${tenantId}:client:`, "");
  }
  return clientKeys;
}
/**
 * Gửi tin nhắn tới cms đang claim clientId
 */
//   async function clientToCMS(io, tenantId, clientId, msgObj) {
//   const {cmsId} = await getClientData(tenantId, clientId);
//   if(!(cmsId?.trim())) {
//     console.warn(`[CLIENT_TO_CMS] [${tenantId}] ❌ Không tìm thấy CMS đang claim client ${clientId}`);
//     return;
//   }
//   // lấy socketId của CMS
//   const {cmsSocket}= await cms.getCmsDetail(tenantId, cmsId);
//   if(!(cmsSocket?.trim())) {
//     console.warn(`[CLIENT_TO_CMS] [${tenantId}] ❌ Không tìm thấy socketId của CMS ${cmsId}`);
//     return;
//   }
//   // gửi tin nhắn tới CMS
//   io.of("/cms").to(cmsSocket).emit("client_message", {
//     clientId,
//     message: msgObj,
//   });
// }

// /**
//  * Xóa claim
//  */
// async function clearClaim(tenantId, clientId) {
//   const key = clientKey(tenantId, clientId);
//   await redis.hSet(key, {
//     isClaim: 0,
//     cmsId: "",
//   });
// },
// /**
//  * Lấy thông tin claim
//  */
// async function getClaimInfo(tenantId, clientId) {
//   const key = clientKey(tenantId, clientId);
//   const claimInfo = await redis.hGetAll(key);
//   return {
//     isClaim: claimInfo.isClaim === "1",
//     cmsId: claimInfo.cmsId || null,
//   };
// },
// /**
//  * Lấy thông tin của client
//  */
// async function getClientInfo(tenantId, clientId) {
//   const key = clientKey(tenantId, clientId);
//   const clientInfo = await redis.hGetAll(key);
//   return {
//     platform: clientInfo.platform || null,
//     wsId: clientInfo.wsId || null,
//     summary: clientInfo.summary || "Summary trống",
//     isClaim: clientInfo.isClaim === "1",
//     cmsId: clientInfo.cmsId || null,
//     conversationId: clientInfo.conversationId || null,
//   };
// }

module.exports = {
  ensureClient,
  ensureConversation,
  removeClient,
  hasClient,
  getClientData,
  update,
  gettingClaimed,
  gettingUnclaimed,
  botToClient,
  addOrderIdToClient,
  getAllClients,
  addEscalatedToClient,
  removeEscalatedFromClient,
  getEscalatedRequests,
  // clearClaim,
  // getClaimInfo,
  // getClientInfo
};
