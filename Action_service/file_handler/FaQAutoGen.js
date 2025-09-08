const { GoogleGenAI, Type } = require("@google/genai");
const fs = require("fs");
const path = require("path");

require("dotenv").config();

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

async function generateFAQ(tenantId, documentName, description, tags, context) {
  try {
    // kiểm tra đầu vào
    if (!tenantId || !documentName || !description || !tags || !context) {
      throw new Error(
        "Thiếu thông tin đầu vào: tenantId, documentName, description, tags hoặc context."
      );
    }
    const tenantDir = path.join(process.cwd(), "Data", tenantId);
    const saveDir = path.join(tenantDir, documentName);
    const txtPath = path.join(saveDir, "preprocessed.txt");
    const fileData = fs.readFileSync(txtPath, "utf8");
    const contents = [
      {
        text: `
        Bạn là một chuyên gia nội dung ảo của doanh nghiệp  ${context}. 
        Bạn sẽ được cung cấp một văn bản chứa nội dung, được thể hiện các mức logic thông qua markdown.
        Nhiệm vụ của bạn là đọc kỹ đoạn văn này và tạo ra N câu hỏi FAQ và cung cấp câu trả lời tương ứng, với N nằm trong khoảng 5–20 tuỳ theo độ dài và độ phức tạp của văn bản.

        Biết có 2 độ đo là độ khái quát và độ rộng của câu hỏi. 
        Trong đó độ khái quát của 1 câu hỏi được đo bằng số lượng chunk cần biết để trả lời câu hỏi đó.
        Độ rộng của một câu hỏi là số lượng nhu cầu thông tin chứa trong câu hỏi đó. ví dụ "Hỏi về A và cho biết về B" có độ rộng là 2.

        Yêu cầu về câu hỏi:
        - Chọn N sao cho đủ để bao quát cả các ý chính lẫn các khái niệm mang tính tổng quát/multi-hop giữa các chunk.
        - Ưu tiên các câu hỏi yêu cầu nhóm văn bản, tóm tắt các chủ để lớn (xác định dựa trên markdown).
        - Mỗi câu hỏi rõ ràng, ngắn gọn, không trùng lặp, và có độ phức tạp là 1, có độ khái quát luôn lớn hơn 3. (nói cách khác là mỗi câu hỏi chỉ hỏi 1 vấn đề nhưng cần biết ít nhất 3 chunk để trả lời).
        - Các câu hỏi được sắp xếp theo độ khái quát giảm dần.

        Yêu cầu về câu trả lời:
        - Câu trả lời phải ngắn gọn, súc tích, và trực tiếp trả lời câu hỏi, có độ dài 100 chữ trở xuống.
        - Câu trả lời phải dựa trên nội dung trong văn bản.


        Văn bản đầu vào có chi tiết sau:
        Tên file: ${documentName}.txt
        Có mô tả: ${description || "Không có mô tả"}
        Có tags: ${tags && tags.length > 0 ? tags.join(", ") : "Không có tags"}
        *** Văn bản ***\n
        ${fileData}
        `,
      },
    ];
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: contents,
      generationConfig: {
        temperature: 1,
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING },
              answer: { type: Type.STRING },
            },
            propertyOrdering: ["question", "answer"],
          },
        },
      },
    });
    const result = response.text;
    // lưu kết quả vào file
    const outputPath = path.format({
      dir: saveDir, // Thư mục lưu file
      name: "faq", // Tên file không có phần mở rộng
      ext: ".json", // Phần mở rộng là .txt
    });

    fs.writeFileSync(outputPath, result, "utf8");
    console.log(`✅ Đã lưu FAQ vào ${outputPath}`);
  } catch (error) {
    console.error("❌ Lỗi khi gọi hàm generateFAQ:", error.message);
    throw error;
  }
}

module.exports = { generateFAQ };
