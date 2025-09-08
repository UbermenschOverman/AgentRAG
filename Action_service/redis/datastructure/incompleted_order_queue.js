const redis = require("../redisClient");
const getSchema = require("../../mogo_service/getSchema"); // Đảm bảo đã có hàm getSchema
const {v4: uuidv4} = require("uuid");

// hàm tạo key
const orderKey = (tenantId,clientId) => {
  return `incompleted_order_queue:${tenantId}:${clientId}`;
}

async function ensureOrder(tenantId, conversationId, clientId) {
  try {
    // Kiểm tra xem order đã có trong Redis chưa
    const key = orderKey(tenantId, clientId);
    const order = await redis.get(key);

    if (order) {
      // Nếu đã có order, parse chuỗi JSON nếu cần thiết
      let parsedOrder;
      try {
        parsedOrder = JSON.parse(order);
        console.log(
          `Order đã tồn tại cho clientId ${clientId}:`,
          parsedOrder
        );
      } catch (error) {
        console.error("Không thể parse order từ Redis:", error);
        return null; // Hoặc xử lý theo cách khác
      }

      return parsedOrder;
    } else {
      // Nếu chưa có order, gọi API để lấy schema của tenant
      const schema = await getSchema(tenantId);
      const orderId = uuidv4(); // Tạo orderId mới
      if (schema && Array.isArray(schema)) {
        // Tạo mảng schemaFields từ schema (mảng các trường)
        const schemaFields = schema.map((field) => ({
          name: field.name,
          value: null,
          required: field.required,
        }));

        schemaFields.push({orderId: orderId}); // Thêm orderId vào mảng schemaFields
        // Lưu mảng schemaFields vào Redis
        await redis.set(
          `incompleted_order_queue:${conversationID}`,
          JSON.stringify(schemaFields)
        );

        console.log(
          `Order mới đã được tạo cho conversationID ${conversationID}`
        );
        return schemaFields; // Trả về mảng schemaFields
      } else {
        console.error("Không thể lấy schema hợp lệ cho tenant:", tenantId);
        return false; // Không lấy được schema hợp lệ
      }
    }
  } catch (err) {
    console.error("Lỗi trong hàm ensureOrder:", err.message);
    return false;
  }
}

async function replaceOrder(conversationID, tenantId, newForm) {
  try {
    // Kiểm tra xem orderData có dữ liệu hợp lệ không
    const data = JSON.stringify(newForm);
    console.log("replaceOrder: ", data);
    // Lưu lại orderData đã được thay thế vào Redis
    await redis.set(`incompleted_order_queue:${conversationID}`, data); // TTL 1 ngày có thể được thêm vào nếu cần thiết

    console.log(
      `Nội dung của order đã được thay thế cho conversationID ${conversationID}`
    );

    // Trả về dữ liệu orderForm đã được thay thế
    return { data };
  } catch (err) {
    console.error("Lỗi trong hàm replaceOrder:", err.message);
    return false;
  }
}

async function getOrder(conversationID) {
  try {
    // Lấy dữ liệu từ Redis
    const orderData = await redis.get(
      `incompleted_order_queue:${conversationID}`
    );

    if (orderData) {
      // Nếu có dữ liệu, parse và trả về
      return JSON.parse(orderData);
    } else {
      // Nếu không có dữ liệu, trả về thông báo lỗi hoặc giá trị mặc định
      return { message: "Order data not found for this conversation" };
    }
  } catch (err) {
    console.error("Lỗi trong hàm getOrder:", err.message);
    return { message: "Server error" };
  }
}

module.exports = { ensureOrder, replaceOrder, getOrder };
