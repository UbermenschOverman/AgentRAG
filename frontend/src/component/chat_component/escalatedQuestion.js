import { Card, List, Empty, Tag } from "antd";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useSocket } from "@/context/socketContext";
import ReplyEscalated from "./ReplyEscalated";

function EscalatedQuestion({ clientId, showEscalated }) {
  const [messages, setMessages] = useState([]);
  const { socket } = useSocket();
  const { tenantId } = useParams();
  const [reload, setReload] = useState(false);
  const TriggerReload = () => {
    setReload((prev) => !prev);
    }

  useEffect(() => {
    socket.emit("getEscalatedRequests", { tenantId, clientId }, (response) => {
      if (response.success) {
        setMessages(response.requests || []);
        console.log("✅ Escalated requests:", response.requests);
      } else {
        console.error("❌ Failed to fetch escalated requests:", response.error);
      }
    });
  }, [tenantId, clientId, socket, showEscalated, reload]);

  return (
    <Card
      style={{ marginTop: 0, overflowY: "auto", height: "100%" }}
    >
      {messages.length === 0 ? (
        <Empty description="Không có câu hỏi escalated nào" />
      ) : (
       <List
  dataSource={messages}
  renderItem={(msg, index) => (
    <List.Item key={index}>
      <List.Item.Meta
        title={
             <p style={{ marginBottom: 8 }}>{msg.input}</p>
        }
        description={
          <>
            <div style={{ marginBottom: 8 }}>
              <Tag color={msg.tag === 'khiếu nại' ? 'red' : 'blue'}>
                {msg.tag || 'hỏi đáp'}
              </Tag>
            </div>
            <ReplyEscalated TriggerReload={TriggerReload} requestId ={msg.requestId} tenantId ={tenantId} clientId={clientId}/>
          </>
        }
      />
    </List.Item>
  )}
/>

      )}
    </Card>
  );
}

export default EscalatedQuestion;
