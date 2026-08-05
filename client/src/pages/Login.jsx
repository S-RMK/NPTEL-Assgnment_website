import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { LogIn, User, Lock } from 'lucide-react';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const user = await login(username, password);
            if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
                navigate('/admin');
            } else {
                navigate('/');
            }
        } catch (err) {
            setError(err.message || 'Invalid username or password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: '420px', margin: '3rem auto', padding: '0 1rem' }}>
            <div className="glass-panel" style={{ padding: '2rem', borderRadius: '24px' }}>
                <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                    <div style={{
                        display: 'inline-flex',
                        padding: '0.75rem',
                        background: 'var(--grad-main)',
                        borderRadius: '16px',
                        marginBottom: '0.75rem'
                    }}>
                        <LogIn size={28} color="white" />
                    </div>
                    <h2 style={{ margin: 0, fontSize: '1.5rem' }}>Welcome Back</h2>
                    <p style={{ margin: '0.25rem 0 0 0', color: 'var(--clr-text-muted)', fontSize: '0.875rem' }}>
                        Sign in to access your personalized course dashboard
                    </p>
                </div>

                {error && (
                    <div style={{
                        padding: '0.75rem',
                        background: 'rgba(239, 68, 68, 0.15)',
                        border: '1px solid #ef4444',
                        color: '#f87171',
                        borderRadius: '10px',
                        fontSize: '0.85rem',
                        marginBottom: '1rem'
                    }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--clr-text-muted)', marginBottom: '0.4rem' }}>Username</label>
                        <div style={{ position: 'relative' }}>
                            <User size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--clr-text-muted)' }} />
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="Enter your username"
                                required
                                style={{
                                    width: '100%',
                                    padding: '0.75rem 1rem 0.75rem 2.75rem',
                                    borderRadius: '12px',
                                    background: 'var(--clr-bg-card)',
                                    border: '1px solid var(--clr-border)',
                                    color: 'white'
                                }}
                            />
                        </div>
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--clr-text-muted)', marginBottom: '0.4rem' }}>Password</label>
                        <div style={{ position: 'relative' }}>
                            <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--clr-text-muted)' }} />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter your password"
                                required
                                style={{
                                    width: '100%',
                                    padding: '0.75rem 1rem 0.75rem 2.75rem',
                                    borderRadius: '12px',
                                    background: 'var(--clr-bg-card)',
                                    border: '1px solid var(--clr-border)',
                                    color: 'white'
                                }}
                            />
                        </div>
                    </div>

                    <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', padding: '0.75rem', fontSize: '1rem', borderRadius: '12px' }}>
                        {loading ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>

                <div style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.85rem', color: 'var(--clr-text-muted)' }}>
                    Don't have an account? <Link to="/register" style={{ color: '#818cf8', textDecoration: 'none' }}>Register here</Link>
                </div>
            </div>
        </div>
    );
};

export default Login;
