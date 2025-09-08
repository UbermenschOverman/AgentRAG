const { retrieval } = require("./queryEmbedder"); // Gọi đến hàm truy xuất context
const { answering } = require("./answerGen"); // Gọi đến hàm sinh câu trả lời
const { rewriteQuery } = require("./rewriteQuery"); // Gọi đến hàm rewriteQuery
// const {queryAgent} = require("./query_agent/agent"); // Gọi đến hàm queryAgent
async function queryPipeline(bussiness_detail, userQuestion, tenant_Id) {
  try {
    console.log("🧠 Truy vấn người dùng:", userQuestion);

    // console.log("🔄 Đang chỉnh sửa câu hỏi...");
    // const rewrittenQuery = await rewriteQuery(bussiness_detail, userQuestion);
    // console.log("✍️ Câu hỏi đã chỉnh sửa:", rewrittenQuery);

    // Bước 1: Trích xuất context từ Weaviate
    const context = await retrieval(
      tenant_Id,
      userQuestion,
       0.7
    );

    // Kiểm tra nếu không tìm thấy context
    if (!context) {
      console.log("❌ Không tìm thấy context phù hợp.");
      return { answer: "Không tìm thấy thông tin.", isValid: false };
    }

    // Bước 2: Gửi context và câu hỏi vào LLM
    var { answer, isValid } = await answering(
      tenant_Id,
      bussiness_detail,
      context,
      userQuestion
    );

    if(!isValid){
      const newQuery = await rewriteQuery(
        bussiness_detail,
        userQuestion,
        context,
        answer
      );
      console.log("✍️ Câu hỏi đã chỉnh sửa:", newQuery);
      isValid = !newQuery.toUpperCase().includes("TÔI KHÔNG BIẾT");
      if(!isValid){
        console.log("❌ Câu hỏi không hợp lệ sau khi chỉnh sửa.");
        return { answer: "TÔI KHÔNG BIẾT, TÔI SẼ LIÊN HỆ NHÂN VIÊN CON NGƯỜI GIẢI ĐÁP CHO BẠN TRONG THỜI GIAN SỚM NHẤT", isValid: false };
      }
      else {
        const newContext = await retrieval(
          tenant_Id,
          newQuery,
          0.3
        );
        // Nếu câu hỏi hợp lệ, gọi lại hàm answering với câu hỏi mới
        ({ answer, isValid } = await answering(
          tenant_Id,
          bussiness_detail,
          newContext,
          userQuestion
        ));
      }
    }

    // Bước 3: Xử lý kết quả
    console.log("\n🎯 Kết quả cuối cùng:");
    if (isValid) {
      console.log("✅ Trả lời hợp lệ:", answer);
    } else {
      console.log("❌ Không tìm thấy thông tin phù hợp.");
    }

    return { answer, isValid };
  } 
  
  // try{
  //   const res = await queryAgent(bussiness_detail, userQuestion, tenant_Id);
  //   console.log("➡️ Kết quả từ agent:", res);
  //   return res;
  // }
  catch (err) {
    console.error("❌ Lỗi trong pipeline:", err.message);
    return { answer: "", isValid: false };
  }
}

// // Ví dụ chạy thử
// const readline = require("readline");
// const rl = readline.createInterface({
//   input: process.stdin,
//   output: process.stdout,
// });

// rl.question("💬 Nhập câu hỏi: ", async (input) => {
//   if (!input || input.trim() === "") {
//     console.log("❌ Câu hỏi không hợp lệ. Vui lòng thử lại.");
//   } else {
//     await queryPipeline(input);
//   }
//   rl.close();
// });

module.exports = { queryPipeline };
