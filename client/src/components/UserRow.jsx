import { useState } from 'react';
import { UserCheck, UserX, BookOpen, Check, AlertTriangle } from 'lucide-react';
import { api } from '../api';

/*
 * A student's enrolment decides everything they can see, so a student with no courses
 * selected opens onto an empty app and previously only their own password could fix it.
 * This lets an admin set it for them.
 */
const UserRow = ({ user, courses, onChanged }) => {
    const [editing, setEditing] = useState(false);
    const [selected, setSelected] = useState(user.selectedCourses || []);
    const [busy, setBusy] = useState(false);
    const [note, setNote] = useState(null);

    const isAdmin = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN';
    const enrolledCount = (user.selectedCourses || []).length;
    const stranded = !isAdmin && enrolledCount === 0;

    const toggleStatus = async () => {
        setBusy(true);
        try {
            await api.updateUser(user.id, { status: user.status === 'DISABLED' ? 'ACTIVE' : 'DISABLED' });
            onChanged?.();
        } catch (err) {
            setNote({ type: 'error', text: err.message });
        } finally {
            setBusy(false);
        }
    };

    const saveCourses = async () => {
        setBusy(true);
        setNote(null);
        try {
            await api.updateUser(user.id, { selectedCourses: selected });
            setNote({ type: 'success', text: 'Enrolment updated.' });
            setEditing(false);
            onChanged?.();
        } catch (err) {
            setNote({ type: 'error', text: err.message });
        } finally {
            setBusy(false);
        }
    };

    return (
        <div style={{
            padding: '0.9rem 1rem',
            borderRadius: '12px',
            background: 'rgba(255,255,255,0.03)',
            border: stranded ? '1px solid rgba(251,191,36,0.45)' : '1px solid var(--clr-border)'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <div style={{ minWidth: 0 }}>
                    <strong style={{ fontSize: '0.95rem' }}>{user.displayName || user.username}</strong>
                    <span style={{ fontSize: '0.8rem', color: 'var(--clr-text-muted)', marginLeft: '0.4rem' }}>@{user.username}</span>
                    <div style={{ fontSize: '0.78rem', color: 'var(--clr-text-muted)', marginTop: '0.2rem' }}>
                        Role <span style={{ color: isAdmin ? '#f59e0b' : '#34d399', fontWeight: 600 }}>{user.role}</span>
                        {' · '}Status {user.status || 'ACTIVE'}
                        {!isAdmin && <>{' · '}{enrolledCount} course{enrolledCount === 1 ? '' : 's'}</>}
                    </div>
                    {stranded && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.35rem', fontSize: '0.76rem', color: '#fbbf24' }}>
                            <AlertTriangle size={13} />
                            No courses selected — this student sees an empty app.
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                    {!isAdmin && (
                        <button onClick={() => setEditing((v) => !v)} className="nav-btn-ghost" disabled={busy}>
                            <BookOpen size={14} /> Courses
                        </button>
                    )}
                    <button
                        onClick={toggleStatus}
                        disabled={busy}
                        className="nav-btn-ghost"
                        style={{
                            color: user.status === 'DISABLED' ? '#34d399' : '#f87171',
                            borderColor: user.status === 'DISABLED' ? 'rgba(52,211,153,0.4)' : 'rgba(248,113,113,0.4)'
                        }}
                    >
                        {user.status === 'DISABLED' ? <UserCheck size={14} /> : <UserX size={14} />}
                        {user.status === 'DISABLED' ? 'Enable' : 'Disable'}
                    </button>
                </div>
            </div>

            {editing && (
                <div style={{ marginTop: '0.85rem', paddingTop: '0.85rem', borderTop: '1px solid var(--clr-border)' }}>
                    {courses.length === 0 ? (
                        <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--clr-text-muted)' }}>No courses exist yet.</p>
                    ) : (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                            {courses.map((c) => {
                                const on = selected.includes(c.id);
                                return (
                                    <button
                                        key={c.id}
                                        type="button"
                                        onClick={() => setSelected((prev) =>
                                            prev.includes(c.id) ? prev.filter((x) => x !== c.id) : [...prev, c.id])}
                                        aria-pressed={on}
                                        style={{
                                            display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                                            padding: '0.35rem 0.7rem', borderRadius: 'var(--radius-full)',
                                            fontSize: '0.8rem', font: 'inherit', cursor: 'pointer', color: 'white',
                                            background: on ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.04)',
                                            border: on ? '1px solid #6366f1' : '1px solid var(--clr-border)'
                                        }}
                                    >
                                        {on && <Check size={12} />}{c.title}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                    <button onClick={saveCourses} disabled={busy} className="btn-primary" style={{ marginTop: '0.75rem', padding: '0.4rem 1rem', fontSize: '0.83rem' }}>
                        {busy ? 'Saving…' : 'Save enrolment'}
                    </button>
                </div>
            )}

            {note && (
                <p style={{ margin: '0.5rem 0 0', fontSize: '0.8rem', color: note.type === 'success' ? '#34d399' : '#f87171' }}>
                    {note.text}
                </p>
            )}
        </div>
    );
};

export default UserRow;
