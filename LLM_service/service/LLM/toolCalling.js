// nhận đầu vào là 1 mảng các sub-promt, loop từng phần tử của mảng, từ lable để quyết định endpoint nào là hợp lý,
// forward tương ứng tới endpoint đó,
// sau khi nhận được full câu trả lời cho các sub-promt, tổng lại thành 1 đoạn văn, return chúng để sau sử dụng để gen câu trả lời cuối cùng
/*
mảng có dạng "sub_prompts": [
        {{
          "rank": 1,
          "sub_prompt": "rephrase of the original user's input if the input cannot be decomposed further or the atomic sub_prompt (all must be concise, short but have the same meaning)",
          "API": "Reservation API | Query API | Customer Relation API | Chitchat API", 
          "Response": null or your generated response
        }},
        {{
          "rank": 2,
          "sub_prompt": "another sub prompt",
          "API": "...", 
          "Response": null
        }}
      ]
/
/**
 * biết có các endpoints:http://localhost:7101/reservation cho Reservation API (req có dạng {
  "context": "Mikan Village - Khu nghỉ dưỡng cuối tuần phong cách Nhật tại Yên Bái, Ba Vì, Hà Nội.",
  "intent": "cho tôi dịch vụ ăn sáng tại villa nhé, liên hệ tôi qua số 0901729617",
  "tenantId":"VillaChunk",
  "conversationId":"01"
})
 * http://localhost:7101/query cho rag (rq có dạng: {
  "query": "Nướng đồ là miễn phí hay phải thuê bếp nướng",
  "bussiness_detail": "Mikan Village khu nghỉ dưỡng cuối tuần phong cách Nhật tại Yên Bái, Ba Vì, Hà Nội.",
  "tenant_Id":"VillaChunk"
})
 * 
 */
const axios = require("axios");

const baseUrl = process.env.RESERVATION || "http://localhost:7101/reservation";
const baseUrlRAG = process.env.RAG || "http://localhost:7101/query";

async function RAG(query, bussiness_detail, tenant_Id){
    try {
        const response = await axios.post(baseUrlRAG, {
            query,
            bussiness_detail,
            tenant_Id
        });
        // const { answer, isValid } = response.data;
        // console.log("RAG response:", response.data);
        return response.data;
    } catch (error) {
        console.error("Error in RAG:", error);
        throw error;
    }
}

async function Reservation(context, intent, tenantId, conversationId){
    try {
        const response = await axios.post(baseUrl, {
            context,
            intent,
            tenantId,
            conversationId
        });
      const { form, isFullyFilled, isConfirmed , response:LLM_res } = response.data;
      console.log("Response from Reservation API:", response.data);
       return {"đơn hiện tại": form, "isFullyFilled": isFullyFilled, "isConfirmed": isConfirmed , "phản hồi từ trợ lý lên đơn": LLM_res};
    } catch (error) {
        console.error("Error in Reservation:", error);
        throw error;
    }
}

module.exports = {
  RAG,
  Reservation
};