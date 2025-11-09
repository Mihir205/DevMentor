import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import MainLayout from "./components/layouts/MainLayout";
import AuthLayout from "./components/layouts/AuthLayout";
import Login from "./pages/auth/Login";
import Signup from "./pages/auth/Signup";
import Home from "./pages/Home";
import RoadmapPage from "./pages/RoadmapPage";
import GoalSetup from "./pages/GoalSetup";
import ProfilePage from "./pages/ProfilePage";
import SupportPage from "./pages/SupportPage"; // Import the new page

function App() {
  return (
    <Router>
      <Routes>
        {/* Simple pages with a default navbar can go here */}
        <Route element={<MainLayout />}>
          {/* Example: <Route path="/about" element={<About />} /> */}
        </Route>

        {/* Full-screen app pages that manage their own headers */}
        <Route element={<AuthLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/roadmap" element={<RoadmapPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/support" element={<SupportPage />} /> {/* Add the new route */}
          <Route path="/goal-setup" element={<GoalSetup />} />
          <Route path="/auth/login" element={<Login />} />
          <Route path="/auth/signup" element={<Signup />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;