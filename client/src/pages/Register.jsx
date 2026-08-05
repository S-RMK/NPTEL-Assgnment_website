import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { UserPlus, User, Lock, BookOpen } from 'lucide-react';
import { api } from '../api';

const Register = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [availableCourses, setAvailableCourses] = useState([]);
    const [selectedCourses, setSelectedCourses] = useState([]);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { register } = useAuth();
    const navigate = useNavigate();

    const loadCourses = async () => {
        try {
            // Names-only catalogue: the authenticated /courses endpoint needs a token
            // that does not exist yet at registration time.
            const data = await api.getCourseCatalogue();
            setAvailableCourses(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error('Failed to load courses for registration:', e);
        }
    };

    useEffect(() => {
        loadCourses();

    }, []);

    const toggleCourseSelection = (courseId) => {
        setSelectedCourses(prev =>
            prev.includes(courseId) ? prev.filter(id => id !== courseId) : [...prev, courseId]
        );
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Mirrors the server rule. Your courses decide what the app shows you, so an
        // account with none would open onto an empty dashboard.
        if (selectedCourses.length === 0) {
            setError('Please select at least one course you are enrolled in.');
            return;
        }
        if (password.length < 6) {
            setError('Password must be at least 6 characters.');
            return;
        }

        setLoading(true);
        try {
            await register(username, password, displayName, selectedCourses);
            navigate('/');
        } catch (err) {
            setError(err.message || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: '480px', margin: '2.5rem auto', padding: '0 1rem' }}>
            <div className="glass-panel" style={{ padding: '2rem', borderRadius: '24px' }}>
                <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                    <div style={{
                        display: 'inline-flex',
                        padding: '0.75rem',
                        background: 'var(--grad-main)',
                        borderRadius: '16px',
                        marginBottom: '0.75rem'
                    }}>
                        <UserPlus size={28} color="white" />
                    </div>
                    <h2 style={{ margin: 0, fontSize: '1.5rem' }}>Create Account</h2>
                    <p style={{ margin: '0.25rem 0 0 0', color: 'var(--clr-text-muted)', fontSize: '0.875rem' }}>
                        Register and select your enrolled NPTEL courses
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
                        <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--clr-text-muted)', marginBottom: '0.4rem' }}>Display Name</label>
                        <input
                            type="text"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            placeholder="e.g. Tarun Kumar"
                            required
                            style={{
                                width: '100%',
                                padding: '0.75rem 1rem',
                                borderRadius: '12px',
                                background: 'var(--clr-bg-card)',
                                border: '1px solid var(--clr-border)',
                                color: 'white'
                            }}
                        />
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--clr-text-muted)', marginBottom: '0.4rem' }}>Username</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Choose a unique username"
                            required
                            style={{
                                width: '100%',
                                padding: '0.75rem 1rem',
                                borderRadius: '12px',
                                background: 'var(--clr-bg-card)',
                                border: '1px solid var(--clr-border)',
                                color: 'white'
                            }}
                        />
                    </div>

                    <div style={{ marginBottom: '1.25rem' }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--clr-text-muted)', marginBottom: '0.4rem' }}>Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Create a password"
                            required
                            style={{
                                width: '100%',
                                padding: '0.75rem 1rem',
                                borderRadius: '12px',
                                background: 'var(--clr-bg-card)',
                                border: '1px solid var(--clr-border)',
                                color: 'white'
                            }}
                        />
                    </div>

                    {/* Course Selection Module */}
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', color: '#a78bfa', fontWeight: 600, marginBottom: '0.25rem' }}>
                            Select your enrolled courses <span style={{ color: '#f87171' }}>*</span>
                        </label>
                        <p style={{ margin: '0 0 0.5rem', fontSize: '0.76rem', color: 'var(--clr-text-muted)' }}>
                            You'll only see deadlines, polls and answers for the courses you pick.
                            You can change them later in Settings.
                        </p>
                        {availableCourses.length === 0 && (
                            <p style={{ margin: 0, fontSize: '0.82rem', color: '#fbbf24' }}>
                                No courses have been published yet — ask your admin to add one before registering.
                            </p>
                        )}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '180px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                            {availableCourses.map((c) => {
                                const isChecked = selectedCourses.includes(c.id);
                                return (
                                    <div
                                        key={c.id}
                                        onClick={() => toggleCourseSelection(c.id)}
                                        style={{
                                            padding: '0.6rem 0.8rem',
                                            borderRadius: '8px',
                                            background: isChecked ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                                            border: isChecked ? '1px solid #6366f1' : '1px solid var(--clr-border)',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between'
                                        }}
                                    >
                                        <span style={{ fontSize: '0.85rem', color: 'white' }}>{c.title}</span>
                                        <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={() => { }} // Managed by parent onClick
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading || selectedCourses.length === 0}
                        className="btn-primary"
                        style={{
                            width: '100%', padding: '0.75rem', fontSize: '1rem', borderRadius: '12px',
                            opacity: loading || selectedCourses.length === 0 ? 0.55 : 1,
                            cursor: loading || selectedCourses.length === 0 ? 'default' : 'pointer'
                        }}
                    >
                        {loading
                            ? 'Creating Account…'
                            : selectedCourses.length === 0
                                ? 'Select a course to continue'
                                : `Complete Registration (${selectedCourses.length} course${selectedCourses.length === 1 ? '' : 's'})`}
                    </button>
                </form>

                <div style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.85rem', color: 'var(--clr-text-muted)' }}>
                    Already have an account? <Link to="/login" style={{ color: '#818cf8', textDecoration: 'none' }}>Sign in here</Link>
                </div>
            </div>
        </div>
    );
};

export default Register;
