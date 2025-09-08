"use client";
import React, { useState } from "react";
import { NotificationTwoTone, CloseCircleOutlined } from "@ant-design/icons";
import { Button, FloatButton, Popover, Tag } from "antd";

import { useSocket } from "../context/socketContext";

const statusColorMap = {
  'hỏi đáp': 'blue',
  'khiếu nại': 'red',
};

function NoticeButton() {
  const { escalatedMap, removeEscalatedMap } = useSocket();
  const [open, setOpen] = useState(false);
  const hide = () => {
    setOpen(false);
  };
  const handleOpenChange = (newOpen) => {
    setOpen(newOpen);
  };
  return (
    <Popover
      content={
        Array.from(escalatedMap.entries()).length === 0 ? (
          <div>Không có thông báo</div>
        ) : (
          Array.from(escalatedMap.entries()).map(([clientId, request]) => (
            <div
              key={clientId}
              style={{
                marginBottom: 5,
                border: "1px solid #eee",
                padding: 10,
                borderRadius: 4,
                boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                position: "relative", // cần thiết để định vị icon
              }}
            >
              <CloseCircleOutlined
                style={{
                  color: "red",
                  position: "absolute",
                  top: 4,
                  right: 4,
                  fontSize: 16,
                  cursor: "pointer",
                  padding: 4,
                }}
                onClick={() => removeEscalatedMap(clientId)}
              />
              <div style={{ paddingRight: 24, marginBottom: 8 }}>
                <b>Khách:</b> {clientId} <br />
                <b>Nhắn:</b> {request.input} <br />
              </div>
               <Tag
                  color={statusColorMap[request.tag] || "blue"}
                  >
                  {request.tag||'hỏi đáp'}
                </Tag>
            </div>
          ))
        )
      }
      trigger="click"
      open={open}
      onOpenChange={handleOpenChange}
      styles={{
        root: {
          maxHeight: 200,
          overflow: "auto",
          zIndex: 9999,
        },
      }}
    >
      <FloatButton
        icon={
          <NotificationTwoTone
            twoToneColor="#eb2f96"
            style={{ transform: "scaleX(-1)" }}
          />
        }
        style={{ right: 24, top: 24, justifyContent: "flex-start" }}
        badge={{ count: escalatedMap.size, color: "red", offset: [-30, -0] }}
        onClick={() => {
          if (escalatedMap.size > 0) {
            console.log("Thông báo có:", escalatedMap);
          } else {
            console.log("Không có thông báo mới");
          }
        }}
      />
    </Popover>
  );
}

export default NoticeButton;
