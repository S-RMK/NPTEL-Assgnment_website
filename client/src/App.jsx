import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Course from './pages/Course';
import Week from './pages/Week';
import Login from './pages/Login';
import Register from './pages/Register';
import Settings from './pages/Settings';
import AdminDashboard from './pages/AdminDashboard';
import NotFound from './pages/NotFound';
import Dashboard from './components/Dashboard';
import InstallPrompt from './components/InstallPrompt';
import UpdatePrompt from './components/UpdatePrompt';
import OfflineIndicator from './components/OfflineIndicator';
import { RequireAuth, RequireAdmin } from './components/RouteGuards';
import './styles/global.css';
import './styles/components.css';

function App() {
  // AuthProvider must sit above AppProvider: edit mode is derived from the user's role.
  return (
    <AuthProvider>
      <AppProvider>
        <Router>
          <Navbar />
          <main className="container">
            {/* Login and register are the only routes that render signed out.
                Everything else redirects to /login, and the API refuses the underlying
                requests regardless, so the guard is convenience rather than the
                security boundary. */}
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              <Route path="/" element={<RequireAuth><Dashboard /></RequireAuth>} />
              <Route path="/courses" element={<RequireAuth><Home /></RequireAuth>} />
              <Route path="/course/:courseId" element={<RequireAuth><Course /></RequireAuth>} />
              <Route path="/week/:weekId" element={<RequireAuth><Week /></RequireAuth>} />
              <Route path="/settings" element={<RequireAuth><Settings /></RequireAuth>} />
              <Route path="/admin" element={<RequireAdmin><AdminDashboard /></RequireAdmin>} />

              <Route path="*" element={<RequireAuth><NotFound /></RequireAuth>} />
            </Routes>
          </main>
          <InstallPrompt />
          <UpdatePrompt />
          <OfflineIndicator />
        </Router>
      </AppProvider>
    </AuthProvider>
  );
}

export default App;
