"use client";
import { createContext, useContext, useRef, useEffect, useState } from "react";
import io from "socket.io-client";

const SocketContext = createContext(null);
import { useParams } from "next/navigation";

export function SocketProvider({ children, namespace }) {
  const socketRef = useRef(null);
  const [socket, setSocket] = useState(null);
  const [clients, setClients] = useState([]);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [conversation, setConversation] = useState([]);
  const [escalatedMap, setEscalatedMap] = useState(new Map());
  const removeEscalatedMap = (clientId) => {
    setEscalatedMap((prev) => {
      const newMap = new Map(prev);
      newMap.delete(clientId);
      return newMap;
    });
  };

  // const [order, setOrder] = useState({});
  const currentConversationRef = useRef(currentConversation);
  const [mode, setMode] = useState("");
  const { tenantId } = useParams();
  useEffect(() => {
    currentConversationRef.current = currentConversation;
  }, [currentConversation]);

  useEffect(() => {
    if (!namespace) return;

    if (!tenantId) {
      console.error(
        "❌ Không tìm thấy tenantId trong URL. Vui lòng kiểm tra lại."
      );
      return;
    }

    const socket = io(namespace, {
      query: { tenantId },
      autoConnect: true,
    });

    setSocket(socket);
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("✅ Connected:", socket.id);
    });

    socket.on("ack", async (response) => {
      if (response.success) {
        const sessionId = localStorage.getItem("sessionId");
        console.log("connected with sessionId:", sessionId);
        socket.emit("register", { sessionId, tenantId }, (res) => {
          if (res.success) {
            console.log("✅ Đăng ký thành công:", res);
            localStorage.setItem("sessionId", res.sessionId);
            console.log("sessionId đã được lưu:", res.sessionId);
            if (res.newSession) {
              console.log(
                "đăng ký thành công, tạo session mới:",
                res.sessionId
              );
            } else {
              console.log(
                "đăng ký thành công, sử dụng session cũ:",
                res.sessionId
              );
            }
          } else {
            console.error("❌ Đăng ký thất bại:", res.error);
          }
        });
      } else {
        console.error("❌ Lỗi từ server:", response.error);
      }
    });

    // Lắng nghe danh sách clients toàn cục
    // socket.on(`${tenantId}_init_waiting_list`, (list) => {
    //   setClients(list);
    // });

    socket.on("client_message", (msgObj) => {
      // console.log(
      //   "client_message nhận được:",
      //   msgObj,
      //   currentConversationRef.current
      // );

      // // Nếu msgObj không có clientId, thêm vào từ currentConversationRef
      // const clientId = currentConversationRef.current?.clientId;
      // if (clientId) {
      //   setConversation((prev) => [...prev, { ...msgObj, clientId }]);
      // }
      setConversation((prev) => [...prev, { ...msgObj }]);
    });

    socket.on("bot_rec_message", (msgObj) => {
      // console.log(
      //   "bot_rec_message nhận được:",
      //   msgObj,
      //   currentConversationRef.current
      // );

      // // Nếu msgObj không có clientId, thêm vào từ currentConversationRef
      // const clientId = currentConversationRef.current?.clientId;
      // if (clientId) {
      //   setConversation((prev) => [...prev, { ...msgObj, clientId }]);
      // }
      setConversation((prev) => [...prev, { ...msgObj }]);
    });

    socket.on("conversation_history", ({ clientId, history }) => {
      console.log("📝 Nhận conversation_history:", clientId, history);
      setCurrentConversation({ clientId, history });
      setConversation(history || []);
    });

    socket.on(
      "new_escalated_mes_created",
      ({ conversationId, clientId, request }) => {
        console.log(
          "📝 Nhận new_escalated_mes_created:",
          conversationId,
          clientId,
          request
        );
        setEscalatedMap((prev) => new Map(prev).set(clientId, request));
      }
    );

    //     socket.on("orderQueue", ({ orderId, content, meta }) => {
    //   try {
    //     const parsedMeta = typeof meta === "string" ? JSON.parse(meta) : meta;
    //     const parsedContent = typeof content === "string" ? JSON.parse(content) : content;

    //     const parsedOrder = {
    //       orderId,
    //       meta: parsedMeta,
    //       content: parsedContent,
    //     };

    //     console.log("📝 Parsed orderQueue:", parsedOrder);
    //     setOrder(parsedOrder);
    //   } catch (err) {
    //     console.error("❌ Failed to parse orderQueue:", err);
    //     setOrder(null); // hoặc [] tùy định dạng bạn cần
    //   }
    // });

    return () => {
      socket.disconnect();
    };
  }, [namespace, tenantId]);
  return (
    <SocketContext.Provider
      value={{
        socket: socket,
        clients,
        setClients,
        // order,
        // setOrder,
        conversation,
        setConversation,
        currentConversation,
        setCurrentConversation,
        mode,
        setMode,
        escalatedMap,
        removeEscalatedMap
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
