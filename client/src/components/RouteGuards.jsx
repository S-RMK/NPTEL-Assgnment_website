import { Navigate, useLocation } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Spinner from './Spinner';

/*
 * Every route used to render regardless of auth state, including /admin.
 *
 * Both guards wait for AuthContext to finish its initial /auth/me check before
 * deciding — otherwise a logged-in user is briefly treated as a guest on every hard
 * refresh and gets bounced to the login page.
 */

export const RequireAuth = ({ children }) => {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) return <Spinner label="Checking your session…" />;

    // `state` lets the login page send the user back where they were headed.
    if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;

    return children;
};

export const RequireAdmin = ({ children }) => {
    const { user, isAdmin, loading } = useAuth();
    const location = useLocation();

    if (loading) return <Spinner label="Checking your session…" />;
    if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;

    // A signed-in non-admin is told plainly, rather than silently redirected to a page
    // that looks like a login failure.
    if (!isAdmin) {
        return (
            <div className="glass-panel" style={{
                maxWidth: '30rem',
                margin: '3rem auto',
                padding: '2rem',
                borderRadius: '20px',
                textAlign: 'center'
            }}>
                <ShieldAlert size={40} color="#f59e0b" style={{ marginBottom: '0.75rem' }} />
                <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.25rem' }}>Admins only</h2>
                <p style={{ margin: 0, color: 'var(--clr-text-muted)', fontSize: '0.9rem' }}>
                    Your account doesn't have access to the admin portal.
                </p>
            </div>
        );
    }

    return children;
};
