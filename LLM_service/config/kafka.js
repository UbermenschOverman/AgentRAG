// kafka connector
const { Kafka } = require("kafkajs");

// hàm để khởi động consumer Kafka
const kafka = new Kafka({
  clientId: "llm-service",
  brokers: ["localhost:9092"],
});

module.exports = {
  kafka,
};