const redis = require("../redisClient");
const {createOrderLLM} = require("../../reservation_handler/createOrder"); // Đảm bảo đã có hàm createOrderLLM
const {v4: uuidv4} = require("uuid");
const {connectDB} = require("../../mogo_service/mogodb");

// hàm tạo key
const orderContentKey = (tenantId, orderId) => {
  return `order:${tenantId}:${orderId}`;
}
const orderMetaKey = (tenantId, orderId) => {
  return `order_meta:${tenantId}:${orderId}`;
}
// order là 1 object có dạng: {object}

async function checkOrder(tenantId, orderId) {
    try {
        // Kiểm tra xem order đã có trong Redis chưa
        const key = orderKey(tenantId, orderId);
        const order = await redis.hGetAll(key);
        if(order) {
            // Nếu đã có order, trả về đối tượng order
            console.log(`Order đã tồn tại cho orderId ${orderId}:`, order);
            return true;
        }
       return false;
    }
    catch (err) {
        console.error("Lỗi trong hàm ensureOrder:", err.message);
        return false; // Trả về false nếu có lỗi
    }
}

async function createOrder(context, intent, tenantId, conversationId, clientId){
    try{
        const db = await connectDB();
        const ordersCollection = db.collection("orders");

        const newOrder = await createOrderLLM(tenantId, context, intent);
        const {content,nullFields, ...orderMeta } = newOrder; // Tách content và rest
        const orderId = uuidv4(); // Tạo orderId mới
        // const orderKey = orderContentKey(tenantId, orderId);
        // const metaKey = orderMetaKey(tenantId, orderId);
        // // Lưu orderMeta vào Redis
        // await redis.hSet(metaKey, orderMeta);
        // // Lưu order vào Redis
        // await redis.hSet(orderKey, content);
        // lưu order vào MongoDB
        await ordersCollection.insertOne({
            tenantId,
            orderId,
            conversationId,
            clientId,
            content,
            meta: orderMeta,
        });
        return {orderId, orderMeta, content, nullFields}; // Trả về orderId, orderMeta và content
    }catch (err) {
        console.error("Lỗi trong hàm createOrder:", err.message);
        throw err;
    }
}

// const updateOrderContent = async (tenantId, orderId, updatedContent = {}) => {
//   try {
//     const db = await connectDB();
//     const ordersCollection = db.collection("orders");

//     // Lấy content từ Redis
//     const orderKey = orderContentKey(tenantId, orderId);
//     const orderContent = await redis.hGetAll(orderKey);
//     if (!orderContent || Object.keys(orderContent).length === 0) {
//       throw new Error(`Không tìm thấy nội dung đơn hàng với orderId: ${orderId}`);
//     }

//     // Lấy meta từ Redis
//     const metaKey = orderMetaKey(tenantId, orderId);
//     const orderMeta = await redis.hGetAll(metaKey);
//     if (!orderMeta || Object.keys(orderMeta).length === 0) {
//       throw new Error(`Không tìm thấy metadata cho đơn hàng với orderId: ${orderId}`);
//     }

//     // Kiểm tra trạng thái không cho phép chỉnh sửa
//     const { isStaffConfirmed, state } = orderMeta;
//     if (isStaffConfirmed === "true" || state === "archived") {
//       throw new Error(`Đơn hàng với orderId: ${orderId} đã được xác nhận hoặc đã lưu trữ. Không thể cập nhật nội dung.`);
//     }

//     // Cập nhật vào Redis
//     await redis.hSet(orderKey, updatedContent);
//     const updatedAt = new Date().toISOString();
//     await redis.hSet(metaKey, "updatedAt", updatedAt);

//     // Chuyển content sang dạng dot notation để cập nhật từng trường
//     const contentUpdates = {};
//     for (const [key, value] of Object.entries(updatedContent)) {
//       contentUpdates[`content.${key}`] = value;
//     }

//     // Cập nhật MongoDB
//     await ordersCollection.updateOne(
//       { tenantId, orderId },
//       { $set: contentUpdates }
//     );

//     return true;
//   } catch (err) {
//     console.error("Lỗi trong hàm updateOrderContent:", err.message);
//     throw err;
//   }
// };


const updateOrderMeta = async (tenantId, orderId, updatedMeta = {}) => {
  try {
    const db = await connectDB();
    const ordersCollection = db.collection("orders");

    // Chuyển updatedMeta thành dạng dot notation: { "meta.key": value }
    const metaUpdates = {};
    for (const [key, value] of Object.entries(updatedMeta)) {
      metaUpdates[`meta.${key}`] = value;
      metaUpdates[`meta.updatedAt`] = new Date(); // Cập nhật updatedAt
    }

    // Cập nhật từng trường trong meta
    await ordersCollection.updateOne(
      { tenantId, orderId },
      { $set: metaUpdates }
    );

    return true;
  } catch (err) {
    console.error("Lỗi trong hàm updateOrderMeta:", err.message);
    return false;
  }
};



module.exports = {
    checkOrder,
    createOrder,
    updateOrderMeta,
    // updateOrderContent
};