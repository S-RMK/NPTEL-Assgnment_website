import { Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

const DeadlineCard = ({ deadline }) => {
    const now = new Date();
    const dueDate = new Date(deadline.dueDate);
    const diffMs = dueDate - now;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    const remainingHours = diffHours % 24;

    let badgeColor = '#10b981'; // Green
    let statusText = `${diffDays} Days ${remainingHours} Hours`;

    if (diffMs <= 0) {
        badgeColor = '#ef4444'; // Red
        statusText = 'Expired';
    } else if (diffHours <= 24) {
        badgeColor = '#f59e0b'; // Amber
        statusText = diffHours <= 1 ? 'Due in 1 Hour!' : 'Due Tomorrow';
    }

    return (
        <div className="glass-panel" style={{
            padding: '1.25rem',
            borderRadius: '16px',
            borderLeft: `5px solid ${badgeColor}`,
            marginBottom: '1rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.75rem'
        }}>
            <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <Clock size={16} color={badgeColor} />
                    <span style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        padding: '0.15rem 0.5rem',
                        borderRadius: '4px',
                        background: `${badgeColor}22`,
                        color: badgeColor
                    }}>
                        {statusText}
                    </span>
                </div>
                <h4 style={{ margin: '0.25rem 0', fontSize: '1.05rem' }}>{deadline.title}</h4>
                <span style={{ fontSize: '0.8rem', color: 'var(--clr-text-muted)' }}>
                    Due: {dueDate.toLocaleString()}
                </span>
            </div>

            {deadline.weekId && (
                <Link to={`/week/${deadline.weekId}`} className="btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', textDecoration: 'none' }}>
                    View Answers
                </Link>
            )}
        </div>
    );
};

export default DeadlineCard;
