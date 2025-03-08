import { io } from "socket.io-client";

const socket = io("ws://localhost:5000", {
  transports: ["websocket", "polling"],
  reconnection: true, // ✅ Auto-reconnect
  reconnectionAttempts: 5,
});

export default socket;
