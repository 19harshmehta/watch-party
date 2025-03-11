require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const { PeerServer } = require("peer");

const app = express();
const server = http.createServer(app);

const allowedOrigins = [
    "https://watch-party-wsj0ighu4-harsh-mehtas-projects-7856af38.vercel.app",
    "http://localhost:3000",
];

app.use(
    cors({
        origin: allowedOrigins,
        methods: ["GET", "POST"],
        credentials: true,
    })
);

const io = new Server(server, {
    cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"],
    },
});

const peerServer = PeerServer({
    port: 5001,
    path: "/peerjs",
    secure: true,
});

app.use("/peerjs", peerServer);

const rooms = {};

io.on("connection", (socket) => {
    console.log(`🔵 User Connected: ${socket.id}`);

    socket.on("join-room", ({ roomId, userId, username }) => {
        socket.join(roomId);

        if (!rooms[roomId]) {
            rooms[roomId] = new Set();
        }

        rooms[roomId].add(userId);

        socket.to(roomId).emit("user-joined", userId, username);

        socket.emit("existing-users", Array.from(rooms[roomId]));

        console.log(`🟢 User ${username} (${userId}) joined room ${roomId}`);
    });

    socket.on("send-message", (roomId, message) => {
        socket.to(roomId).emit("receive-message", message);
    });

    socket.on("update-movie-url", (roomId, url) => {
        socket.to(roomId).emit("update-movie-url", url);
    });

    socket.on("play-movie", (roomId) => {
        socket.to(roomId).emit("play-movie");
    });

    socket.on("pause-movie", (roomId) => {
        socket.to(roomId).emit("pause-movie");
    });

    socket.on("seek-movie", (roomId, time) => {
        socket.to(roomId).emit("seek-movie", time);
    });

    socket.on("disconnect", () => {
        console.log(`🔴 User Disconnected: ${socket.id}`);

        for (let roomId in rooms) {
            if (rooms[roomId].has(socket.id)) {
                io.to(roomId).emit("user-left", socket.id);
                console.log(`🟡 User ${socket.id} left room ${roomId}`);
                rooms[roomId].delete(socket.id);
            }
        }
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));