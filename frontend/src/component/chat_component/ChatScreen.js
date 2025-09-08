"use client";
import ConversationRendering from "./ConversationRedering";
import MessageInput from "./MessageInput";
import OrderRenderer from "./OrderRenderer";
import ModeSelect from "./ModeSelect";
import { useState } from "react";
import { Button, Drawer, Space } from "antd";
import EscalatedQuestion from "./escalatedQuestion";
import UnclaimButton from "./UnclaimButton";

export default function ChatScreen({ setSelectedClient, clientId }) {
  const [showOrder, setShowOrder] = useState(false);
  const [showEscalated, setShowEscalated] = useState(false);
  return (
    <div
      className="relative h-full w-full flex bg-gray-100"
      style={{ minHeight: 400, backgroundColor: "#e1e5f2" }}
    >
      {/* Main conversation area */}
      <div className="flex-1 flex flex-col h-full">
        {/* HEADER: thông tin client + nút mở order */}
        <div className="sticky top-0 z-20 bg-white px-4 py-2 border-b shadow-sm flex items-center justify-between">
          <div className="font-medium text-gray-700">
            🧑‍💼 Client:{" "}
            <span className="font-semibold text-blue-600">
              {/* Giả sử có thể lấy tên hoặc ID từ currentConversation */}
              {clientId || "Chưa chọn khách"}
            </span>
          </div>
          <Space>
            <ModeSelect clientId={clientId} />
            {!showOrder && (
              <button
                className="bg-blue-500 text-white px-3 py-1 rounded shadow hover:bg-blue-600 transition"
                onClick={() => setShowOrder(true)}
              >
                Xem đơn hàng
              </button>
            )}
            <Button
              type="primary"
              onClick={() => setShowEscalated(true)}
              className="bg-blue-500 text-white px-3 py-1 rounded shadow hover:bg-blue-600 transition"
            >
              Cần nhân viên can thiệp
            </Button>
          </Space>
        </div>

        {/* Area chứa tin nhắn có thể scroll */}
        <div className="flex-1 overflow-y-auto px-2 py-2">
          <ConversationRendering />
        </div>

        {/* Phần nhập liệu cố định */}
        <div className="flex items-center px-2 py-2 gap-2 bg-white sticky bottom-0 z-10 shadow-md">
          <div className="flex w-full items-center gap-2">
            <div className="flex-1">
              <MessageInput setSelectedClient={setSelectedClient} />
            </div>
            <UnclaimButton setSelectedClient={setSelectedClient} />
          </div>
        </div>
      </div>

      {/* Order slider */}
      <Drawer
        title="Thông tin đơn hàng"
        placement="right"
        onClose={() => setShowOrder(false)}
        open={showOrder}
      >
        <OrderRenderer clientId={clientId} showOrder={showOrder} />
      </Drawer>
      {/* Escalated questions */}
      <Drawer
        title="Cần can thiệp"
        placement="right"
        onClose={() => setShowEscalated(false)}
        open={showEscalated}
      >
        <EscalatedQuestion clientId={clientId} showEscalated={showEscalated} />
      </Drawer>
    </div>
  );
}
