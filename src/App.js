import "./index.css";
import logo from './logo.svg';
import './App.css';
import {  BrowserRouter as Router, Routes, Route } from "react-router-dom";
// import Home from "./pages/Home";
import RoomPage from "./pages/RoomPage";
import Welcome from "./pages/Welcome";

function App() {
  return (
    <Router>
            <Routes>
                <Route path="/" element={<Welcome />} />
                <Route path="/room/:roomId" element={<RoomPage />} />
            </Routes>
    </Router>
  );
}

export default App;
