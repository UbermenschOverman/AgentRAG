"use client";
import { useSocket } from "@/context/socketContext";
import { Card, Table, Tag, Tabs } from "antd";
import { useParams } from "next/navigation";
import {useState, useEffect, use} from "react";
// import OrderStatusTable from "./table/OrderStatusTable";
// import CustomerInfoTable from "./table/CustomerInfoTable";
import OrderDetail from "../orderDashboard/orderDetail"; 

// ...existing code...

// export default function OrderRenderer() {
//   const { order } = useSocket();
//   // lấy tenantId từ URL
//   const { tenantId } = useParams() || null;
//   if (!order || (!order.content && !order.meta)) {
//     return (
//       <Card
//         title="Mã đơn: Chưa có"
//         className="mb-2 border-none w-full h-full shadow-lg"
//       >
//         <div className="text-gray-400">Chưa có thông tin đơn hàng</div>
//       </Card>
//     );
//   }

//   const orderId = order.orderId || "Chưa có";

//   let content = {};
//   let meta = {};

//   try {
//     content =
//       typeof order.content === "string"
//         ? JSON.parse(order.content)
//         : order.content || {};
//   } catch (e) {
//     console.error("❌ Failed to parse content:", e);
//   }

//   try {
//     meta =
//       typeof order.meta === "string"
//         ? JSON.parse(order.meta)
//         : order.meta || {};
//   } catch (e) {
//     console.error("❌ Failed to parse meta:", e);
//   }

//   return (
//     <div style={{ fontSize: 13 }}>
//       <CustomerInfoTable content={content} tenantId={tenantId} orderId={orderId} />
//       <OrderStatusTable meta={meta}  />
//     </div>
//   );
// }
// ...existing code...

export default function OrderRenderer({clientId, showOrder}) {
  const {socket}= useSocket();
  const { tenantId } = useParams() || null;
  const [orderIds, setOrderIds] = useState([]); 

  useEffect(() => {
   socket.emit("getClientOrders", {tenantId, clientId}, (response) => {
      if (response.success) {
        console.log("📝 Nhận danh sách đơn hàng:", response.orderIds);
        setOrderIds(response.orderIds || []);
      } else {
        console.error("❌ Lỗi khi lấy danh sách đơn hàng:", response.error);
      }
    });
  }, [socket, tenantId, clientId,showOrder]);   

    if (!orderIds.length) {
    return (
      <div className="text-gray-400 p-4 text-center">
        Chưa có đơn hàng
      </div>
    );
  }

   return (
    <Tabs
      items={orderIds.map((orderId) => ({
        key: orderId,
        label: `Order ${orderId}`,
        children: <OrderDetail orderId={orderId} tenantId={tenantId} showOrder={showOrder}/>, // Nội dung trống cho mỗi tab
      }))}
    />
  );

}
