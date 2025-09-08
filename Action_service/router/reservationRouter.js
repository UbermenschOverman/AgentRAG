// routes/reservationRoute.js
const express = require("express");
const router = express.Router(); // ✅ sửa ở đây
const reservationPipeline = require("../reservation_handler/pipeline"); // ✅ check tên hàm
const { reActAgent } = require("../reservation_handler/agent/agent");
const client = require("../redis/datastructure/client");
const { orderQueueProducer } = require("../Kafka/orderQueueProducer");
router.post("/", async (req, res) => {
  const { context, intent, tenantId, conversationId, clientId } = req.body;

  if (
    !conversationId ||
    !tenantId ||
    !context ||
    !intent ||
    !clientId ||
    typeof intent !== "string" ||
    typeof context !== "string"
  ) {
    return res.status(400).json({ error: "request không hợp lệ." });
  }

  try {
    // const result = await reservationPipeline(
    //   context,
    //   intent,
    //   tenantId,
    //   conversationId,
    //   clientId
    // );
    const result = await reActAgent(
      context,
      intent,
      tenantId,
      conversationId,
      clientId
    );
    // Chuyển content và meta sang chuỗi JSON nếu chưa phải string
    console.log("➡️ Kết quả từ agent:", result);
    const contentStr =
      typeof result.content === "string"
        ? result.content
        : JSON.stringify(result.content);

    const metaStr =
      typeof result.meta === "string"
        ? result.meta
        : JSON.stringify(result.meta);

    // Gửi lên Kafka
    if (result.orderId !== null && result.orderId !== undefined) {
      await orderQueueProducer(
        tenantId,
        conversationId,
        clientId,
        result.orderId,
        metaStr,
        contentStr
      );
    }

    res.json(result);
  } catch (error) {
    console.error("❌ Lỗi xử lý đặt phòng:", error.message);
    res.status(500).json({ error: "Lỗi server khi xử lý đặt phòng." });
  }
});

router.post("/createOrder", async (req, res) => {
  const { context, intent, tenantId, conversationId, clientId } = req.body;

  if (!tenantId || !conversationId || !clientId) {
    return res.status(400).json({ error: "request không hợp lệ." });
  }

  try {
    // tạo đơn hàng mới
    const orderId = await client.createOrderClient(
      context,
      intent,
      tenantId,
      conversationId,
      clientId
    );
    if (!orderId) {
      return res.status(500).json({ error: "Không thể tạo đơn hàng mới." });
    }
    res.json({ orderId, message: "Đơn hàng đã được tạo thành công." });
  } catch (error) {
    console.error("❌ Lỗi tạo đơn hàng:", error.message);
    res.status(500).json({ error: "Lỗi server khi tạo đơn hàng." });
  }
});

router.post("/updateOrderContent", async (req, res) => {
  const { tenantId, clientId, orderId, updatedContent } = req.body;

  if (!tenantId || !orderId || !updatedContent) {
    return res.status(400).json({ error: "request không hợp lệ." });
  }

  try {
    // Parse nếu là chuỗi JSON
    const parsedContent =
      typeof updatedContent === "string"
        ? JSON.parse(updatedContent)
        : updatedContent;

    const success = await client.updateOrderContentClient(
      tenantId,
      clientId,
      orderId,
      parsedContent
    );

    if (!success) {
      return res
        .status(500)
        .json({ error: "Không thể cập nhật nội dung đơn hàng." });
    }

    res.json({ message: "Nội dung đơn hàng đã được cập nhật thành công." });
  } catch (error) {
    console.error("❌ Lỗi cập nhật nội dung đơn hàng:", error.message);
    res
      .status(500)
      .json({ error: "Lỗi server khi cập nhật nội dung đơn hàng." });
  }
});

router.post("/updateOrderMeta", async (req, res) => {
  const { tenantId, clientId, orderId, updatedMeta } = req.body;

  if (!tenantId || !orderId || !updatedMeta) {
    return res.status(400).json({ error: "request không hợp lệ." });
  }

  try {
    // cập nhật metadata của đơn hàng
    const isSucccess = await client.updateOrderMetaClient(
      tenantId,
      clientId,
      orderId,
      updatedMeta
    );
    if (!isSucccess) {
      return res
        .status(500)
        .json({ error: "Không thể cập nhật metadata đơn hàng." });
    }
    res.json({ message: "Metadata đơn hàng đã được cập nhật thành công." });
  } catch (error) {
    console.error("❌ Lỗi cập nhật metadata đơn hàng:", error.message);
    res
      .status(500)
      .json({ error: "Lỗi server khi cập nhật metadata đơn hàng." });
  }
});

module.exports = router; // ✅ sửa ở đây
