import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Login from "./pages/auth/Login";
import Signup from "./pages/auth/Signup";
import Home from "./pages/Home";
import RoadmapPage from "./pages/RoadmapPage";

function App() {
  return (
    <Router>
      {/* Full height layout */}
      <div className="flex flex-col min-h-screen bg-gray-50">
        <Navbar />
        <main className="flex-grow flex justify-center items-center">
          <div className="w-full max-w-6xl p-6">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/auth/login" element={<Login />} />
              <Route path="/auth/signup" element={<Signup />} />
              <Route path="/roadmap" element={<RoadmapPage />} />
            </Routes>
          </div>
        </main>
      </div>
    </Router>
  );
}
//mihi is munda
export default App;
