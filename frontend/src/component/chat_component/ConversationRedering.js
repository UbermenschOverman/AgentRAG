"use client";
import { useSocket } from "@/context/socketContext";
import MessageBubble from "./MessageBubble";

export default function ConversationRendering() {
  const { conversation, currentConversation } = useSocket();

  if (!Array.isArray(conversation) || conversation.length === 0) {
    return (
      <div className="w-full h-full flex flex-col justify-center items-center">
        <div className="text-gray-400 text-center py-4">Chưa có tin nhắn nào</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 px-2 py-2">
      {conversation.map((msg, idx) => (
        <MessageBubble key={msg.time || idx} message={msg} />
      ))}
    </div>
  );
}