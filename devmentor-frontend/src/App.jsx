import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

// Import Layouts
import MainLayout from "./components/layouts/MainLayout";
import AuthLayout from "./components/layouts/AuthLayout";

// Import Pages
import Login from "./pages/auth/Login";
import Signup from "./pages/auth/Signup";
import Home from "./pages/Home";
import RoadmapPage from "./pages/RoadmapPage";

function App() {
  return (
    <Router>
      <Routes>
        {/* Routes with Navbar and main layout */}
        <Route element={<MainLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/roadmap" element={<RoadmapPage />} />
        </Route>

        {/* Routes with NO Navbar (full-screen) */}
        <Route element={<AuthLayout />}>
          <Route path="/auth/login" element={<Login />} />
          <Route path="/auth/signup" element={<Signup />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;