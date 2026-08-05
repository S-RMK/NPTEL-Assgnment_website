import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import {
    LayoutDashboard, Users, Bell, Vote, Calendar, Megaphone, ShieldAlert,
    Plus, Send, RefreshCw, CheckCircle, Search, UserCheck, UserX
} from 'lucide-react';

const AdminDashboard = () => {
    const { isAdmin, user } = useAuth();
    const [activeTab, setActiveTab] = useState('overview');

    // Metrics & Data States
    const [analytics, setAnalytics] = useState({});
    const [usersList, setUsersList] = useState([]);
    const [courses, setCourses] = useState([]);
    const [auditLogs, setAuditLogs] = useState([]);

    // Push Form State
    const [pushData, setPushData] = useState({ title: '', body: '', targetUrl: '/', courseId: 'all' });
    const [pushSending, setPushSending] = useState(false);

    // Poll Form State
    const [pollQuestion, setPollQuestion] = useState('');
    const [pollOptions, setPollOptions] = useState(['', '']);
    const [pollCourseId, setPollCourseId] = useState('all');

    // Deadline Form State
    const [deadlineTitle, setDeadlineTitle] = useState('');
    const [deadlineCourseId, setDeadlineCourseId] = useState('all');
    const [deadlineDate, setDeadlineDate] = useState('');

    // Announcement Form State
    const [annTitle, setAnnTitle] = useState('');
    const [annContent, setAnnContent] = useState('');
    const [annPinned, setAnnPinned] = useState(false);

    useEffect(() => {
        if (isAdmin) {
            loadAdminData();
        }
    }, [isAdmin]);

    const loadAdminData = async () => {
        try {
            const [analyticsRes, usersRes, coursesRes, logsRes] = await Promise.all([
                api.getAdminAnalytics(),
                api.getAdminUsers(),
                api.getCourses(),
                api.getAuditLogs()
            ]);
            setAnalytics(analyticsRes || {});
            setUsersList(usersRes || []);
            setCourses(coursesRes || []);
            setAuditLogs(logsRes || []);
        } catch (err) {
            console.error('Failed to load admin data:', err);
        }
    };

    const handleSendPush = async (e) => {
        e.preventDefault();
        setPushSending(true);
        try {
            const res = await api.sendPushNotification(pushData);
            alert(`Push Dispatch Complete! Delivered to ${res.result.success} devices.`);
            setPushData({ title: '', body: '', targetUrl: '/', courseId: 'all' });
            loadAdminData();
        } catch (err) {
            alert('Push failed: ' + err.message);
        } finally {
            setPushSending(false);
        }
    };

    const handleCreatePoll = async (e) => {
        e.preventDefault();
        const validOptions = pollOptions.filter(o => o.trim());
        if (validOptions.length < 2) {
            alert('Please provide at least 2 non-empty poll options');
            return;
        }
        try {
            await api.createPoll({ question: pollQuestion, options: validOptions, courseId: pollCourseId });
            alert('Poll created successfully!');
            setPollQuestion('');
            setPollOptions(['', '']);
            loadAdminData();
        } catch (err) {
            alert('Failed to create poll: ' + err.message);
        }
    };

    const handleCreateDeadline = async (e) => {
        e.preventDefault();
        try {
            await api.createDeadline({ title: deadlineTitle, courseId: deadlineCourseId, dueDate: deadlineDate });
            alert('Deadline scheduled!');
            setDeadlineTitle('');
            setDeadlineDate('');
            loadAdminData();
        } catch (err) {
            alert('Failed to create deadline: ' + err.message);
        }
    };

    const handleCreateAnnouncement = async (e) => {
        e.preventDefault();
        try {
            await api.createAnnouncement({ title: annTitle, content: annContent, isPinned: annPinned });
            alert('Announcement published!');
            setAnnTitle('');
            setAnnContent('');
            setAnnPinned(false);
            loadAdminData();
        } catch (err) {
            alert('Failed to publish announcement: ' + err.message);
        }
    };

    const toggleUserStatus = async (userId, currentStatus) => {
        const newStatus = currentStatus === 'DISABLED' ? 'ACTIVE' : 'DISABLED';
        try {
            await api.updateUser(userId, { status: newStatus });
            loadAdminData();
        } catch (err) {
            alert('Failed to update user status: ' + err.message);
        }
    };

    if (!isAdmin) {
        return (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#f87171' }}>
                <ShieldAlert size={48} style={{ marginBottom: '1rem' }} />
                <h2>Access Denied</h2>
                <p>You must be logged in with Administrator privileges to view this portal.</p>
            </div>
        );
    }

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '1.5rem', marginTop: '1rem' }}>
            {/* Admin Sidebar Navigation */}
            <div className="glass-panel" style={{ padding: '1rem', borderRadius: '20px', height: 'fit-content' }}>
                <div style={{ padding: '0.5rem 0.75rem', marginBottom: '1rem' }}>
                    <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--clr-text-muted)', fontWeight: 700 }}>Admin Portal</span>
                    <h3 style={{ margin: '0.2rem 0 0 0', fontSize: '1.1rem' }}>Control Center</h3>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {[
                        { id: 'overview', label: 'Overview', icon: LayoutDashboard },
                        { id: 'users', label: 'User Management', icon: Users },
                        { id: 'notifications', label: 'Push Notifications', icon: Bell },
                        { id: 'polls', label: 'Poll Manager', icon: Vote },
                        { id: 'deadlines', label: 'Deadlines Engine', icon: Calendar },
                        { id: 'announcements', label: 'Announcements', icon: Megaphone },
                        { id: 'logs', label: 'Audit Logs', icon: ShieldAlert }
                    ].map(tab => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    padding: '0.7rem 1rem',
                                    borderRadius: '12px',
                                    background: isActive ? 'var(--grad-main)' : 'transparent',
                                    border: 'none',
                                    color: isActive ? 'white' : 'var(--clr-text-muted)',
                                    cursor: 'pointer',
                                    fontWeight: isActive ? 600 : 400,
                                    textAlign: 'left'
                                }}
                            >
                                <Icon size={18} />
                                <span style={{ fontSize: '0.9rem' }}>{tab.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Main Content Area */}
            <div>
                {/* Overview Tab */}
                {activeTab === 'overview' && (
                    <div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                            <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: '16px' }}>
                                <span style={{ fontSize: '0.8rem', color: 'var(--clr-text-muted)' }}>Registered Users</span>
                                <h2 style={{ margin: '0.3rem 0 0 0', fontSize: '2rem', color: '#818cf8' }}>{analytics.totalUsers || 0}</h2>
                            </div>
                            <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: '16px' }}>
                                <span style={{ fontSize: '0.8rem', color: 'var(--clr-text-muted)' }}>Active Courses</span>
                                <h2 style={{ margin: '0.3rem 0 0 0', fontSize: '2rem', color: '#34d399' }}>{analytics.totalCourses || 0}</h2>
                            </div>
                            <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: '16px' }}>
                                <span style={{ fontSize: '0.8rem', color: 'var(--clr-text-muted)' }}>Push Subscribers</span>
                                <h2 style={{ margin: '0.3rem 0 0 0', fontSize: '2rem', color: '#fbbf24' }}>{analytics.totalPushSubscribers || 0}</h2>
                            </div>
                            <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: '16px' }}>
                                <span style={{ fontSize: '0.8rem', color: 'var(--clr-text-muted)' }}>Polls Created</span>
                                <h2 style={{ margin: '0.3rem 0 0 0', fontSize: '2rem', color: '#c084fc' }}>{analytics.totalPolls || 0}</h2>
                            </div>
                        </div>

                        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '20px' }}>
                            <h3 style={{ margin: '0 0 1rem 0' }}>Quick Push Notification Dispatcher</h3>
                            <form onSubmit={handleSendPush}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                    <div>
                                        <label style={{ fontSize: '0.85rem', color: 'var(--clr-text-muted)' }}>Title</label>
                                        <input
                                            type="text"
                                            value={pushData.title}
                                            onChange={e => setPushData({ ...pushData, title: e.target.value })}
                                            placeholder="e.g. Week 4 Answers Uploaded!"
                                            required
                                            style={{ width: '100%', padding: '0.65rem', borderRadius: '10px', background: 'var(--clr-bg-card)', border: '1px solid var(--clr-border)', color: 'white' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.85rem', color: 'var(--clr-text-muted)' }}>Target Course</label>
                                        <select
                                            value={pushData.courseId}
                                            onChange={e => setPushData({ ...pushData, courseId: e.target.value })}
                                            style={{ width: '100%', padding: '0.65rem', borderRadius: '10px', background: 'var(--clr-bg-card)', border: '1px solid var(--clr-border)', color: 'white' }}
                                        >
                                            <option value="all">All Enrolled Students</option>
                                            {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div style={{ marginBottom: '1rem' }}>
                                    <label style={{ fontSize: '0.85rem', color: 'var(--clr-text-muted)' }}>Message Body</label>
                                    <textarea
                                        value={pushData.body}
                                        onChange={e => setPushData({ ...pushData, body: e.target.value })}
                                        placeholder="Enter push notification text body..."
                                        required
                                        rows={3}
                                        style={{ width: '100%', padding: '0.65rem', borderRadius: '10px', background: 'var(--clr-bg-card)', border: '1px solid var(--clr-border)', color: 'white' }}
                                    />
                                </div>
                                <button type="submit" disabled={pushSending} className="btn-primary" style={{ padding: '0.65rem 1.5rem' }}>
                                    <Send size={16} style={{ marginRight: '0.5rem' }} />
                                    {pushSending ? 'Dispatching...' : 'Dispatch Web Push'}
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                {/* Users Management Tab */}
                {activeTab === 'users' && (
                    <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '20px' }}>
                        <h3 style={{ margin: '0 0 1rem 0' }}>User Management ({usersList.length} total)</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {usersList.map(u => (
                                <div key={u.id} style={{
                                    padding: '1rem',
                                    borderRadius: '12px',
                                    background: 'rgba(255,255,255,0.03)',
                                    border: '1px solid var(--clr-border)',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}>
                                    <div>
                                        <strong style={{ fontSize: '1rem' }}>{u.displayName || u.username}</strong>
                                        <span style={{ fontSize: '0.8rem', color: 'var(--clr-text-muted)', marginLeft: '0.5rem' }}>@{u.username}</span>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--clr-text-muted)', marginTop: '0.2rem' }}>
                                            Role: <span style={{ color: u.role === 'ADMIN' ? '#f59e0b' : '#34d399', fontWeight: 600 }}>{u.role}</span> | Status: {u.status || 'ACTIVE'}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => toggleUserStatus(u.id, u.status)}
                                        style={{
                                            padding: '0.4rem 0.8rem',
                                            borderRadius: '8px',
                                            border: 'none',
                                            background: u.status === 'DISABLED' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                                            color: u.status === 'DISABLED' ? '#34d399' : '#f87171',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.4rem',
                                            fontSize: '0.85rem'
                                        }}
                                    >
                                        {u.status === 'DISABLED' ? <UserCheck size={16} /> : <UserX size={16} />}
                                        {u.status === 'DISABLED' ? 'Enable' : 'Disable'}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Polls Tab */}
                {activeTab === 'polls' && (
                    <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '20px' }}>
                        <h3 style={{ margin: '0 0 1rem 0' }}>Create Community Poll</h3>
                        <form onSubmit={handleCreatePoll}>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ fontSize: '0.85rem', color: 'var(--clr-text-muted)' }}>Poll Question</label>
                                <input
                                    type="text"
                                    value={pollQuestion}
                                    onChange={e => setPollQuestion(e.target.value)}
                                    placeholder="e.g. Rate difficulty of Week 4 Assignment"
                                    required
                                    style={{ width: '100%', padding: '0.65rem', borderRadius: '10px', background: 'var(--clr-bg-card)', border: '1px solid var(--clr-border)', color: 'white' }}
                                />
                            </div>

                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ fontSize: '0.85rem', color: 'var(--clr-text-muted)' }}>Options</label>
                                {pollOptions.map((opt, idx) => (
                                    <input
                                        key={idx}
                                        type="text"
                                        value={opt}
                                        onChange={e => {
                                            const newOpts = [...pollOptions];
                                            newOpts[idx] = e.target.value;
                                            setPollOptions(newOpts);
                                        }}
                                        placeholder={`Option ${idx + 1}`}
                                        style={{ width: '100%', padding: '0.65rem', borderRadius: '10px', background: 'var(--clr-bg-card)', border: '1px solid var(--clr-border)', color: 'white', marginBottom: '0.5rem' }}
                                    />
                                ))}
                                <button
                                    type="button"
                                    onClick={() => setPollOptions([...pollOptions, ''])}
                                    style={{ background: 'transparent', border: '1px dashed var(--clr-border)', color: '#818cf8', padding: '0.4rem 0.8rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem' }}
                                >
                                    + Add Option
                                </button>
                            </div>

                            <button type="submit" className="btn-primary" style={{ padding: '0.65rem 1.5rem' }}>Publish Poll</button>
                        </form>
                    </div>
                )}

                {/* Deadlines Tab */}
                {activeTab === 'deadlines' && (
                    <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '20px' }}>
                        <h3 style={{ margin: '0 0 1rem 0' }}>Schedule Course Deadline</h3>
                        <form onSubmit={handleCreateDeadline}>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ fontSize: '0.85rem', color: 'var(--clr-text-muted)' }}>Deadline Title</label>
                                <input
                                    type="text"
                                    value={deadlineTitle}
                                    onChange={e => setDeadlineTitle(e.target.value)}
                                    placeholder="e.g. Cloud Computing Week 4 Submission"
                                    required
                                    style={{ width: '100%', padding: '0.65rem', borderRadius: '10px', background: 'var(--clr-bg-card)', border: '1px solid var(--clr-border)', color: 'white' }}
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                <div>
                                    <label style={{ fontSize: '0.85rem', color: 'var(--clr-text-muted)' }}>Course Target</label>
                                    <select
                                        value={deadlineCourseId}
                                        onChange={e => setDeadlineCourseId(e.target.value)}
                                        style={{ width: '100%', padding: '0.65rem', borderRadius: '10px', background: 'var(--clr-bg-card)', border: '1px solid var(--clr-border)', color: 'white' }}
                                    >
                                        <option value="all">All Courses</option>
                                        {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.85rem', color: 'var(--clr-text-muted)' }}>Due Date & Time</label>
                                    <input
                                        type="datetime-local"
                                        value={deadlineDate}
                                        onChange={e => setDeadlineDate(e.target.value)}
                                        required
                                        style={{ width: '100%', padding: '0.65rem', borderRadius: '10px', background: 'var(--clr-bg-card)', border: '1px solid var(--clr-border)', color: 'white' }}
                                    />
                                </div>
                            </div>

                            <button type="submit" className="btn-primary" style={{ padding: '0.65rem 1.5rem' }}>Set Deadline</button>
                        </form>
                    </div>
                )}

                {/* Announcements Tab */}
                {activeTab === 'announcements' && (
                    <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '20px' }}>
                        <h3 style={{ margin: '0 0 1rem 0' }}>Publish Announcement</h3>
                        <form onSubmit={handleCreateAnnouncement}>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ fontSize: '0.85rem', color: 'var(--clr-text-muted)' }}>Title</label>
                                <input
                                    type="text"
                                    value={annTitle}
                                    onChange={e => setAnnTitle(e.target.value)}
                                    placeholder="e.g. Exam Registration Extended"
                                    required
                                    style={{ width: '100%', padding: '0.65rem', borderRadius: '10px', background: 'var(--clr-bg-card)', border: '1px solid var(--clr-border)', color: 'white' }}
                                />
                            </div>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ fontSize: '0.85rem', color: 'var(--clr-text-muted)' }}>Content</label>
                                <textarea
                                    value={annContent}
                                    onChange={e => setAnnContent(e.target.value)}
                                    placeholder="Announcement details..."
                                    required
                                    rows={4}
                                    style={{ width: '100%', padding: '0.65rem', borderRadius: '10px', background: 'var(--clr-bg-card)', border: '1px solid var(--clr-border)', color: 'white' }}
                                />
                            </div>
                            <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <input
                                    type="checkbox"
                                    id="pinAnn"
                                    checked={annPinned}
                                    onChange={e => setAnnPinned(e.target.checked)}
                                />
                                <label htmlFor="pinAnn" style={{ fontSize: '0.9rem', color: 'white', cursor: 'pointer' }}>Pin to top of Dashboard</label>
                            </div>
                            <button type="submit" className="btn-primary" style={{ padding: '0.65rem 1.5rem' }}>Publish Announcement</button>
                        </form>
                    </div>
                )}

                {/* Audit Logs Tab */}
                {activeTab === 'logs' && (
                    <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '20px' }}>
                        <h3 style={{ margin: '0 0 1rem 0' }}>Security Audit Logs ({auditLogs.length})</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '450px', overflowY: 'auto' }}>
                            {auditLogs.map(log => (
                                <div key={log.id} style={{
                                    padding: '0.75rem 1rem',
                                    borderRadius: '10px',
                                    background: 'rgba(255,255,255,0.02)',
                                    border: '1px solid var(--clr-border)',
                                    fontSize: '0.85rem'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#a78bfa', fontWeight: 600 }}>
                                        <span>[{log.action}] by {log.actorRole} ({log.actorId})</span>
                                        <span style={{ color: 'var(--clr-text-muted)', fontSize: '0.75rem' }}>{new Date(log.timestamp).toLocaleString()}</span>
                                    </div>
                                    <p style={{ margin: '0.2rem 0 0 0', color: 'var(--clr-text-muted)' }}>{log.details}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminDashboard;
