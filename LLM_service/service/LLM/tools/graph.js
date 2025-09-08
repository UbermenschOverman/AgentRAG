const { z } = require("zod");
const { START, END, StateGraph } = require("@langchain/langgraph");

const InputState = z.object({
  user_input: z.string(),
});

const OutputState = z.object({
  graph_output: z.string(),
});

const OverallState = z.object({
  foo: z.string(),
  bar: z.string(),
  user_input: z.string(),
  graph_output: z.string(),
});

const node1 = async (state) => {
    // Write to OverallStateAnnotation
    const schemaCheck = InputState.safeParse(state);
    if (!schemaCheck.success) {
        console.error("InputState validation failed:", schemaCheck.error.format());
        throw new Error("InputState validation failed");
    }
    return { foo: state.user_input + " name" };
  };

const node2 = async (state) => {
    // Read from OverallStateAnnotation, write to OverallStateAnnotation
    return { bar: state.foo + " is" };
  };

  const node3 = async (state) => {
    // Read from OverallStateAnnotation, write to OutputStateAnnotation
    return { graph_output: state.bar + " Lance" };
  };
  
  const graph = new StateGraph(OverallState)
  .addNode("node1", node1)
  .addNode("node2", node2)
  .addNode("node3", node3)
  .addEdge("__start__", "node1")
  .addEdge("node1", "node2")
  .addEdge("node2", "node3")
  .compile();

  async function getState() {
    const A = await graph.invoke({ user_input: 3 });
  console.log(A); // { foo: 'My name', bar: 'My name is', graph_output: 'My name is Lance' }
  }
  
  getState();
  
// // 1. Định nghĩa Overall State với Zod
// const OverallStateSchema = z.object({
//   tenant_id: z.string(),
//   conversation_id: z.string(),
//   bussiness_detail: z.string().optional(),
//   // dialoge và config vẫn comment out để giữ sự đơn giản
//   dialoge: z
//     .object({
//       // Thử thêm lại dialoge với cấu trúc đơn giản
//       history: z
//         .array(
//           z.object({
//             message: z.string(),
//             role: z.enum(["user", "assistant", "system"]),
//             time: z.string().datetime(), // Sử dụng .datetime() cho chuỗi thời gian ISO
//           })
//         )
//         .optional()
//         .default([]), // Thêm default để đảm bảo history luôn là mảng
//       summary: z.string().optional().default(""), // Thêm default
//     })
//     .optional(), // Để dialoge là optional ban đầu
// });

// console.log("OverallStateSchema defined:", !!OverallStateSchema);
// if (OverallStateSchema && typeof OverallStateSchema.shape === "object") {
//   console.log(
//     "OverallStateSchema.shape keys:",
//     Object.keys(OverallStateSchema.shape)
//   );
// } else {
//   console.error(
//     "OverallStateSchema.shape is not an object or OverallStateSchema is undefined."
//   );
// }

// // 2. Các node mock
// const configNode = async (state) => {
//   console.log(
//     "[configNode] Được gọi với state:",
//     JSON.stringify(state, null, 2)
//   );
//   return {}; // Không thay đổi state
// };

// const chatbotNode = async (state) => {
//   console.log(
//     "[chatbotNode] Được gọi với state:",
//     JSON.stringify(state, null, 2)
//   );
//   // Đảm bảo state.dialoge và state.dialoge.history tồn tại trước khi truy cập
//   const currentHistory = state.dialoge?.history || [];
//   return {
//     dialoge: {
//       ...(state.dialoge || { summary: "", history: [] }), // Đảm bảo dialoge và summary tồn tại
//       history: [
//         ...currentHistory,
//         {
//           message: "Hello from chatbot",
//           role: "assistant",
//           time: new Date().toISOString(),
//         },
//       ],
//     },
//   };
// };

// // 3. Khởi tạo graph
// let graph;
// try {
//   graph = new StateGraph({
//     stateSchema: OverallStateSchema,
//     // Cung cấp input và output một cách tường minh
//     input: OverallStateSchema,
//     output: OverallStateSchema,
//   })
//     .addNode("configNode", configNode)
//     .addNode("chatbotNode", chatbotNode)
//     .addEdge(START, "configNode")
//     .addEdge("configNode", "chatbotNode")
//     .addEdge("chatbotNode", END);

//   graph.compile();
//   console.log("Graph compiled successfully.");
// } catch (e) {
//   console.error("Lỗi khi khởi tạo hoặc compile graph:", e);
//   if (OverallStateSchema) {
//     console.log("Kiểm tra lại OverallStateSchema:", OverallStateSchema);
//     if (OverallStateSchema.shape) {
//       console.log("OverallStateSchema.shape:", OverallStateSchema.shape);
//     } else {
//       console.log("OverallStateSchema không có thuộc tính 'shape'.");
//     }
//   }
//   throw e;
// }

// // 4. Hàm chạy thử
// async function main() {
//   if (!graph) {
//     console.error("Graph chưa được khởi tạo thành công.");
//     return;
//   }
//   console.log("Bắt đầu chạy graph.invoke...");
//   const initialInput = {
//     tenant_id: "VillaChunk",
//     conversation_id: "conv_001",
//     bussiness_detail: "Mikan Village - phong cách Nhật",
//     // Cung cấp giá trị mặc định cho dialoge nếu nó là optional trong schema
//     // và các node của bạn mong đợi nó tồn tại
//     dialoge: {
//       history: [], // Khởi tạo history là mảng rỗng
//       summary: "Initial summary", // Khởi tạo summary
//     },
//   };
//   console.log(
//     "Input ban đầu cho graph.invoke:",
//     JSON.stringify(initialInput, null, 2)
//   );

//   const result = await graph.invoke(initialInput);

//   console.log("\n✅ Kết quả cuối cùng:", JSON.stringify(result, null, 2));
// }

// if (require.main === module) {
//   main().catch((err) =>
//     console.error("Lỗi khi chạy main function:", err.message, err.stack)
//   );
// }

// module.exports = { graph };
