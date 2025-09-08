const { connectDB } = require("../../mogo_service/mogodb");
const {
  createOrder,
  updateOrderMeta,
//   updateOrderContent,
} = require("./pending_order");

let clientsCollection;
let orderCollection;

(async () => {
  const db = await connectDB(); // 🔴 PHẢI dùng await
  clientsCollection = db.collection("clients");
  orderCollection = db.collection("orders");
})();

// ============================
// Hàm tạo đơn hàng mới cho client
// ============================
async function createOrderClient(
  context,
  intent,
  tenantId,
  conversationId,
  clientId
) {
  try {
    const client = await clientsCollection.findOne({ tenantId, clientId });
    if (!client) {
      console.error(
        `❌ Không tìm thấy client với tenantId=${tenantId} và clientId=${clientId}`
      );
      return false;
    }

    const { orderId, orderMeta, content, nullFields } = await createOrder(
      context,
      intent,
      tenantId,
      conversationId,
      clientId
    );
    if (!orderId) {
      console.error("❌ Không thể tạo đơn hàng mới.");
      return false;
    }

    await clientsCollection.updateOne(
      { tenantId, clientId },
      { $push: { orders: orderId } }
    );

    console.log(
      `✅ Tạo đơn hàng mới thành công: clientId=${clientId}, orderId=${orderId}`
    );
    return { orderId, orderMeta, content, nullFields };
  } catch (err) {
    console.error("❌ Lỗi trong createOrderClient:", err.message);
    throw err;
  }
}

// ============================
// Hàm cập nhật content đơn hàng
// ============================
async function updateOrderContentClient(
  tenantId,
  orderId,
  updatedContent = {}
) {
  try {
    if (typeof updatedContent === "string") {
      updatedContent = JSON.parse(updatedContent);
    }
     const contentUpdates = {};
    for (const [key, value] of Object.entries(updatedContent)) {
      contentUpdates[`content.${key}`] = value;
      contentUpdates[`meta.updatedAt`] = new Date(); // Cập nhật updatedAt
    }

    await orderCollection.updateOne(
      { tenantId, orderId },
      { $set: contentUpdates }
    );

    console.log(`✅ Nội dung đơn hàng ${orderId} đã được cập nhật. `);
    return true;
  } catch (err) {
    console.error("❌ Lỗi trong updateOrderContentClient:", err.message);
    throw err;
  }
}

// ============================
// Hàm cập nhật metadata đơn hàng
// ============================
async function updateOrderMetaClient(
  tenantId,
  clientId,
  orderId,
  updatedMeta = {}
) {
  try {
    const success = await updateOrderMeta(tenantId, orderId, updatedMeta);
    if (!success) {
      console.error(`❌ Không thể cập nhật metadata cho orderId=${orderId}`);
      return false;
    }

    console.log(`✅ Metadata đơn hàng ${orderId} đã được cập nhật.`);
    return true;
  } catch (err) {
    console.error("❌ Lỗi trong updateOrderMetaClient:", err.message);
    throw err;
  }
}

module.exports = {
  createOrderClient,
  updateOrderContentClient,
  updateOrderMetaClient,
};
