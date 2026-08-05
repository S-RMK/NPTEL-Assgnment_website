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
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/courses" element={<Home />} />
              <Route path="/course/:courseId" element={<Course />} />
              <Route path="/week/:weekId" element={<Week />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route
                path="/settings"
                element={<RequireAuth><Settings /></RequireAuth>}
              />
              <Route
                path="/admin"
                element={<RequireAdmin><AdminDashboard /></RequireAdmin>}
              />
              <Route path="*" element={<NotFound />} />
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
