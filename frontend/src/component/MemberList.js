"use client";
import { List, Avatar } from "antd";
import { UserOutlined } from "@ant-design/icons";

export default function MemberList({ clients = [], onMemberClick }) {
  const filteredClients = clients.filter(Boolean);

  if (filteredClients.length === 0) {
    return (
      <div className="text-gray-400 text-center py-4">Không có khách nào</div>
    );
  }

  return (
    <List
      itemLayout="horizontal"
      dataSource={filteredClients}
      split={false}
      style={{ maxHeight: "100%", overflowY: "auto" }}
      renderItem={(client) => {
        const key =
          typeof client === "object"
            ? client.id || JSON.stringify(client)
            : client;

        const name =
          typeof client === "object"
            ? client.name || client.id || "Không rõ"
            : client;

        return (
          <List.Item
            key={key}
            className="hover:bg-blue-100 rounded-lg cursor-pointer transition"
            onClick={() => onMemberClick?.(client)}
            style={{
              padding: "8px 12px",
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <Avatar
              icon={<UserOutlined />}
              style={{ backgroundColor: "#4f46e5", flexShrink: 0 }}
            />
            <span
              className="text-sm font-medium text-gray-800 break-words"
              style={{ wordBreak: "break-word", flex: 1 }}
            >
              {name}
            </span>
          </List.Item>
        );
      }}
    />
  );
}
