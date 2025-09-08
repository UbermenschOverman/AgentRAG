// // consumers/LLM_mesConsumer.js
// // const { runConsumer } = require("./consumer");
// const cms = require("../redis/data_structure/claimed_Client.js");
// const client = require("../redis/data_structure/tenant_Client.js");
// const { runKeyConsumer } = require("./consumer");
// // const orders = require("../redis/data_structure/order.js");
// // module.exports = { orderQueueConsumer };

// async function orderQueueConsumer(io) {
//     const groupId = "ws-orderQueue-group-" + Date.now();// GroupId cho consumer
//     const topic = "orderQueue";
//     const topic_key = "orderQueue_key";
//     const topic_value = "orderQueue_value";
  
//     // Callback để xử lý message
//     const call_back = async (key, value) => {
//       try {
//         const { tenantId, conversationId, clientId } = key;
//         await client.addOrderIdToClient(tenantId, clientId, value.orderId);
//         await cms.botToCmsOrder(io, tenantId, conversationId, value);
//       } catch (err) {
//         console.error("❌ Error in callback processing message:", err);
//       }
//     };
  
//     // Chạy Kafka consumer
//     await runKeyConsumer(topic, topic_key, topic_value, groupId, call_back);
//   }
  
// module.exports = { orderQueueConsumer };

// consumers/LLM_mesConsumer.js
const cms = require("../redis/data_structure/claimed_Client.js");
const client = require("../redis/data_structure/tenant_Client.js");
const { runKeyConsumer } = require("./consumer"); // Vẫn sử dụng runKeyConsumer

async function orderQueueConsumer(io) {
  // GroupId cho consumer. Date.now() giúp tạo groupId duy nhất mỗi lần khởi động,
  // phù hợp cho môi trường dev/test nhưng trong production nên dùng groupId cố định
  // để đảm bảo quản lý offset đúng cách.
  const groupId = "ws-orderQueue-group-" + Date.now();
  const topic = "orderQueue";

  // Callback để xử lý message
  // runKeyConsumer sẽ truyền key và value đã được giải mã vào đây
  const call_back = async (key, value) => {
    try {
      // key và value đã được giải mã tự động bởi runKeyConsumer (consumer.js)
      // mà không cần truyền schemaId cụ thể
      const { tenantId, conversationId, clientId } = key;
      await client.addOrderIdToClient(tenantId, clientId, value.orderId);
      await cms.botToCmsOrder(io, tenantId, conversationId, value);
    } catch (err) {
      console.error("❌ Error in callback processing message:", err);
    }
  };

  // Chạy Kafka consumer
  // Không cần truyền topic_key và topic_value nữa.
  // runKeyConsumer trong consumer.js đã được điều chỉnh để độc lập schemaId.
  await runKeyConsumer(topic, groupId, call_back);
}

module.exports = { orderQueueConsumer };