import React, { useEffect, useRef, useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import io from "socket.io-client";
import Peer from "peerjs";

// Initialize Socket.IO connection
const socket = io("https://watch-party-t6zg.onrender.com", {
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: 5,
});

const RoomPage = () => {
    const { roomId } = useParams();
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const username = queryParams.get("username") || localStorage.getItem("username") || "";

    const [peers, setPeers] = useState({});
    const [videoUrl, setVideoUrl] = useState("");
    const [showChat, setShowChat] = useState(false);
    const [message, setMessage] = useState("");
    const [messages, setMessages] = useState([]);

    const userVideo = useRef();
    const videoGrid = useRef();
    const movieVideoRef = useRef();
    const peerInstance = useRef(null);
    const chatWindowRef = useRef();

    useEffect(() => {
        // Initialize PeerJS
        peerInstance.current = new Peer(undefined, {
            host: "watch-party-t6zg.onrender.com",
            port: 443,
            path: "/peerjs",
            secure: true,
        });

        peerInstance.current.on("open", (id) => {
            console.log("PeerJS ID:", id);
            socket.emit("join-room", { roomId, userId: id, username });

            // Get user media (video and audio)
            navigator.mediaDevices
                .getUserMedia({ video: true, audio: true })
                .then((stream) => {
                    userVideo.current.srcObject = stream;
                    playVideo(userVideo.current);
                    addVideoStream(userVideo.current, stream, id);

                    // Handle incoming calls
                    peerInstance.current.on("call", (call) => {
                        call.answer(stream);
                        const video = document.createElement("video");
                        call.on("stream", (userVideoStream) => {
                            addVideoStream(video, userVideoStream, call.peer);
                        });
                    });

                    // Connect to existing users in the room
                    socket.on("existing-users", (users) => {
                        users.forEach((userId) => {
                            if (userId !== id) {
                                connectToNewUser(userId, stream);
                            }
                        });
                    });
                })
                .catch((error) => {
                    console.error("Error accessing media devices:", error);
                });
        });

        // Handle PeerJS errors
        peerInstance.current.on("error", (error) => {
            console.error("PeerJS Error:", error);
        });

        // Handle new user joining
        socket.on("user-joined", (userId) => {
            console.log("New user joined:", userId);
            navigator.mediaDevices
                .getUserMedia({ video: true, audio: true })
                .then((stream) => {
                    connectToNewUser(userId, stream);
                })
                .catch((error) => {
                    console.error("Error accessing media devices:", error);
                });
        });

        // Handle user leaving
        socket.on("user-left", (userId) => {
            console.log("User left:", userId);
            removeVideoStream(userId);
        });

        // Handle incoming chat messages
        socket.on("receive-message", (message) => {
            setMessages((prevMessages) => [...prevMessages, message]);
            scrollChatToBottom();
        });

        // Handle movie URL updates
        socket.on("update-movie-url", (url) => {
            setVideoUrl(url);
            if (movieVideoRef.current) {
                movieVideoRef.current.src = url;
                movieVideoRef.current.load();
            }
        });

        // Handle movie play/pause/seek events
        socket.on("play-movie", () => {
            if (movieVideoRef.current) {
                playVideo(movieVideoRef.current);
            }
        });

        socket.on("pause-movie", () => {
            if (movieVideoRef.current) {
                movieVideoRef.current.pause();
            }
        });

        socket.on("seek-movie", (time) => {
            if (movieVideoRef.current) {
                movieVideoRef.current.currentTime = time;
                playVideo(movieVideoRef.current);
            }
        });

        // Cleanup on component unmount
        return () => {
            if (peerInstance.current) {
                peerInstance.current.destroy();
            }
            socket.disconnect();
        };
    }, [roomId, username]);

    // Connect to a new user
    const connectToNewUser = (userId, stream) => {
        const call = peerInstance.current.call(userId, stream);
        const video = document.createElement("video");
        call.on("stream", (userVideoStream) => {
            addVideoStream(video, userVideoStream, userId);
        });
        setPeers((prevPeers) => ({ ...prevPeers, [userId]: call }));
    };

    // Add a video stream to the grid
    const addVideoStream = (video, stream, userId) => {
        const existingVideo = document.querySelector(`video[data-user-id="${userId}"]`);
        if (existingVideo) {
            return;
        }

        video.srcObject = stream;
        video.setAttribute("data-user-id", userId);
        video.classList.add("w-full", "h-full", "rounded-lg", "object-cover");
        video.addEventListener("loadedmetadata", () => {
            playVideo(video);
        });
        if (videoGrid.current) {
            videoGrid.current.appendChild(video);
        }
    };

    // Remove a video stream from the grid
    const removeVideoStream = (userId) => {
        if (peers[userId]) {
            peers[userId].close();
            const videoElement = document.querySelector(`video[data-user-id="${userId}"]`);
            if (videoElement) {
                videoElement.remove();
            }
            setPeers((prevPeers) => {
                const updatedPeers = { ...prevPeers };
                delete updatedPeers[userId];
                return updatedPeers;
            });
        }
    };

    // Play a video element
    const playVideo = (video) => {
        const playPromise = video.play();
        if (playPromise !== undefined) {
            playPromise.catch((error) => {
                console.error("Error playing video:", error);
                setTimeout(() => playVideo(video), 500);
            });
        }
    };

    // Handle movie URL change
    const handleMovieUrlChange = (e) => {
        const url = e.target.value;
        setVideoUrl(url);
        socket.emit("update-movie-url", roomId, url);
    };

    // Handle movie play
    const handlePlayMovie = () => {
        if (movieVideoRef.current) {
            playVideo(movieVideoRef.current);
            socket.emit("play-movie", roomId);
        }
    };

    // Handle movie pause
    const handlePauseMovie = () => {
        if (movieVideoRef.current) {
            movieVideoRef.current.pause();
            socket.emit("pause-movie", roomId);
        }
    };

    // Handle movie seek
    const handleSeekMovie = (time) => {
        if (movieVideoRef.current) {
            movieVideoRef.current.currentTime = time;
            socket.emit("seek-movie", roomId, time);
        }
    };

    // Send a chat message
    const sendMessage = () => {
        if (message.trim()) {
            const messageData = { username, text: message };
            socket.emit("send-message", roomId, messageData);
            setMessages((prevMessages) => [...prevMessages, messageData]);
            setMessage("");
            scrollChatToBottom();
        }
    };

    // Scroll chat to the bottom
    const scrollChatToBottom = () => {
        if (chatWindowRef.current) {
            chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight;
        }
    };

    // Toggle chat visibility
    const toggleChat = () => {
        setShowChat(!showChat);
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-purple-900 to-indigo-900 text-white p-4">
            <h1 className="text-3xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400">
                Room {roomId}
            </h1>
            <div className="w-full max-w-6xl flex gap-6">
                <div ref={videoGrid} className="grid grid-cols-2 gap-4 w-1/4">
                    <video ref={userVideo} className="w-full h-full rounded-lg object-cover" muted />
                </div>
                <div className="flex-1 bg-black/20 rounded-lg p-4">
                    {videoUrl ? (
                        <video
                            ref={movieVideoRef}
                            src={videoUrl}
                            controls
                            onPlay={handlePlayMovie}
                            onPause={handlePauseMovie}
                            onSeeked={(e) => handleSeekMovie(e.target.currentTime)}
                            className="w-full h-96 rounded-lg object-cover"
                        />
                    ) : (
                        <div className="flex items-center justify-center h-96 text-gray-400">
                            Enter a movie URL to start watching
                        </div>
                    )}
                </div>
                {showChat && (
                    <div className="w-1/3 bg-white/10 backdrop-blur-md rounded-lg p-4">
                        <div ref={chatWindowRef} className="h-96 overflow-y-auto mb-4">
                            {messages.map((msg, index) => (
                                <div key={index} className="mb-2">
                                    <strong className="text-purple-400">{msg.username}:</strong>{" "}
                                    <span className="text-white">{msg.text}</span>
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="Type a message"
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                                className="flex-1 p-2 rounded-lg bg-white/10 border border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-400 placeholder:text-white/50"
                            />
                            <button
                                onClick={sendMessage}
                                className="bg-purple-600 hover:bg-purple-700 text-white font-semibold px-4 py-2 rounded-lg transition-all duration-300 transform hover:scale-105"
                            >
                                Send
                            </button>
                        </div>
                    </div>
                )}
            </div>
            <div className="mt-6 w-full max-w-6xl flex gap-4">
                <input
                    type="text"
                    placeholder="Enter movie URL"
                    value={videoUrl}
                    onChange={handleMovieUrlChange}
                    className="flex-1 p-3 rounded-lg bg-white/10 border border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-400 placeholder:text-white/50"
                />
                <button
                    onClick={toggleChat}
                    className="bg-pink-600 hover:bg-pink-700 text-white font-semibold px-6 py-3 rounded-lg transition-all duration-300 transform hover:scale-105"
                >
                    {showChat ? "Close Chat" : "Open Chat"}
                </button>
            </div>
        </div>
    );
};

export default RoomPage;