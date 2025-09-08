"use client";
import { useSocket } from "@/context/socketContext";
import { useParams } from "next/navigation";
export default function UnclaimButton({ setSelectedClient }) {
  const {
    socket,
    setOrder,
    setConversation,
    setCurrentConversation,
    setClients,
  } = useSocket();
  const { tenantId } = useParams();
  const handleUnclaim = () => {
    const sessionId = localStorage.getItem("sessionId");

    socket.emit("unclaim", { sessionId, tenantId }, (response) => {
      if (response.success) {
        console.log("Unclaimed successfully");
      } else {
        console.error("Failed to unclaim:", response.error);
      }
    });

    setOrder({});
    setConversation([]);
    setCurrentConversation(null);
    setClients([]);
    setSelectedClient?.(null);
  };

  return (
    <button
      className="bg-red-500 text-white font-medium px-4 py-2 rounded-lg disabled:opacity-50 transition"
      onClick={()=>handleUnclaim}
    >
      Unclaim
    </button>
  );
}
