// định nghĩa function
/**
 * Reservation_fuction
Query_fuction
và Chitchat_function

const calFunctionDeclaration = {
  name: "Chitchat_function",
  description:
    "Chitchat function to handle general non-business questions",
  parameters: {
    type: Type.OBJECT,
    properties: {
      formula: {
        type: Type.STRING,
        description:
          "Arithmetic formula, e.g., '(price * quantity) * (1 - discount)'",
      },
      variables: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            value: { type: Type.NUMBER }
          }
        }
      },
    },
    required: ["formula", "variables"],
  },
};
 */