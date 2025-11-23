// pages/api/socket.js
import { Server } from "socket.io";
import { setSocketIOServer } from "../../lib/socket-io-server";

const SocketHandler = (req, res) => {
  // If server already initialized, allow Engine.IO polling/upgrade requests
  // to pass through without ending the response early (which causes handshake failures).
  if (res.socket.server.io) {
    // For non-Engine.IO requests (plain manual GET to /api/socket) we can end quickly.
    if (!req.url.includes("EIO=")) {
      res.end();
    }
    return;
  }

  console.log("Initializing Socket.IO server...");

  // Use a namespaced Socket.IO path under /api so Next.js will route the
  // handshake requests here and the Engine.IO layer can respond without 404.
  const io = new Server(res.socket.server, {
    path: "/api/socket",
    addTrailingSlash: false,
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || "*",
      methods: ["GET", "POST"],
    },
  });

  // Attach the io instance to the server and globally
  res.socket.server.io = io;
  setSocketIOServer(io);

  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    // Join a specific classroom chat room
    socket.on("join_classroom", (classId) => {
      socket.join(`classroom:${classId}`);
      console.log(`Socket ${socket.id} joined classroom:${classId}`);
    });

    // Leave a classroom chat room
    socket.on("leave_classroom", (classId) => {
      socket.leave(`classroom:${classId}`);
      console.log(`Socket ${socket.id} left classroom:${classId}`);
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
    });
  });

  console.log("Socket.IO server initialized");
  res.end();
};

export default SocketHandler;

export const config = {
  api: {
    bodyParser: false,
  },
};
