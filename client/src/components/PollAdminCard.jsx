import { useState } from 'react';
import { Trash2, Users, BellRing, ChevronDown, ChevronUp, CheckCircle2, Clock } from 'lucide-react';
import { api } from '../api';
import PollCard from './PollCard';

/*
 * Admin wrapper around a poll: results, who has responded, a one-click reminder to the
 * ones who haven't, and deletion.
 *
 * Individual choices are deliberately not shown. The tallies already give the
 * distribution; naming who picked what turns an opinion poll into a per-student record.
 */
// Declared at module scope: a component defined inside a render body is a new type on
// every render, so React unmounts and remounts it (and loses any state) each time.
const NameList = ({ people, tone, icon: Icon, label }) => (
    <div style={{ marginTop: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem', color: tone, fontSize: '0.8rem', fontWeight: 700 }}>
            <Icon size={14} /> {label} ({people.length})
        </div>
        {people.length === 0 ? (
            <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--clr-text-muted)' }}>None.</p>
        ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                {people.map((p) => (
                    <span key={p.id} style={{
                        padding: '0.2rem 0.55rem',
                        borderRadius: 'var(--radius-full)',
                        fontSize: '0.78rem',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid var(--clr-border)'
                    }}>
                        {p.displayName || p.username}
                    </span>
                ))}
            </div>
        )}
    </div>
);

const PollAdminCard = ({ poll, onDeleted }) => {
    const [open, setOpen] = useState(false);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [busy, setBusy] = useState(false);
    const [note, setNote] = useState(null);

    const toggle = async () => {
        const next = !open;
        setOpen(next);
        if (next && !data) {
            setLoading(true);
            try {
                setData(await api.getPollResponses(poll.id));
            } catch (err) {
                setNote({ type: 'error', text: err.message });
            } finally {
                setLoading(false);
            }
        }
    };

    const remind = async () => {
        setBusy(true);
        setNote(null);
        try {
            const res = await api.remindPollNonResponders(poll.id);
            setNote({
                type: 'success',
                text: res.pending === 0
                    ? 'Everyone has already responded.'
                    : `Reminder sent to ${res.result?.success ?? 0} of ${res.pending} pending student(s) with alerts enabled.`
            });
        } catch (err) {
            setNote({ type: 'error', text: err.message });
        } finally {
            setBusy(false);
        }
    };

    const remove = async () => {
        if (!window.confirm(`Delete the poll "${poll.question}"? Its responses will be removed too.`)) return;
        setBusy(true);
        try {
            await api.deletePoll(poll.id);
            onDeleted?.(poll.id);
        } catch (err) {
            setNote({ type: 'error', text: err.message });
            setBusy(false);
        }
    };

    return (
        <div style={{ marginBottom: '1.25rem' }}>
            <PollCard poll={poll} forceResults />

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '-0.35rem' }}>
                <button onClick={toggle} className="nav-btn-ghost" aria-expanded={open}>
                    <Users size={14} /> Responses
                    {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                <button onClick={remind} disabled={busy} className="nav-btn-ghost" style={{ color: '#fbbf24', borderColor: 'rgba(251,191,36,0.4)' }}>
                    <BellRing size={14} /> {busy ? 'Working…' : 'Remind non-responders'}
                </button>
                <button onClick={remove} disabled={busy} className="nav-btn-ghost" style={{ color: '#f87171', borderColor: 'rgba(248,113,113,0.4)' }}>
                    <Trash2 size={14} /> Delete
                </button>
            </div>

            {note && (
                <p style={{ margin: '0.6rem 0 0', fontSize: '0.82rem', color: note.type === 'success' ? '#34d399' : '#f87171' }}>
                    {note.text}
                </p>
            )}

            {open && (
                <div className="glass-panel" style={{ marginTop: '0.7rem', padding: '0.9rem 1rem', borderRadius: '12px' }}>
                    {loading ? (
                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--clr-text-muted)' }}>Loading responses…</p>
                    ) : data ? (
                        <>
                            <NameList people={data.responded} tone="#34d399" icon={CheckCircle2} label="Responded" />
                            <NameList people={data.pending} tone="#fbbf24" icon={Clock} label="Still pending" />
                        </>
                    ) : (
                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--clr-text-muted)' }}>No data.</p>
                    )}
                </div>
            )}
        </div>
    );
};

export default PollAdminCard;
