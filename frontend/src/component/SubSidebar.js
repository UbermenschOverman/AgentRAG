"use client"
import { useSocket } from "@/context/socketContext";
import MemberList from "./MemberList";
import { TeamOutlined } from "@ant-design/icons";
import { useParams } from "next/navigation";
import {message} from "antd";

export default function SubSidebar({ clients,setSelectedClient }) {
  const { socket } = useSocket();
   const { tenantId } = useParams();
   const sessionId = localStorage.getItem("sessionId");
   const [messageApi, contextHolder] = message.useMessage();
  const handleMemberClick = (clientId) => {
    socket.emit("claim", {clientId,tenantId, sessionId}, (response) => {
      if (response.success) {
        console.log(`Claimed client ${clientId}`);
        setSelectedClient(clientId);
        messageApi.success(`Đã nhận khách hàng ${clientId}`);
      } else {
        console.error(`Failed to claim client ${clientId}: ${response.error}`);
        messageApi.error(`Không thể nhận khách hàng ${clientId}: Khách đã được nhận bởi nhân viên khác`);
      }
    });
    
  };

  return (
    <>
      {contextHolder}
    <div className="h-full flex flex-col bg-[#bfdbf7] shadow-inner">
      <div className="flex items-center gap-2 px-4 py-3 ">
        <TeamOutlined className="text-xl text-purple-700" />
        <span className="text-lg font-semibold text-[#022b3a]">Khách đang đợi</span>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 px-2 py-2">
        <MemberList clients={clients} onMemberClick={handleMemberClick} />
      </div>
    </div>
    </>
  );
}
