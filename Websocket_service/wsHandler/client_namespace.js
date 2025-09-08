const {
  handleClientConnection,
  handleClientMessage,
  handleClientDisconnect,
} = require("./client");
const crypto = require("crypto");
const { checkTenantExists } = require("../tenent_service/tenantService.js");
const client = require("../redis/data_structure/tenant_Client.js");
const conversations = require("../redis/data_structure/conversation_Store.js");
function registerClientNamespace(io) {
  const clientNamespace = io.of("/client");

  clientNamespace.on("connection", async (socket) => {
    try {
      const tenantId = socket.handshake.query.tenantId;

      if (!tenantId || !(await checkTenantExists(tenantId))) {
        console.log(
          `❌ Kết nối bị từ chối. TenantId không hợp lệ: ${(
            socket.query
          )}`
        );
        console.log(tenantId);
        socket.disconnect(true);
        console.log(
          `❌ Kết nối bị từ chối. TenantId không hợp lệ: ${tenantId}`
        );
        return;
      }
      socket.tenantId = tenantId; // Gắn tenantId vào socket để dùng sau
      socket.emit("ack", {
        message: `Kết nối thành công với tenant ${tenantId}`,
      });
      socket.on("dangky", async (payload, callback) => {
        console.log(
          `📝 Đăng ký client từ tenant ${tenantId} với payload:`,
          payload
        );
        try {
          const { clientId, tenantId: oldTenantId } = payload;
          if (
            clientId &&
            oldTenantId == tenantId &&
            (await client.hasClient( oldTenantId, clientId))
          ) {
            // nếu đã có clientId thì
            // Reconnect với session cũ
            socket.data.clientId = clientId;
            return callback({
              success: true,
              message: "Đã kết nối lại với session cũ.",
              clientId,
              tenantId,
              newSession: false,
            });
          } else {
            // New session
            const newClientId = crypto.randomUUID();
            socket.data.clientId = newClientId;
            return callback({
              success: true,
              message: "đã tạo session mới",
              clientId: newClientId,
              tenantId,
              newSession: true,
            });
          }
        } catch (err) {
          console.error("❌ Lỗi khi đăng ký client:", err);
          return callback({ success: false, message: "Đăng ký không thành công", error: err.message });
        }
      });

      // sự kiện setup khi đã có clientId
      socket.on("setup", async ({ clientId, tenantId }, callback) => {
        try{
          console.log(`👤 Client từ tenant ${tenantId} đang setup: ${clientId}`);
        socket.data.clientId = clientId;
        socket.tenantId = tenantId; // Gắn lại tenantId vào socket
        // Sự kiện khi client kết nối
        await handleClientConnection(socket, io);
        // hàm này sẽ:
        /**
         *
         * Khởi tạo hàng đợi tin nhắn cho client/ không tạo mới nếu đã có
         * tạo mới conversation cho client/ không tạo mới nếu đã có
         * Thêm client vào waiting pool
         * Gửi thông báo đến tất cả CMS rằng có client mới chờ
         */
        return callback({ success: true, message: "Client đã được thiết lập" });
        } catch (err) {
          console.error("❌ Lỗi khi thiết lập client:", err);
          return callback({ success: false, message: "Thiết lập không thành công", error: err.message });
        }
        });

      // Lắng nghe tin nhắn từ client
      socket.on("client_message", ({message, clientId,tenantId}) => {
        try {
          handleClientMessage(socket, io, message, clientId, tenantId);
          // hàm này sẽ:
          /**
           * xử lý theo mode
           * Nếu mode = manual và chưa được claim thì đẩy vào queue và return
           * Néu mode = manual và đã được claim thì tạo summary
           * Nếu mode = auto hoặc mode = manual và đã được claim thì
           *  add tin nhắn mới này vào hội thoại
           *  đẩy tin nhắn vào topic LLM_mes
           *  Tìm CMS đang phụ trách client này
           *  gửi tin nhắn đến CMS
           */
        } catch (err) {
          console.error("❌ Lỗi khi xử lý client_message:", err);
        }
      });
      // lắng nghe sự kiện lấy history từ client
      socket.on("get_history", async({clientId, tenantId}, callback)=>{
        try{
          // tìm conversationId từ clientId và tenantId
          const {conversationId} = await client.getClientData(tenantId, clientId);
          if (conversationId==""){
            throw new Error("Không tìm thấy conversationId cho client này");
          }
          // lấy lịch sử hội thoại từ conversationId
          const history = await conversations.getMessages(tenantId, conversationId);
          // trả về lịch sử hội thoại cho client
          return callback({ success: true,message:"Lấy lịch sử thành công", history: history });
        }catch (err) {
          console.error("❌ Lỗi khi lấy lịch sử hội thoại:", err);
          return callback({ success: false, message: "Lấy lịch sử không thành công", error: err.message });
        }
      })
      // Lắng nghe khi client ngắt kết nối
      socket.on("disconnect", (reason) => {
        console.log(
          `🔌 [${tenantId}] Client ${socket.data.clientId} đã ngắt kết nối: ${reason}`
        );
        try {
          handleClientDisconnect(socket, io);
        } catch (err) {
          console.error("❌ Lỗi khi xử lý disconnect từ client:", err);
        }
      });
    } catch (err) {
      console.error("❌ Lỗi trong quá trình xử lý kết nối client:", err);
      socket.disconnect(true); // Ngắt kết nối nếu có lỗi bất đồng bộ
    }
  });
}

module.exports = registerClientNamespace;
