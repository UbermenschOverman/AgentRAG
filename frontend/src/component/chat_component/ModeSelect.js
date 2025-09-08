"use client";

import React, { useState, useEffect } from "react";
import { Select, message } from "antd";
import { useSocket } from "../../context/socketContext";
import { useParams } from "next/navigation";

const { Option } = Select;

export default function ModeSwitch({ clientId }) {
  const { socket, mode, setMode } = useSocket();
  const { tenantId } = useParams(); // Lấy tenantId từ URL
  const [messageApi, contextHolder] = message.useMessage();

  // 1) Fetch initial mode
  useEffect(() => {
    if (!clientId || !socket || !tenantId) return;

    socket.emit(
      "getConversationMode",
      { clientId, tenantId },
      (response) => {
        if (response.success) {
          setMode(response.mode || "auto");
        } else {
          messageApi.error("Không thể lấy chế độ: " + response.error);
        }
      }
    );
  }, [clientId, socket, tenantId, messageApi, setMode]);

  // 2) Handler khi user chọn mode từ Select
  const handleChange = (value) => {
    socket.emit(
      "setmode",
      { clientId, tenantId, mode: value },
      (response) => {
        if (response.success) {
          setMode(value);
          messageApi.success(`Chuyển sang chế độ ${value}`);
        } else {
          messageApi.error("Cập nhật thất bại: " + response.error);
        }
      }
    );
  };

  return (
    <>
      {contextHolder}
      <Select
        value={mode}
        onChange={handleChange}
        style={{ width: 120 }}
      >
        <Option value="auto">Tự động</Option>
        <Option value="manual">Bán tự động</Option>
        <Option value ="offChatbot"> Thủ công</Option>
      </Select>
    </>
  );
}
