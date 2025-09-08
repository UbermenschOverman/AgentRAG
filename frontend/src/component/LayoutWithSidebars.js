"use client";
import { useState, useEffect } from "react";
import { Layout } from "antd";
import MainSidebar from "./MainSidebar";
import SubSidebar from "./SubSidebar";
import ChatScreen from "./chat_component/ChatScreen";
import DashBoardView from "./orderDashboard/DashBoardView"; // Thêm dòng này
import { useSocket } from "@/context/socketContext";
const { Header, Content, Sider } = Layout;
import { useParams } from "next/navigation";
import NoticeButton from "./noticeButton"; // Import NoticeButton

export default function LayoutWithSidebars({ children }) {
  const { tenantId } = useParams();
  const { socket } = useSocket();
  const [collapsed, setCollapsed] = useState(false);
  const [showSubSidebar, setShowSubSidebar] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [waitingClients, setWaitingClients] = useState([]);
  const [mainContent, setMainContent] = useState("orders"); // Thêm state này
  const [sessionId, setSessionId] = useState(null);

  useEffect(() => {
    setSessionId(window.localStorage.getItem("sessionId"));
  }, []);

  if (!socket) {
    return (
      <div className="flex items-center justify-center h-full">
        {/* hoặc <Spin /> của antd, hoặc 1 placeholder nào đó */}
        Đang kết nối...
      </div>
    );
  }

  const getWaitingClients = () => {
    console.log("Fetching waiting clients for tenant:", tenantId);
    // Fetch initial clients
    socket.emit("getWaitingClients", tenantId, (response) => {
      if (response.success) {
        setWaitingClients(response.clients || []);
        console.log("Waiting clients:", response.clients);
      } else {
        console.error("Failed to fetch clients:", response.error);
      }
    });
  };

  const handleClientSelection = (clientId) => {
    setSelectedClient(clientId);
    setShowSubSidebar(false);
  };
  const handleMenuSelect = (key) => {
    if (key === "waiting") {
      getWaitingClients();
      setShowSubSidebar((prev) => !prev);
      setCollapsed(true);
      setMainContent("waiting");
    } else if (key === "orders") {
      // uclaim client
      if (selectedClient) {
        socket.emit("unclaim", { sessionId, tenantId }, (response) => {
          if (response.success) {
            console.log("Unclaimed successfully");
          } else {
            console.error("Failed to unclaim:", response.error);
          }
        });
        setSelectedClient(null);
      }
      setCollapsed(false);
      setShowSubSidebar(false);
      setMainContent("orders");
    }
  };

  return (
    <Layout style={{ height: "100vh", overflow: "hidden" }}>
      {/* HEADER */}
      <Header
        style={{
          backgroundColor: "#022b3a",
          color: "white",
          padding: "0 24px",
          height: 56,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div className="flex items-center gap-3">
          <h1 className="text-white text-lg font-bold">CMS</h1>
        </div>
        <NoticeButton />
      </Header>

      {/* MAIN BODY */}
      <Layout style={{ height: "calc(100vh - 56px)" }}>
        {/* SIDEBAR CHÍNH */}
        <Sider
          collapsible
          collapsed={collapsed}
          onCollapse={setCollapsed}
          style={{ backgroundColor: "#1f7a8c" }}
        >
          <MainSidebar onSelect={handleMenuSelect} />
        </Sider>

        {/* SUBSIDEBAR */}
        {showSubSidebar && (
          <Sider
            theme="dark"
            style={{
              flexShrink: 0,
              backgroundColor: "#e1e5f2",
              borderRight: "1px solid #d1d5db",
              minWidth: 180,
              maxWidth: 260,
            }}
          >
            <SubSidebar
              setSelectedClient={handleClientSelection}
              clients={waitingClients}
            />
          </Sider>
        )}

        {/* NỘI DUNG CHÍNH */}
        <Layout style={{ flex: 1, minHeight: 0 }}>
          <Content
            style={{
              padding: 0,
              margin: 0,
              backgroundColor: "#f9fafb",
              display: "flex",
              flexDirection: "column",
              minHeight: 0,
            }}
          >
            {selectedClient ? (
              <div className="flex-1 min-h-0">
                <ChatScreen
                  clientId={selectedClient}
                  setSelectedClient={setSelectedClient}
                />
              </div>
            ) : mainContent === "orders" ? (
              <DashBoardView />
            ) : (
              children
            )}
          </Content>
        </Layout>
      </Layout>
    </Layout>
  );
}
