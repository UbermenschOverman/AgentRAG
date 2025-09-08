"use client";
import { useState } from "react";
import { useSocket } from "@/context/socketContext";
import { message as antdMessage } from "antd";

export default function ReplyEscalated({ TriggerReload, requestId, tenantId, clientId }) {
  const [text, setText] = useState("");
  const { socket, setConversation, conversation, currentConversation } = useSocket();
  const [messageApi, contextHolder] = antdMessage.useMessage();

  const handleSend = () => {
    if (!text.trim() || !currentConversation?.clientId) return;

    const msg = {
      text,
      time: Date.now(),
      role: "cms",
    };

    socket?.emit(
      "replyEscalatedRequest",
      { tenantId, clientId, requestId, message: msg },
      async (response) => {
        if (response.success) {
          messageApi.success("Tin nhắn đã được gửi thành công");
          await TriggerReload();
        } else {
          messageApi.error("Gửi tin nhắn thất bại: " + response.error);
        }
      }
    );

    setConversation([...(conversation || []), msg]);
    setText("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSend();
  };

  return (
    <>
      {contextHolder}
      <div className="w-full bg-white p-3 flex items-center gap-3">
        <input
          type="text"
          placeholder="Nhập tin nhắn..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
        />
        <button
          onClick={handleSend}
          disabled={!text.trim()}
          className="bg-blue-500 hover:bg-blue-600 text-white font-medium px-4 py-2 rounded-lg disabled:opacity-50 transition"
        >
          Send
        </button>
      </div>
    </>
  );
}
