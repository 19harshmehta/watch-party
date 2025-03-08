import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const Welcome = () => {
    const [username, setUsername] = useState("");
    const [roomId, setRoomId] = useState("");
    const navigate = useNavigate();

    const handleCreateRoom = () => {
        if (username.trim()) {
            localStorage.setItem("username", username);
            const newRoomId = Math.random().toString(36).substring(7);
            navigate(`/room/${newRoomId}?username=${encodeURIComponent(username)}`);
        } else {
            alert("Please enter your name.");
        }
    };

    const handleJoinRoom = () => {
        if (username.trim() && roomId.trim()) {
            localStorage.setItem("username", username);
            navigate(`/room/${roomId}?username=${encodeURIComponent(username)}`);
        } else {
            alert("Please enter your name and room ID.");
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-purple-900 to-indigo-900 text-white">
            <div className="bg-white/10 backdrop-blur-md p-8 rounded-lg shadow-2xl border border-white/10 animate-fade-in">
                <h1 className="text-4xl font-bold mb-6 text-center bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400">
                    Welcome to Video Chat
                </h1>
                <div className="space-y-4">
                    <input
                        type="text"
                        placeholder="Enter your name"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full p-3 rounded-lg bg-white/10 border border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-400 placeholder:text-white/50"
                    />
                    <input
                        type="text"
                        placeholder="Enter room ID to join"
                        value={roomId}
                        onChange={(e) => setRoomId(e.target.value)}
                        className="w-full p-3 rounded-lg bg-white/10 border border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-400 placeholder:text-white/50"
                    />
                    <div className="flex gap-4">
                        <button
                            onClick={handleJoinRoom}
                            className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-lg transition-all duration-300 transform hover:scale-105"
                        >
                            Join Room
                        </button>
                        <button
                            onClick={handleCreateRoom}
                            className="flex-1 bg-pink-600 hover:bg-pink-700 text-white font-semibold py-3 rounded-lg transition-all duration-300 transform hover:scale-105"
                        >
                            Create Room
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Welcome;