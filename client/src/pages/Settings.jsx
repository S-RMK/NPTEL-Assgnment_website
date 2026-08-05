import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, BookOpen, Check, Bell, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import Spinner from '../components/Spinner';

/*
 * Course preferences were only settable during registration — AuthContext exposed
 * updatePreferences() but no screen ever called it, so enrolment was permanent.
 */
const Settings = () => {
    const { user, updatePreferences } = useAuth();
    const [courses, setCourses] = useState([]);
    const [selected, setSelected] = useState(user?.selectedCourses || []);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState(null);

    useEffect(() => {
        let cancelled = false;
        api.getCourses()
            .then((data) => { if (!cancelled) setCourses(data || []); })
            .catch((err) => { if (!cancelled) setStatus({ type: 'error', text: err.message }); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, []);

    // user resolves asynchronously on a hard refresh, so seed from it when it lands.
    useEffect(() => {
        if (user?.selectedCourses) setSelected(user.selectedCourses);
    }, [user]);

    const toggle = (courseId) => {
        setStatus(null);
        setSelected((prev) =>
            prev.includes(courseId) ? prev.filter((id) => id !== courseId) : [...prev, courseId]
        );
    };

    const save = async () => {
        setSaving(true);
        setStatus(null);
        try {
            await updatePreferences(selected);
            setStatus({ type: 'success', text: 'Your enrolled courses have been updated.' });
        } catch (err) {
            setStatus({ type: 'error', text: err.message || 'Could not save your preferences.' });
        } finally {
            setSaving(false);
        }
    };

    const unchanged =
        selected.length === (user?.selectedCourses || []).length &&
        selected.every((id) => (user?.selectedCourses || []).includes(id));

    return (
        <div style={{ maxWidth: '42rem', margin: '0 auto', paddingBottom: '3rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', margin: '0.5rem 0 1.25rem' }}>
                <SettingsIcon size={22} color="#818cf8" />
                <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Settings</h1>
            </div>

            <section className="glass-panel" style={{ padding: '1.25rem', borderRadius: '16px', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <User size={18} color="#a78bfa" />
                    <h2 style={{ margin: 0, fontSize: '1rem' }}>Account</h2>
                </div>
                <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '0.4rem 1rem', fontSize: '0.9rem' }}>
                    <dt style={{ color: 'var(--clr-text-muted)' }}>Name</dt>
                    <dd style={{ margin: 0 }}>{user?.displayName || '—'}</dd>
                    <dt style={{ color: 'var(--clr-text-muted)' }}>Username</dt>
                    <dd style={{ margin: 0 }}>@{user?.username}</dd>
                    <dt style={{ color: 'var(--clr-text-muted)' }}>Role</dt>
                    <dd style={{ margin: 0 }}>{user?.role || 'STUDENT'}</dd>
                </dl>
            </section>

            <section className="glass-panel" style={{ padding: '1.25rem', borderRadius: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                    <BookOpen size={18} color="#34d399" />
                    <h2 style={{ margin: 0, fontSize: '1rem' }}>My enrolled courses</h2>
                </div>
                <p style={{ margin: '0 0 1rem', color: 'var(--clr-text-muted)', fontSize: '0.85rem' }}>
                    Your dashboard, deadline countdowns and push alerts are filtered to these courses.
                </p>

                {loading ? (
                    <Spinner label="Loading courses…" compact />
                ) : courses.length === 0 ? (
                    <p style={{ color: 'var(--clr-text-muted)', fontSize: '0.9rem', margin: 0 }}>
                        No courses have been published yet.
                    </p>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {courses.map((course) => {
                            const isOn = selected.includes(course.id);
                            return (
                                <button
                                    key={course.id}
                                    type="button"
                                    onClick={() => toggle(course.id)}
                                    aria-pressed={isOn}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        gap: '0.75rem',
                                        padding: '0.75rem 0.9rem',
                                        borderRadius: '10px',
                                        textAlign: 'left',
                                        cursor: 'pointer',
                                        color: 'white',
                                        font: 'inherit',
                                        background: isOn ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255,255,255,0.03)',
                                        border: isOn ? '1px solid #6366f1' : '1px solid var(--clr-border)'
                                    }}
                                >
                                    <span style={{ fontSize: '0.9rem' }}>{course.title}</span>
                                    <span style={{
                                        flexShrink: 0,
                                        width: '22px',
                                        height: '22px',
                                        borderRadius: '6px',
                                        display: 'grid',
                                        placeItems: 'center',
                                        background: isOn ? '#6366f1' : 'transparent',
                                        border: isOn ? 'none' : '1px solid var(--clr-border)'
                                    }}>
                                        {isOn && <Check size={14} color="white" />}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                )}

                {status && (
                    <p style={{
                        margin: '1rem 0 0',
                        fontSize: '0.85rem',
                        color: status.type === 'success' ? '#34d399' : '#f87171'
                    }}>
                        {status.text}
                    </p>
                )}

                <button
                    onClick={save}
                    disabled={saving || unchanged || loading}
                    className="btn-primary"
                    style={{
                        marginTop: '1.25rem',
                        width: '100%',
                        padding: '0.7rem',
                        fontSize: '0.95rem',
                        borderRadius: '12px',
                        opacity: saving || unchanged || loading ? 0.55 : 1,
                        cursor: saving || unchanged || loading ? 'default' : 'pointer'
                    }}
                >
                    {saving ? 'Saving…' : unchanged ? 'No changes to save' : `Save ${selected.length} course${selected.length === 1 ? '' : 's'}`}
                </button>
            </section>

            <section className="glass-panel" style={{ padding: '1.25rem', borderRadius: '16px', marginTop: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                    <Bell size={18} color="#fbbf24" />
                    <h2 style={{ margin: 0, fontSize: '1rem' }}>Notifications</h2>
                </div>
                <p style={{ margin: 0, color: 'var(--clr-text-muted)', fontSize: '0.85rem' }}>
                    {typeof Notification !== 'undefined' && Notification.permission === 'granted'
                        ? 'Deadline and answer alerts are enabled on this device.'
                        : 'Enable alerts from the banner on your dashboard to get deadline reminders.'}
                </p>
            </section>
        </div>
    );
};

export default Settings;
