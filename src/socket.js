import { io } from "socket.io-client";

const socket = io("https://watch-party-t6zg.onrender.com", {
  transports: ["websocket", "polling"],
  reconnection: true,
  reconnectionAttempts: 5,
});

export default socket;