const {
  handleUnclaim,
  handleCMSDisconnect,
  handleClaim,
  handleCMSMessage,
  handleChangeMode,
  getClientIdConversationMode,
} = require("./cms.js");
const crypto = require("crypto");
const waitingPool = require("../redis/data_structure/waiting_pool.js");
// const { tenantMiddleware } = require("../middleware/tenantMiddleware.js");
const { checkTenantExists } = require("../tenent_service/tenantService.js.js");
const { hasCMS, init } = require("../redis/data_structure/claimed_Client.js");
const client = require("../redis/data_structure/tenant_Client.js");
function registerCMSNamespace(io) {
  const cmsNamespace = io.of("/cms");

  cmsNamespace.on("connection", async (socket) => {
    try {
      const tenantId = socket.handshake.query.tenantId;
      socket.tenantId = tenantId; // Gắn tenantId vào socket để dùng sau
      if (!tenantId || !(await checkTenantExists(tenantId))) {
        console.log(
          `❌ Kết nối bị từ chối. TenantId không hợp lệ: ${Object.keys(
            socket.handshake.query
          )}`
        );
        console.log(socket.handshake.query.tenantId);
        socket.disconnect(true);
        return;
      }

      socket.emit("ack", {
        success: true,
        message: `Kết nối thành công với tenant ${tenantId}`,
      });
      socket.join(`tenant:${tenantId}`);
      console.log(`🏠 [${tenantId}] CMS đã join vào room tenant:${tenantId} với socketid: ${socket.id}`);
      // room member:
      // socket.tenantId = tenantId;
      // console.log(`👤 Client từ tenant ${tenantId} đã kết nối: ${socket.id}`);
      // console.log(`📡 New CMS connected: ${socket.id}`);
      // const sessionId = socket.handshake.auth?.sessionId;
      // if (sessionId&& await hasCMS(tenantId, sessionId)) {
      //   // Reconnect với session cũ
      //   socket.data.sessionId = sessionId;
      // } else {
      //   // New session
      //   const newSessionId = crypto.randomUUID();

      //   // Gửi về client để lưu localStorage
      //   socket.emit("sessionId", {
      //     sessionId: newSessionId,
      //   });
      // }

      socket.on("register", async ({ sessionId, tenantId }, callback) => {
        socket.data.sessionId = sessionId;
        try {
          //
          const exists = await hasCMS(tenantId, sessionId);
          console.log(`tồn tại: ${exists}`);
          if (sessionId && exists) {
            // Reconnect với session cũ
            socket.data.sessionId = sessionId;
            await init(tenantId, sessionId, socket.id);
            console.log(
              `👤 CMS từ tenant ${tenantId} đã kết nối lại: ${sessionId}`
            );
            return callback({
              success: true,
              message: "Đã kết nối lại với session cũ.",
              newSession: false,
              sessionId: sessionId,
            });
          } else {
            // New session
            const newSessionId = crypto.randomUUID();
            await init(tenantId, newSessionId, socket.id);
            socket.data.sessionId = newSessionId;
            // Gửi về client để lưu localStorage
            console.log(
              `👤 CMS từ tenant ${tenantId} đã kết nối mới: ${newSessionId}`
            );
            return callback({
              success: true,
              message: "Đã tạo session mới.",
              newSession: true,
              sessionId: newSessionId,
            });
          }
        } catch (err) {
          console.error("❌ Lỗi khi thiết lập kết nối CMS:", err);
          callback({ success: false, error: err.message });
          return;
        }
        // Xử lý kết nối CMS
        //   await handleCMSConnection(socket, io);
        //   console.log(`👤 CMS từ tenant ${tenantId} đã kết nối: ${sessionId}`);
        //
      });

      // socket.on("setup", async ({ sessionId, tenantId }, callback) => {
      //   try{
      //      await handleCMSConnection(socket, io);
      //   }catch(err){
      //     console.error("❌ Lỗi khi thiết lập kết nối CMS:", err);
      //     callback({ success: false, error: err.message });
      //     return;
      //   }
      // })

      socket.on("getWaitingClients", async (tenantId, callback) => {
        try {
          // const waitingClients = await waitingPool.getAll(tenantId);
          const waitingClients = await client.getAllClients(tenantId);
          callback({ success: true, clients: waitingClients });
          console.log(`📋 Danh sách client đang chờ: ${waitingClients}`);
        } catch (err) {
          console.error("❌ Lỗi khi lấy danh sách client đang chờ:", err);
          callback({ success: false, error: err.message });
        }
      });
      // Khi CMS ngắt kết nối
      socket.on("disconnect", (reason) => {
        console.log(
          `🔌 [${socket.tenantId}] CMS ${socket.data.sessionId} đã ngắt kết nối ${reason}`
        );
        try {
          handleCMSDisconnect(socket, io);
        } catch (err) {
          console.error("❌ Lỗi khi xử lý disconnect CMS:", err);
        }
      });

      socket.on("getClientOrders", async ({ tenantId, clientId }, callback) => {
        try {
          const { orders } = await client.getClientData(tenantId, clientId);
          const parseOrders = JSON.parse(orders);

          if (!parseOrders)
            throw new Error("Không tìm thấy đơn hàng của client");
          callback({ success: true, orderIds: parseOrders });
          console.log(
            `📦 Đơn hàng của client ${clientId} đã được lấy thành công.`
          );
        } catch (err) {
          console.error("❌ Lỗi khi lấy đơn hàng của client:", err);
          callback({ success: false, error: err.message });
        }
      });
      // Khi CMS claim một client
      socket.on("claim", ({ clientId, tenantId, sessionId }, callback) => {
        try {
          handleClaim(socket, clientId, tenantId, sessionId, callback);
        } catch (err) {
          console.error("❌ Lỗi khi CMS claim client:", err);
        }
      });

      // Khi CMS bỏ claim
      socket.on("unclaim", ({ sessionId, tenantId }, callback) => {
        try {
          handleUnclaim(sessionId, tenantId);
          callback({ success: true, message: "Đã bỏ claim client." });
          console.log(`♻️ [${tenantId}] CMS ${sessionId} đã bỏ claim client`);
        } catch (err) {
          console.error("❌ Lỗi khi CMS unclaim:", err);
          callback({ success: false, error: err.message });
        }
      });

      // Khi CMS gửi tin nhắn
      socket.on("cms_message", (message) => {
        try {
          handleCMSMessage(socket, io, message);
        } catch (err) {
          console.error("❌ Lỗi khi CMS gửi tin nhắn:", err);
        }
      });

      socket.on("setmode", async (object, callback) => {
        try {
          console.log(
            `🔄 CMS ${socket.id} đang thay đổi mode cho client:`,
            object
          );
          //
          await handleChangeMode(socket, object, callback);
        } catch (err) {
          console.error("❌ Lỗi khi thay đổi mode:", err);
          callback({ success: false, error: err.message });
        }
      });
    } catch (err) {
      console.error("❌ Lỗi trong quá trình xử lý kết nối CMS:", err);
      socket.disconnect(true); // Ngắt nếu có lỗi khởi tạo
    }

    socket.on("getConversationMode", async (payload, callback) => {
      try {
        const { tenantId, clientId } = payload;
        await getClientIdConversationMode(tenantId, clientId, callback);
      } catch (err) {
        console.error("❌ Lỗi khi lấy mode của client:", err);
        callback({ success: false, error: err.message });
      }
    });

    socket.on("getEscalatedRequests", async ({tenantId, clientId}, callback) => {
      try {
        const escalatedRequests = await client.getEscalatedRequests(
          tenantId,
          clientId
        );
        callback({ success: true, requests: escalatedRequests });
        console.log(
          `📋 Danh sách yêu cầu đã escalated của client ${clientId} đã được lấy thành công.`
        );
      } catch (err) {
        console.error("❌ Lỗi khi lấy yêu cầu đã escalated:", err);
        callback({ success: false, error: err.message });
      }
    })

    // reply escalated request
    socket.on("replyEscalatedRequest", async ({ tenantId, clientId, requestId, message }, callback) => {
      try{
        await client.removeEscalatedFromClient(tenantId, clientId, requestId);
        await handleCMSMessage(socket, io, message);
        return callback({ success: true, message: "Đã reply yêu cầu escalated thành công." });
      }catch (err) {
        console.error("❌ Lỗi khi reply escalated request:", err);
        return callback({ success: false, error: err.message });
      }
    })
  });
}

module.exports = registerCMSNamespace;
