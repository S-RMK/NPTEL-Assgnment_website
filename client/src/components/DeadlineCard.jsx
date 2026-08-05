import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

/*
 * The countdown used to be computed once during render, so it froze at whatever the
 * value was when the page loaded and only moved on a refresh. It also reported
 * "Due Tomorrow" for anything under 24 hours — including 20 minutes away.
 */

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const describe = (msLeft) => {
    if (msLeft <= 0) return { text: 'Expired', colour: '#ef4444', urgent: false };

    const days = Math.floor(msLeft / DAY);
    const hours = Math.floor((msLeft % DAY) / HOUR);
    const minutes = Math.floor((msLeft % HOUR) / MINUTE);
    const seconds = Math.floor((msLeft % MINUTE) / SECOND);

    // Green with a day or more left, amber inside 24h, red inside the final hour.
    if (msLeft < HOUR) {
        return { text: `${minutes}m ${seconds}s left`, colour: '#ef4444', urgent: true };
    }
    if (msLeft < DAY) {
        return { text: `${hours}h ${minutes}m left`, colour: '#f59e0b', urgent: true };
    }
    return { text: `${days}d ${hours}h left`, colour: '#10b981', urgent: false };
};

const DeadlineCard = ({ deadline }) => {
    const dueDate = new Date(deadline.dueDate);
    const valid = !Number.isNaN(dueDate.getTime());
    const [msLeft, setMsLeft] = useState(() => dueDate - new Date());

    const finalHour = msLeft < HOUR;

    useEffect(() => {
        if (!valid || dueDate - new Date() <= 0) return;

        // Tick every second inside the last hour so the countdown visibly moves; once a
        // minute otherwise, to avoid needless re-renders on a deadline days away.
        const id = setInterval(() => setMsLeft(dueDate - new Date()), finalHour ? SECOND : MINUTE);
        return () => clearInterval(id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [deadline.dueDate, valid, finalHour]);

    if (!valid) return null;

    const status = describe(msLeft);

    return (
        <div className="glass-panel deadline-card" style={{ borderLeft: `4px solid ${status.colour}` }}>
            <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.3rem' }}>
                    <Clock size={14} color={status.colour} />
                    <span
                        className={status.urgent ? 'deadline-badge deadline-badge-pulse' : 'deadline-badge'}
                        style={{ background: `${status.colour}22`, color: status.colour }}
                    >
                        {status.text}
                    </span>
                </div>
                <h4 style={{ margin: '0.15rem 0', fontSize: '1rem', overflowWrap: 'anywhere' }}>{deadline.title}</h4>
                <span style={{ fontSize: '0.78rem', color: 'var(--clr-text-muted)' }}>
                    Due {dueDate.toLocaleString(undefined, {
                        weekday: 'short', day: 'numeric', month: 'short',
                        hour: '2-digit', minute: '2-digit'
                    })}
                </span>
            </div>

            {deadline.weekId && (
                <Link
                    to={`/week/${deadline.weekId}`}
                    className="btn-primary"
                    style={{ padding: '0.4rem 0.85rem', fontSize: '0.82rem', textDecoration: 'none', whiteSpace: 'nowrap' }}
                >
                    View Answers
                </Link>
            )}
        </div>
    );
};

export default DeadlineCard;
