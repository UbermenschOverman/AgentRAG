const { Kafka } = require("kafkajs");
const { SchemaRegistry } = require("@kafkajs/confluent-schema-registry");

const kafka = new Kafka({
  clientId: "cms-service",
  brokers: ["localhost:9092"], // Đổi nếu chạy qua docker network
});

const producer = kafka.producer();
const consumer = kafka.consumer({ groupId: "cms-service-group" });

const registry = new SchemaRegistry({
  host: "http://localhost:8081", // Schema Registry URL
});

const LLM_MES_SCHEMA = {
  type: "record",
  name: "LLM_mes",
  namespace: "com.chat.incomming_mes",
  doc: "Sample schema to help you get started.",
  fields: [
    { name: "tenantId", type: "string" },
    { name: "conversationId", type: "string" },
    { name: "text", type: "string" },
    { name: "requestId", type: "string" },
    { name: "summary", type: "string" },
    { name: "clientId", type: "string" },
    {name: "mode", type: "string", default: "default"},
  ],
};


async function connectProducer() {
  await producer.connect();
  console.log("[Kafka] Producer connected");
}

module.exports = {
  producer,
  registry,
  connectProducer,
  LLM_MES_SCHEMA,
};
