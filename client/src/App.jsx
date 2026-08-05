import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import Home from './pages/Home';
import Course from './pages/Course';
import Week from './pages/Week';
import Login from './pages/Login';
import Register from './pages/Register';
import AdminDashboard from './pages/AdminDashboard';
import Dashboard from './components/Dashboard';
import InstallPrompt from './components/InstallPrompt';
import './styles/global.css';
import './styles/components.css';
import { BookOpen, Shield, LogIn, LogOut, User, LayoutDashboard, Plus } from 'lucide-react';

const Navbar = () => {
  const { isEditMode, toggleEditMode } = useApp();
  const { user, logout, isAdmin } = useAuth();

  const handleEditToggle = () => {
    if (!isEditMode) {
      const pin = prompt("Enter Admin PIN to enable Edit Mode:");
      if (pin === "1234") {
        toggleEditMode();
      } else if (pin !== null) {
        alert("Incorrect PIN!");
      }
    } else {
      toggleEditMode();
    }
  };

  return (
    <nav className="glass-panel" style={{
      padding: '1rem 2rem',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      position: 'sticky',
      top: 0,
      zIndex: 1000,
      borderBottom: '1px solid var(--clr-border)'
    }}>
      <Link to="/" style={{ textDecoration: 'none', color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <div style={{ padding: '0.5rem', background: 'var(--grad-main)', borderRadius: '8px' }}>
          <BookOpen size={24} color="white" />
        </div>
        <span style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>NPTEL Answers</span>
      </Link>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {isAdmin && (
              <Link to="/admin" style={{ color: '#f59e0b', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem', fontWeight: 600 }}>
                <Shield size={18} /> Admin Portal
              </Link>
            )}
            <span style={{ fontSize: '0.9rem', color: 'var(--clr-text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <User size={16} /> {user.displayName || user.username}
            </span>
            <button
              onClick={logout}
              style={{
                background: 'transparent',
                border: '1px solid var(--clr-border)',
                color: 'var(--clr-text-muted)',
                padding: '0.4rem 0.8rem',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.85rem'
              }}
            >
              <LogOut size={16} /> Logout
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Link to="/login" style={{ color: 'white', textDecoration: 'none', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <LogIn size={16} /> Login
            </Link>
            <Link to="/register" className="btn-primary" style={{ padding: '0.4rem 0.9rem', fontSize: '0.85rem', textDecoration: 'none' }}>
              Register
            </Link>
          </div>
        )}

        <div className="edit-toggle" style={{ marginLeft: '0.5rem' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--clr-text-muted)' }}>PIN Edit</span>
          <label className="switch">
            <input type="checkbox" checked={isEditMode} onChange={handleEditToggle} />
            <span className="slider"></span>
          </label>
        </div>
      </div>
    </nav>
  );
};

function App() {
  return (
    <AppProvider>
      <AuthProvider>
        <Router>
          <Navbar />
          <main className="container" style={{ marginTop: '1.5rem' }}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/courses" element={<Home />} />
              <Route path="/course/:courseId" element={<Course />} />
              <Route path="/week/:weekId" element={<Week />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/admin" element={<AdminDashboard />} />
            </Routes>
          </main>
          <InstallPrompt />
        </Router>
      </AuthProvider>
    </AppProvider>
  );
}

export default App;
