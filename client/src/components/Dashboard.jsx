import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import DeadlineCard from './DeadlineCard';
import PollCard from './PollCard';
import AnnouncementCard from './AnnouncementCard';
import NotificationBanner from './NotificationBanner';
import Spinner from './Spinner';
import { BookOpen, Calendar, Vote, Bell, ArrowRight, Settings, AlertCircle } from 'lucide-react';

const HOUR = 60 * 60 * 1000;

const Dashboard = () => {
    const { user } = useAuth();
    const [dashboardData, setDashboardData] = useState({
        deadlines: [], polls: [], announcements: [], recentWeeks: [], courses: []
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const loadDashboard = async () => {
        setLoading(true);
        try {
            const data = await api.getDashboard();
            setDashboardData({
                deadlines: data.deadlines || [], polls: data.polls || [],
                announcements: data.announcements || [], recentWeeks: data.recentWeeks || [],
                courses: data.courses || []
            });
            setError('');
        } catch (err) {
            console.error('Failed to load dashboard:', err);
            setError(err.message || 'Could not load your dashboard.');
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

    const { deadlines, polls, announcements, courses } = dashboardData;

    // The single most useful fact on the page: what is due next, and how soon.
    const nextDeadline = useMemo(() => {
        const upcoming = deadlines
            .filter((d) => new Date(d.dueDate) > new Date())
            .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
        return upcoming[0] || null;
    }, [deadlines]);

    const urgentCount = useMemo(
        () => deadlines.filter((d) => {
            const left = new Date(d.dueDate) - new Date();
            return left > 0 && left < 24 * HOUR;
        }).length,
        [deadlines]
    );

    const pendingPolls = useMemo(() => polls.filter((p) => !p.hasVoted).length, [polls]);
    const hasEnrolment = (user?.selectedCourses || []).length > 0;
    const isEmpty = !loading && !error && !courses.length && !deadlines.length && !polls.length && !announcements.length;

    const stats = [
        { label: 'Courses', value: courses.length, tone: '#818cf8', to: '/courses' },
        { label: 'Due soon', value: urgentCount, tone: urgentCount ? '#f59e0b' : '#94a3b8', to: '/#deadlines' },
        { label: 'Polls to answer', value: pendingPolls, tone: pendingPolls ? '#c084fc' : '#94a3b8', to: '/#polls' }
    ];

    return (
        <div style={{ paddingBottom: '3rem' }}>
            {/* Greeting + at-a-glance numbers */}
            <section className="dash-hero glass-panel">
                <div>
                    <span className="dash-hero-eyebrow">Your dashboard</span>
                    <h1 className="dash-hero-title">
                        Hi {user?.displayName || user?.username || 'there'} 👋
                    </h1>
                    <p className="dash-hero-sub">
                        {nextDeadline
                            ? <>Next up: <strong>{nextDeadline.title}</strong></>
                            : hasEnrolment
                                ? 'Nothing due right now — you\'re all caught up.'
                                : <>Pick your courses in <Link to="/settings" style={{ color: '#a5b4fc' }}>Settings</Link> to personalise this page.</>}
                    </p>
                </div>

                <div className="dash-stats">
                    {stats.map((s) => (
                        <Link key={s.label} to={s.to} className="dash-stat">
                            <span className="dash-stat-value" style={{ color: s.tone }}>{s.value}</span>
                            <span className="dash-stat-label">{s.label}</span>
                        </Link>
                    ))}
                </div>
            </section>

            <NotificationBanner />

            {loading && (
                <div className="glass-panel" style={{ borderRadius: '16px' }}>
                    <Spinner label="Loading your dashboard…" />
                </div>
            )}

            {error && (
                <div className="empty-state glass-panel" style={{ borderRadius: '16px' }}>
                    <AlertCircle size={30} color="#f87171" />
                    <p style={{ color: '#f87171' }}>{error}</p>
                    <button className="btn-primary" style={{ padding: '0.5rem 1.2rem' }} onClick={loadDashboard}>Retry</button>
                </div>
            )}

            {isEmpty && (
                <div className="empty-state glass-panel" style={{ borderRadius: '16px' }}>
                    <BookOpen size={34} color="#6366f1" />
                    <p>
                        {hasEnrolment
                            ? 'Nothing has been published for your courses yet.'
                            : 'Choose the NPTEL courses you are taking to see deadlines, polls and answers here.'}
                    </p>
                    {!hasEnrolment && (
                        <Link to="/settings" className="btn-primary" style={{ padding: '0.5rem 1.2rem', textDecoration: 'none' }}>
                            <Settings size={15} style={{ verticalAlign: '-2px', marginRight: '0.35rem' }} />
                            Choose your courses
                        </Link>
                    )}
                </div>
            )}

            {deadlines.length > 0 && (
                <section id="deadlines" className="dash-section">
                    <header className="dash-section-head">
                        <Calendar size={18} color="#f59e0b" />
                        <h2>Upcoming Deadlines</h2>
                        <span className="count-pill">{deadlines.length}</span>
                    </header>
                    {deadlines.map((dl) => <DeadlineCard key={dl.id} deadline={dl} />)}
                </section>
            )}

            {announcements.length > 0 && (
                <section className="dash-section">
                    <header className="dash-section-head">
                        <Bell size={18} color="#eab308" />
                        <h2>Announcements</h2>
                        <span className="count-pill">{announcements.length}</span>
                    </header>
                    {announcements.map((ann) => <AnnouncementCard key={ann.id} announcement={ann} />)}
                </section>
            )}

            {polls.length > 0 && (
                <section id="polls" className="dash-section">
                    <header className="dash-section-head">
                        <Vote size={18} color="#c084fc" />
                        <h2>Active Polls</h2>
                        {pendingPolls > 0 && <span className="count-pill count-pill-alert">{pendingPolls} to answer</span>}
                    </header>
                    {polls.map((poll) => <PollCard key={poll.id} poll={poll} />)}
                </section>
            )}

            {courses.length > 0 && (
                <section className="dash-section">
                    <header className="dash-section-head">
                        <BookOpen size={18} color="#6366f1" />
                        <h2>My Courses</h2>
                        <Link to="/courses" className="dash-section-link">
                            View all <ArrowRight size={15} />
                        </Link>
                    </header>
                    <div className="card-grid">
                        {courses.slice(0, 4).map((course) => (
                            <Link key={course.id} to={`/course/${course.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                                <div className="glass-panel card">
                                    <h3>{course.title}</h3>
                                    <p>{course.code}</p>
                                </div>
                            </Link>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
};

export default Dashboard;
