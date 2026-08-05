import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import DeadlineCard from './DeadlineCard';
import PollCard from './PollCard';
import AnnouncementCard from './AnnouncementCard';
import NotificationBanner from './NotificationBanner';
import Spinner from './Spinner';
import { BookOpen, Calendar, Vote, Bell, Sparkles, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const Dashboard = () => {
    const { user } = useAuth();
    const [dashboardData, setDashboardData] = useState({
        deadlines: [],
        polls: [],
        announcements: [],
        recentWeeks: [],
        courses: []
    });
    const [loading, setLoading] = useState(true);

    const loadDashboard = async () => {
        try {
            const data = await api.getDashboard();
            setDashboardData(data);
        } catch (err) {
            console.error('Failed to load dashboard:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadDashboard();
    }, []);

    // The manifest's app shortcuts deep-link to /#deadlines and /#polls. Those sections
    // only exist once dashboard data has rendered, so scroll once loading finishes
    // rather than letting the browser's native anchor jump fire against an empty page.
    useEffect(() => {
        if (loading || !window.location.hash) return;
        const target = document.getElementById(window.location.hash.slice(1));
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, [loading]);

    return (
        <div style={{ paddingBottom: '3rem' }}>
            {/* Header Greeting */}
            <div className="glass-panel" style={{
                padding: '1.25rem',
                borderRadius: '18px',
                marginBottom: '1.25rem',
                background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.2) 0%, rgba(147, 51, 234, 0.15) 100%)',
                border: '1px solid rgba(255,255,255,0.1)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#a78bfa', fontSize: '0.78rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.3rem' }}>
                    <Sparkles size={15} />
                    <span>Your dashboard</span>
                </div>
                <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700, overflowWrap: 'anywhere' }}>
                    {user ? `Welcome back, ${user.displayName || user.username}!` : 'Welcome to NPTEL Answers'} 👋
                </h2>
                <p style={{ margin: '0.4rem 0 0 0', color: 'var(--clr-text-muted)', fontSize: '0.86rem' }}>
                    {!user ? (
                        <>Sign in to personalise your deadlines, polls and alerts.</>
                    ) : user.selectedCourses && user.selectedCourses.length > 0 ? (
                        `Personalised for your ${user.selectedCourses.length} enrolled course${user.selectedCourses.length === 1 ? '' : 's'}.`
                    ) : (
                        <>Pick your courses in <Link to="/settings" style={{ color: '#a5b4fc' }}>Settings</Link> to personalise this page.</>
                    )}
                </p>
            </div>

            {/* Notification Opt-In Banner */}
            <NotificationBanner />

            {loading && (
                <div className="glass-panel" style={{ borderRadius: '16px', padding: '0.5rem' }}>
                    <Spinner label="Loading your dashboard…" />
                </div>
            )}

            {/* Upcoming Deadlines Section */}
            {dashboardData.deadlines && dashboardData.deadlines.length > 0 && (
                <div id="deadlines" style={{ marginBottom: '2rem', scrollMarginTop: '5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                        <Calendar size={20} color="#f59e0b" />
                        <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Upcoming Deadlines</h3>
                    </div>
                    {dashboardData.deadlines.map((dl) => (
                        <DeadlineCard key={dl.id} deadline={dl} />
                    ))}
                </div>
            )}

            {/* Pinned Announcements */}
            {dashboardData.announcements && dashboardData.announcements.length > 0 && (
                <div style={{ marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                        <Bell size={20} color="#eab308" />
                        <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Announcements</h3>
                    </div>
                    {dashboardData.announcements.map((ann) => (
                        <AnnouncementCard key={ann.id} announcement={ann} />
                    ))}
                </div>
            )}

            {/* Active Community Polls */}
            {dashboardData.polls && dashboardData.polls.length > 0 && (
                <div id="polls" style={{ marginBottom: '2rem', scrollMarginTop: '5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                        <Vote size={20} color="#c084fc" />
                        <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Active Polls</h3>
                    </div>
                    {dashboardData.polls.map((poll) => (
                        <PollCard key={poll.id} poll={poll} />
                    ))}
                </div>
            )}

            {/* Quick Courses Overview */}
            <div style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <BookOpen size={20} color="#6366f1" />
                        <h3 style={{ margin: 0, fontSize: '1.25rem' }}>My Courses</h3>
                    </div>
                    <Link to="/courses" style={{ color: '#818cf8', textDecoration: 'none', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                        Browse all <ArrowRight size={16} />
                    </Link>
                </div>

                <div className="card-grid">
                    {dashboardData.courses && dashboardData.courses.slice(0, 4).map((course) => (
                        <Link key={course.id} to={`/course/${course.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                            <div className="glass-panel card" style={{ padding: '1.25rem', borderRadius: '16px' }}>
                                <h4 style={{ margin: '0 0 0.4rem 0', fontSize: '1.1rem' }}>{course.title}</h4>
                                <span style={{ fontSize: '0.85rem', color: 'var(--clr-text-muted)', background: 'rgba(255,255,255,0.05)', padding: '0.2rem 0.6rem', borderRadius: '6px' }}>
                                    {course.code}
                                </span>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
