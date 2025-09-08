// utils/claimedClients.js
const redis = require("../redisClient");
const client = require("./tenant_Client")
const conversation = require("./conversation_Store");
const keyToCmsData = (tenantId, sessionId) =>
  `tenant:${tenantId}:cmsId:${sessionId}`;

module.exports = {
  // ✅ Thiết lập client rỗng cho CMS mới vào (chưa claim ai)
  async init(tenantId, sessionId, cmsSocketId) {
    const key = keyToCmsData(tenantId, sessionId);
    // tìm xem đã có bản ghi claim nào chưa
    const exists = await redis.exists(key);
    if (exists) {
      // Nếu đã có thì không cần khởi tạo lại, chỉ cần cập nhật socketId
      await redis.hSet(key, { cmsSocketId: cmsSocketId });
      await redis.persist(key); // Đảm bảo key không bị xóa sau khi restart Redis
    }
    else {
      await redis.hSet(key,{ 
      clientId: "", // Chưa claim ai
      cmsSocketId: cmsSocketId, // Lưu socketId của CMS
      conversationId: "", // Chưa có cuộc trò chuyện nào
    });
    console.log(
      `[CMS_INIT] [${tenantId}] CMS ${sessionId} initialized with socketId ${cmsSocketId}`
    );
    }
    return cmsSocketId;

  },

  // ✅ Ghi đè/ghi mới clientId mà CMS này đang claim
  async claim(tenantId, sessionId, clientId) {
     const key = keyToCmsData(tenantId, sessionId);
     // điều kiện để claim: bản thân chưa claim ai, khách chưa được claim bởi ai
     // điều kiện 1: bản thân chưa claim ai
     const { clientId: currentClient } = await this.getCmsDetail(tenantId, sessionId);

     if (currentClient?.trim()&& currentClient !== clientId) {
       return new Error(`CMS already claimed client ${currentClient}`);
     }
     // điều kiện 2: khách chưa được claim bởi ai
    const {isClaim, cmsId} = await client.getClientData(tenantId, clientId);
    if (isClaim!=0&& cmsId!== sessionId) {
      return new Error(`Client ${clientId} is already claimed by CMS ${cmsId}`);
    }
    // thực hiện claim = cách gọi gettingClaimed của khách và cập nhật trạng thái nội bộ
    // gọi hàm gettingClaimed của khách
    const conversationId = await client.gettingClaimed(tenantId, clientId, sessionId);
    // cap nhat clientId và conversationId cho CMS
    await redis.hSet(key, {clientId: clientId, 
      conversationId: conversationId || "", // Nếu có cuộc trò chuyện thì lưu, nếu không thì để rỗng
    });
    console.log(
      `[CMS_CLAIM] [${tenantId}] CMS ${sessionId} claimed client ${clientId} with conversation ${conversationId}`
    );
    return conversationId
  },

  // unclaim clientId mà CMS đang claim
  async unclaim (tenantId, sessionId){
    const key = keyToCmsData(tenantId, sessionId);
    const {clientId} = await redis.hGetAll(key);
    // nếu có clientId thì cập nhật trạng thái về chưa claim
    if (clientId?.trim()) { // cập nhậy bảng client
      await client.gettingUnclaimed(tenantId, clientId);
    }
    // cập nhật bản thân(bảng cms)
    await redis.hSet(key, {clientId: "", 
      conversationId: "", 
    });
    return clientId; // Trả về clientId đã unclaim
  },

  // ✅ Lấy clientId mà CMS đang claim (nếu có)
  async getCmsDetail(tenantId, sessionId) {
    const key = keyToCmsData(tenantId, sessionId);
    const value = await redis.hGetAll(key);
    return value || null; // Trả về clientId hoặc null nếu không có
  },

  // // ✅ Lấy socketId của CMS đang claim clientId
  // async getSocketId(tenantId, sessionId) {
  //   const key = getClaimKey(tenantId, sessionId);
  //   const value = await redis.hGet(key, "cmsSocketId");
  //   return value || null; // Trả về socketId hoặc null nếu không có
  // },
  // ✅ Xóa bản ghi khi CMS disconnect hoặc thoát
  async clear(tenantId, sessionId) {
    const key = keyToCmsData(tenantId, sessionId);
    // lấy thông tin clientId hiện tại
    const {clientId, conversationId} = await redis.hGetAll(key);
    // nếu có clientId thì cập nhật trạng thái về chưa claim
    if(clientId?.trim()){
      await client.gettingUnclaimed(tenantId, clientId);
    }
    // set ttl của key về 5s;
    await redis.expire(key, 5);
    
  },
  async update(tenantId, sessionId, updatedObject = {}) {
    const key = keyToCmsData(tenantId, sessionId);
    await redis.hSet(key, updatedObject);
  },
  // gửi tin nhắn từ cms tới client
  async CMStoClient(io,tenantId, sessionId, msgObj) {
    // lấy thông tin clientId đang claim
    const {clientId} = await this.getCmsDetail(tenantId, sessionId);
    if (!(clientId?.trim())) {
      return console.warn(`[CMS_MESSAGE] [${tenantId}] Không tìm thấy clientId cho sessionId: ${sessionId}`);
    }
    // lấy socketId của client từ clientId
    const {wsId} = await client.getClientData(tenantId, clientId);
    if (!(wsId?.trim())) {
      return console.warn(
        `[CMS_MESSAGE] [${tenantId}] Không tìm thấy socketId của client: ${clientId}`
      );
    }
    // gửi sự kiện tới client qua WebSocket
    io.of("/client").to(wsId).emit("cms_message", msgObj);
    console.log(
      `[CMS_MESSAGE] [${tenantId}] 💬 CMS ${sessionId} gửi message đến client ${clientId} với socket: ${clientId}`
    );
  },
  // gửi sự kiện từ client tới CMS
  async clientToCms(io, tenantId, clientId, msgObj) {
    // lấy thông tin về cms đang phụ tách của client
    const {cmsId,wsId} = await client.getClientData(tenantId, clientId);
    if (!(cmsId?.trim())) {
      return console.warn(`[CMS_MESSAGE] [${tenantId}] Không tìm thấy CMS cho clientId: ${clientId}`);
    }
    // lấy socketId của CMS từ cmsId
    const {cmsSocketId} = await this.getCmsDetail(tenantId, cmsId);
    if (!(cmsSocketId?.trim())) {
      return console.warn(`[CMS_MESSAGE] [${tenantId}] Không tìm thấy socketId của CMS: ${cmsId}`);
    }
    // gửi sự kiện tới CMS qua WebSocket
    io.of("/cms").to(cmsSocketId).emit("client_message", msgObj);
    console.log(`[client_message] Message sent to CMS: ${cmsSocketId}`);
  },
  // async findCMSByClient(tenantId, clientId){
  //   const {isClaim, cmsId} = await client.getClaimInfo(tenantId, clientId);
  //   const cmsSocket = await getSocketId(tenantId, cmsId);
  //   return cmsSocket
  // },

   // gửi tin nhắn tới cms khi có conversation Id
  async botToCms (io,tenantId, conversationId, msgObj) {
    const {cmsId}= await conversation.getMetaData(tenantId, conversationId);
    if(!(cmsId?.trim())){return console.warn(`[CMS_MESSAGE] [${tenantId}] Không tìm thấy CMS cho conversationId: ${conversationId}`);}
    // lấy socketId của CMS từ cmsId
    const {cmsSocketId} = await this.getCmsDetail(tenantId, cmsId);
    if (!(cmsSocketId?.trim())) {
      return console.warn(`[CMS_MESSAGE] [${tenantId}] Không tìm thấy socketId của CMS: ${cmsId}`);
    }
    // gửi sự kiện tới CMS qua WebSocket
    io.of("/cms").to(cmsSocketId).emit("bot_rec_message", msgObj);
    console.log(`[bot_rec_message] Message sent to CMS: ${cmsId}, socketId: ${cmsSocketId}`);
  },
    // gửi tin nhắn tới cms khi có conversation Id
  async botToCmsOrder (io,tenantId, conversationId, msgObj) {
    const {cmsId}= await conversation.getMetaData(tenantId, conversationId);
    if(!(cmsId?.trim())){return console.warn(`[CMS_MESSAGE] [${tenantId}] Không tìm thấy CMS cho conversationId: ${conversationId}`);}
    // lấy socketId của CMS từ cmsId
    const {cmsSocketId} = await this.getCmsDetail(tenantId, cmsId);
    if (!(cmsSocketId?.trim())) {
      return console.warn(`[CMS_MESSAGE] [${tenantId}] Không tìm thấy socketId của CMS: ${cmsId}`);
    }
    // gửi sự kiện tới CMS qua WebSocket
    io.of("/cms").to(cmsSocketId).emit("orderQueue", msgObj);
     console.log(`[orderQueue] Message sent to CMS: ${cmsId}`);
  },
  async hasCMS (tenantId, sessionId) {
    const key = keyToCmsData(tenantId, sessionId);
    const exists = await redis.exists(key);
    return exists > 0; // Trả về true nếu có bản ghi, false nếu không
  }
};
