import dotenv from "dotenv";
dotenv.config();

import http from "http";
import { Server as SocketIOServer } from "socket.io";
import app from "./app";
import { setupSocketIO } from "./socket";
import { startSessionSweeper } from "./modules/scheduling/sessionSweeper";

const PORT = Number(process.env.PORT) || 4000;

const httpServer = http.createServer(app);

const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.CLIENT_ORIGIN || "http://localhost:3000",
    credentials: true,
  },
});

setupSocketIO(io);

startSessionSweeper();

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});