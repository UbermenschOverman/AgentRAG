"use client";
import { useState, useEffect } from "react";
import { useSocket } from "@/context/socketContext";
import {message} from "antd";

export default function MessageInput() {
  const [text, setText] = useState("");
  const { socket, setConversation, conversation, currentConversation, mode } = useSocket();
  const [messageApi, contextHolder] = message.useMessage();
  const [showWarning, setShowWarning] = useState(false); // Thêm state này

  useEffect(() => {
    if (showWarning) {
      messageApi.warning("Vui lòng tắt chế độ tự động trước khi gửi tin nhắn");
      setShowWarning(false);
    }
  }, [showWarning, messageApi]);

  const handleSend = () => {
      if (mode === "auto"){
      setShowWarning(true); // Đặt flag để useEffect xử lý
      setText("");
      return;
    }
    if (!text.trim() || !currentConversation?.clientId) return;
    const message = {
      text,
      time: Date.now(),
      role: "cms",
    };
    socket?.emit("cms_message", { ...message, clientId: currentConversation.clientId });
    setConversation([...(conversation || []), message]);
    setText("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSend();
  };

  return (
    <>
       {contextHolder}
       <div className="w-full bg-white  p-3 flex items-center gap-3">
      <input
        type="text"
        placeholder="Nhập tin nhắn..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
      />
      <button
        onClick={()=>handleSend}
        disabled={!text.trim()}
        className="bg-blue-500 hover:bg-blue-600 text-white font-medium px-4 py-2 rounded-lg disabled:opacity-50 transition"
      >
        Send
      </button>
    </div>
    </>
   
  );
}
