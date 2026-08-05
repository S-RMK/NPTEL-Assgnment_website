import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    BookOpen, Shield, LogIn, LogOut, User, Menu, X,
    LayoutDashboard, Settings, PencilRuler
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';

/*
 * The old navbar was a single flex row that wrapped onto three lines on a phone and
 * pushed the page content below the fold. This keeps a compact 56px bar on mobile with
 * the secondary actions behind a menu, and the full row from 768px up.
 */
const Navbar = () => {
    const { isEditMode, toggleEditMode, canEdit } = useApp();
    const { user, logout, isAdmin } = useAuth();
    const [menuOpen, setMenuOpen] = useState(false);
    const location = useLocation();

    // Close the menu on navigation, otherwise it stays open over the new page.
    useEffect(() => setMenuOpen(false), [location.pathname]);

    const navLinks = (
        <>
            <Link to="/" className="nav-link">
                <LayoutDashboard size={17} /> Dashboard
            </Link>
            <Link to="/courses" className="nav-link">
                <BookOpen size={17} /> Courses
            </Link>
            {user && (
                <Link to="/settings" className="nav-link">
                    <Settings size={17} /> Settings
                </Link>
            )}
            {isAdmin && (
                <Link to="/admin" className="nav-link nav-link-admin">
                    <Shield size={17} /> Admin
                </Link>
            )}
        </>
    );

    const account = user ? (
        <>
            <span className="nav-user">
                <User size={15} /> {user.displayName || user.username}
            </span>
            <button onClick={logout} className="nav-btn-ghost">
                <LogOut size={15} /> Logout
            </button>
        </>
    ) : (
        <>
            <Link to="/login" className="nav-link">
                <LogIn size={16} /> Login
            </Link>
            <Link to="/register" className="btn-primary nav-btn-register">Register</Link>
        </>
    );

    return (
        <header className="navbar glass-panel">
            <div className="navbar-inner">
                <Link to="/" className="navbar-brand">
                    <span className="navbar-logo"><BookOpen size={19} color="white" /></span>
                    <span className="navbar-title">NPTEL Answers</span>
                </Link>

                <nav className="navbar-desktop">
                    {navLinks}
                    <span className="navbar-divider" />
                    {account}
                    {/* Edit mode writes to the database, so it is offered only to admins;
                        the server rejects the underlying requests from anyone else. */}
                    {canEdit && (
                        <label className="edit-toggle" title="Toggle content editing">
                            <PencilRuler size={15} />
                            <span className="edit-toggle-text">Edit</span>
                            <span className="switch">
                                <input type="checkbox" checked={isEditMode} onChange={toggleEditMode} />
                                <span className="slider" />
                            </span>
                        </label>
                    )}
                </nav>

                <button
                    className="navbar-toggle"
                    onClick={() => setMenuOpen((o) => !o)}
                    aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                    aria-expanded={menuOpen}
                >
                    {menuOpen ? <X size={22} /> : <Menu size={22} />}
                </button>
            </div>

            {menuOpen && (
                <div className="navbar-mobile">
                    {navLinks}
                    <span className="navbar-mobile-divider" />
                    <div className="navbar-mobile-account">{account}</div>
                    {canEdit && (
                        <label className="edit-toggle edit-toggle-mobile">
                            <PencilRuler size={15} />
                            <span className="edit-toggle-text">Edit mode</span>
                            <span className="switch">
                                <input type="checkbox" checked={isEditMode} onChange={toggleEditMode} />
                                <span className="slider" />
                            </span>
                        </label>
                    )}
                </div>
            )}
        </header>
    );
};

export default Navbar;
