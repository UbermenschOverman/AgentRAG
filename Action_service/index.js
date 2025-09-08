const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const cors = require("cors");


const queryRoute = require("./router/queryRouter");
const reservationRoute = require("./router/reservationRouter");
const fileRoute = require("./file_handler/Handler");
const campaignRoute = require("./router/campaignRouter");
const configRouter = require("./router/configRouter");

const app = express();
const port = process.env.PORT || 7101;

const corsOptions = {
  origin: "*", // Cho phép tất cả các domain truy cập
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
};

app.use(cors(corsOptions)); // Sử dụng middleware CORS toàn cục
app.use(express.json());

app.use(bodyParser.json());

// Serve static HTML files from the "public" folder
app.use(express.static(path.join(__dirname, "public")));

// Mount routes
app.use("/query", queryRoute);
app.use("/reservation", reservationRoute);
app.use("/file", fileRoute);
app.use("/campaign", campaignRoute);
app.use("/config", configRouter);

app.listen(port, () => {
  console.log(`🚀 Server đang chạy tại http://localhost:${port}`);
  console.log(`Truy cập giao diện upload tại http://localhost:${port}/upload.html`);
});