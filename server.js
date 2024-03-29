const port = process.env.PORT || 5000;
const dbConnection = require("./config/db");
const app = require("./app");
require("dotenv").config();

dbConnection(process.env.DB_URL);
const server = app.listen(port, "192.168.10.16", () => {
  console.log("Application running on port", port);
});

const io = require("socket.io")(server, {
  pingTimeout: 60000,
  cors: {
    origin: "http://localhost:5173",
  },
});

// Socket.IO
io.on("connection", (socket) => {
  console.log(`Socket ${socket.id} connected`);
});
