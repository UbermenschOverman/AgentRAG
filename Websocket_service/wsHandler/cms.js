const queueStore = require("../redis/data_structure/redis_Queue");
const waitingPool = require("../redis/data_structure/waiting_pool");
const cms = require("../redis/data_structure/claimed_Client");
const conversation = require("../redis/data_structure/conversation_Store");
const sendToKafka = require("../kafka/sendToKafka");
const client = require("../redis/data_structure/tenant_Client");
//event connect
//event connect
// async function handleCMSConnection(sessionId,tenantId, socketId ) {
//   try {
   
//     console.log(
//       `🧑‍💼 [${tenantId}] CMS connected: ${sessionId}`
//     );
//   } catch (err) {
//     console.error("❌ Lỗi trong handleCMSConnection:", err);
//   }
// }

//event claim
async function handleClaim(cmsSocket, clientId, tenantId, sessionId, callback) {
  try {

  const conversationId = await cms.claim(tenantId, sessionId, clientId); // thực hiện claim

  // check xem mode của hội thoại này là gì
    // Lấy metadata và kiểm tra null
    const meta = await conversation.getMetaData(tenantId, conversationId);
    if (!meta) {
      throw new Error(`[CLAIM] Không tìm thấy metadata cho conversationId: ${conversationId}`);
    }
    const { mode } = meta;
  
  // nếu mode là manual thì : đẩy tin nhắn từ hội thoại vào hàng đợi
  if (mode ==="manual"){
     const queueMessages = await queueStore.getAll(tenantId, clientId); // đẩy tất cả tin nhắn trong hàng đợi vào hội thoại này

  // nêu hàng đợi có tin nhắn thì gửi lên kafka
  if (queueMessages.length > 0) {
    console.log(
      `[CLAIM] [${tenantId}] Nạp ${queueMessages.length} tin nhắn từ queue vào hội thoại`
    );
    let combined_mes = "";
    // hợp các message lại thành một chuỗi
    for (const rawMsg of queueMessages) {
      const msgObj = JSON.parse(rawMsg);
      await conversation.addMessage(tenantId, conversationId, msgObj);
      combined_mes += (msgObj.text ?? "") + ". ";
    }
    const msgObj = {
      tenantId: tenantId,
      conversationId: conversationId,
      text: combined_mes.trim()
      }
    // gửi lên kafka
    await sendToKafka.sendMessageToLLMmes(
      tenantId,
      conversationId,
      msgObj,
      clientId
    );
    console.log(`[KAFKA] [${tenantId}] Prompt đã được gửi đến LLM_mes`);
  }
  // xóa hàng đợi này
  await queueStore.delete(tenantId, clientId);
  }
  // nếu là mode auto thì tin nhắn đến sẽ được tự động gửi LLM rồi nên không phải làm gì cả, chỉ bỏ khách này ra khỏi waiting pool thôi
  await waitingPool.remove(tenantId, clientId); // xóa client này khỏi pool đang đợi

  //lấy lich sử hội thoại và gửi lên cms
  const history = await conversation.getMessages(tenantId, conversationId);
  cmsSocket.emit("conversation_history", {
    clientId,
    history,
  });
  
  console.log(
    `[CLAIM] [${tenantId}] CMS ${sessionId} nhận phụ trách client ${clientId} - đã gửi lịch sử`
  );
  callback({ success: true }); // gửi phản hồi thành công về cho CMS
} catch (err) {
  console.error("❌ Lỗi trong handleClaim:", err);
  callback({ success: false, error: err.message }); // gửi phản hồi lỗi về cho CMS
  return;
  }
}

// event unclaim
async function handleUnclaim(sessionId, tenantId) {
  try{
  const clientId =await cms.unclaim(tenantId, sessionId); // xóa entry trong claimedClients
  if (!clientId?.trim()) {
    console.warn(
      `[UNCLAIM] [${tenantId}] ❌ CMS ${sessionId} không claim client nào`
    );
    return;
  }
  await waitingPool.add(tenantId, clientId);
  await queueStore.initQueue(tenantId, clientId);

    console.log(
    `[UNCLAIM] [${tenantId}] CMS ${sessionId} bỏ claim client ${clientId}`
  );
  return;
} catch (err) {
  console.error("❌ Lỗi trong handleUnclaim:", err);

  return;
}
  }

  //event disconnect
