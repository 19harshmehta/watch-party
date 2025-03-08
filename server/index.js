require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const { PeerServer } = require("peer");

const app = express();
const server = http.createServer(app);

// Allow requests from your frontend domain
const allowedOrigins = [
    "https://watch-party-wsj0ighu4-harsh-mehtas-projects-7856af38.vercel.app", // Your Vercel frontend URL
    "http://localhost:3000", // For local development
];

app.use(
    cors({
        origin: allowedOrigins, // Allow requests from these origins
        methods: ["GET", "POST"], // Allow only GET and POST requests
        credentials: true, // Allow credentials (cookies, authorization headers)
    })
);

const io = new Server(server, {
    cors: {
        origin: allowedOrigins, // Allow Socket.IO connections from these origins
        methods: ["GET", "POST"], // Allow only GET and POST requests
    },
});

// Set up PeerJS server
const peerServer = PeerServer({
    port: 5001, // Use a different port for PeerJS
    path: "/peerjs", // Endpoint for PeerJS connections
    secure: false, // Set to true if using HTTPS
});

const rooms = {};

io.on("connection", (socket) => {
    console.log(`🔵 User Connected: ${socket.id}`);

    // Handle joining a room
    socket.on("join-room", ({ roomId, userId, username }) => {
        socket.join(roomId);

        // Initialize the room if it doesn't exist
        if (!rooms[roomId]) {
            rooms[roomId] = new Set();
        }

        // Add the user to the room
        rooms[roomId].add(userId);

        // Notify existing users about the new user
        socket.to(roomId).emit("user-joined", userId, username);

        // Send the list of existing users to the new user
        socket.emit("existing-users", Array.from(rooms[roomId]));

        console.log(`🟢 User ${username} (${userId}) joined room ${roomId}`);
    });

    // Handle sending messages
    socket.on("send-message", (roomId, message) => {
        socket.to(roomId).emit("receive-message", message);
    });

    // Handle movie URL updates
    socket.on("update-movie-url", (roomId, url) => {
        socket.to(roomId).emit("update-movie-url", url);
    });

    // Handle movie play
    socket.on("play-movie", (roomId) => {
        socket.to(roomId).emit("play-movie");
    });

    // Handle movie pause
    socket.on("pause-movie", (roomId) => {
        socket.to(roomId).emit("pause-movie");
    });

    // Handle movie seek
    socket.on("seek-movie", (roomId, time) => {
        socket.to(roomId).emit("seek-movie", time);
    });

    // Handle user disconnection
    socket.on("disconnect", () => {
        console.log(`🔴 User Disconnected: ${socket.id}`);

        // Remove the user from all rooms
        for (let roomId in rooms) {
            if (rooms[roomId].has(socket.id)) {
                io.to(roomId).emit("user-left", socket.id); // Emit user-left event with the correct userId
                console.log(`🟡 User ${socket.id} left room ${roomId}`);
                rooms[roomId].delete(socket.id);
            }
        }
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));