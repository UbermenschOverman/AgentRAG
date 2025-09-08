// routes/facebookRouter.js
const express = require("express");

const {checkTenantExists} = require("./tenent_service/tenantService.js");
const waitingPool = require("./redis/data_structure/waiting_pool.js");
const queueStore = require("./redis/data_structure/redis_Queue.js");
const conversationStore = require("./redis/data_structure/conversation_Store.js");
const client = require("./redis/data_structure/tenant_Client.js");
const sendToKafka = require("./kafka/sendToKafka.js");


// POST /facebook/:tenantId
const router = express.Router();
router.post("/:tenantId", async ( req, res) => {
const io = req.app.locals.io;
  const tenantId = req.params.tenantId;
  const {externalId, text} = req.body;
  const clientId = externalId;
    if (!tenantId || !(await checkTenantExists(tenantId))){
        // Nếu tenantId không hợp lệ, trả về lỗi 400
        return res.status(400).json({ error: "TenantId không hợp lệ" });
    }
    // Tạo message
        const msgObj = {
        text: text ?? "",
        time: Date.now(),
        role: "client",
    };
  // kiểm tra xem clientId này đã tương tác với server chưa
    const exists = await client.hasClient(tenantId, clientId);
    if(!exists){
        // tạo hàng đợi cho clientId này
        await queueStore.initQueue(tenantId, clientId);
        await client.ensureClient(tenantId, clientId, 'facebook',"");
        // await client.ensureConversation(tenantId, clientId);
        await waitingPool.add(tenantId, clientId);
        // Gửi thông báo đến tất cả CMS rằng có client mới chờ
        await io.of("/cms").emit(`${tenantId}_waiting_client`, clientId);
    }
    // nếu đã tương tác trước đó thì check đã được claim chưa
    const isWaiting = await waitingPool.has(tenantId, clientId);
    if(isWaiting){
        // 🕗 Client chưa được claim
        await queueStore.push(tenantId, clientId, JSON.stringify(msgObj));
        console.log(`📥 [${tenantId}] Message queued (unclaimed): ${clientId}`);
        return res.status(200).json({ message: `Đã nhận webhook cho tenant, chưa được claim ${tenantId}` });
    }
    // ✅ Client đã được claim
    const conversationId = await client.ensureConversation(tenantId, clientId);
    // 📝 Lưu tin nhắn vào conversation
    await conversationStore.addMessage(tenantId, conversationId, msgObj);
    // tin nhắn được đẩy vào topic LLM_mes
    await sendToKafka.sendMessageToLLMmes(tenantId, conversationId, msgObj);
    await cms.botToCms(io, tenantId, conversationId, msgObj);
  res.status(200).json({ message: `Đã nhận webhook cho tenant ${tenantId}` });
});

module.exports = router;