async function handleCMSDisconnect(socket, io) {
  try{
  const sessionId = socket.data.sessionId;
  const tenantId = socket.tenantId;

  const {clientId} = await cms.getCmsDetail(tenantId, sessionId);// lấy clientId đã claim

  if (clientId?.trim()) { // nếu có
    await handleUnclaim(socket, io); // cập nhật trạng thái về chưa claim
    io.of("/cms").emit(`${tenantId}_waiting_client`, [clientId]); // thông báo cho tất cả cms về client này
    console.log(
      `♻️ [${tenantId}] Client ${clientId} được đưa lại vào hàng đợi vì CMS ${sessionId} rớt`
    );
  }

  await cms.clear(tenantId, sessionId); //nếu có clientId thì cập nhật trạng thái về chưa claim, cập nhật trạng thái cuộc trò chuyện về chưa claim

  console.log(`❌ [${tenantId}] CMS disconnected: ${sessionId}`);
} catch (err) {
  console.error("❌ Lỗi trong handleCMSDisconnect:", err);
  socket.emit("error", { error: "Lỗi khi ngắt kết nối CMS." });
  }
}


// event cms_message
async function handleCMSMessage(socket, io, message) {
  try{
  const sessionId = socket.data.sessionId;
  const cmsId = socket.id;
  const tenantId = socket.tenantId;

  // lấy clientId đang được claim
  const {clientId, conversationId} = await cms.getCmsDetail(tenantId, sessionId);

  if (!(clientId?.trim())) {
    console.warn(
      `[CMS_MESSAGE] [${tenantId}] ❌ CMS ${sessionId} không claim client nào`
    );
    socket.emit("error", { message: "Bạn chưa claim client nào." });
    return;
  }

  const msgObj = {
    text: message.text ?? "",
    time: message.time ?? Date.now(),
    role: message.role ?? "cms",  };

  // thêm tin nhắn vào hội thoại
  await conversation.addMessage(tenantId, conversationId, msgObj);
  
  // emit tới client đó
  // check plaform của người dùng đó
  const {platform} = await client.getClientData(tenantId, clientId);
  if(platform== "web"){
      await cms.CMStoClient(io, tenantId, sessionId, msgObj);
       console.log(
    `[CMS_MESSAGE] [${tenantId}] 💬 CMS ${cmsId} gửi message đến client ${clientId}`
  );
      return;
    }
  else if(platform == "facebook"){
    // gửi tin nhắn đến facebook
    console.log(
      `[CMS_MESSAGE] [${tenantId}] Gửi tin nhắn đến facebook client ${clientId} : `, {message}
    );
    return;
  }
  else{
    throw new Error(
      `[CMS_MESSAGE] [${tenantId}] ❌ Không hỗ trợ mode ${platform} cho client ${clientId}`
    );
  }
} catch (err) {
  console.error("❌ Lỗi trong handleCMSMessage:", err);
  socket.emit("error", { error: "Lỗi khi gửi tin nhắn CMS." });
  return;
  }
}

// event change_mode
async function handleChangeMode(socket,object , callback){
  try {
    // get conversationId từ clientId
    console.log("handleChangeMode", object);
    const {clientId, mode:rawmode, tenantId} = object;
    const mode = rawmode?.trim(); // chuẩn hóa mode về chữ thường và loại bỏ khoảng trắng
    if (!clientId || !mode) {
     throw new Error(`[CHANGE_MODE] [${tenantId}] Thiếu clientId hoặc mode trong yêu cầu`);
    }
    // kiểm tra mode có hợp lệ không
    const validModes = ["auto", "manual", "offChatbot"];
    if (!validModes.includes(mode)) {
      throw new Error(`[CHANGE_MODE] [${tenantId}] Mode không hợp lệ: ${mode}`);
    }
    const {conversationId} = await client.getClientData(tenantId, clientId);
    if (!conversationId) {
      throw new Error(`[CHANGE_MODE] [${tenantId}] Không tìm thấy conversationId cho client ${clientId}`);
    }
    // cập nhật mode trong conversation
    await conversation.setModeToConversationId(tenantId, conversationId, mode);
    callback({ success: true, message: "Đã cập nhật mode thành công", mode: mode });
    console.log(
      `[CHANGE_MODE] [${tenantId}] Đã cập nhật mode cho client ${clientId} thành ${mode}`
    );
  }catch (err) {
   throw new Error(`[CHANGE_MODE] ❌ Lỗi khi thay đổi mode: ${err.message}`);
  }
}

// event get client id conversation mode
async function getClientIdConversationMode(tenantId,clientId, callback) {
  try {
    const { mode } = await client.getClientData(tenantId, clientId);
    if ( mode) {
      throw new Error(`[GET_CLIENT_ID] [${tenantId}] Thiếu thông tin clientId, conversationId hoặc mode`);
    }
    callback({ success: true, mode: mode });
  } catch (err) {
    throw new Error(`[GET_CLIENT_ID] [${tenantId}] ❌ Lỗi khi lấy mode của client: ${err.message}`);
  }
}

module.exports = {
  // handleCMSConnection,
  handleUnclaim,
  handleCMSDisconnect,
  handleClaim,
  handleCMSMessage,
  handleChangeMode,
  getClientIdConversationMode
};
