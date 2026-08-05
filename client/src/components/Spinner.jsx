/*
 * Loading affordances.
 *
 * Pages previously rendered an empty container while fetching, so tapping through to a
 * week looked like nothing had happened and users tapped again. Skeletons are preferred
 * over a bare spinner where the final shape is known — they hold the layout steady and
 * make the wait feel shorter.
 */

const Spinner = ({ label = 'Loading…', compact = false }) => (
    <div
        role="status"
        aria-live="polite"
        style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem',
            padding: compact ? '1.5rem' : '3rem 1rem',
            color: 'var(--clr-text-muted)'
        }}
    >
        <span className="spinner" />
        <span style={{ fontSize: '0.85rem' }}>{label}</span>
    </div>
);

export const SkeletonCards = ({ count = 6 }) => (
    <div className="card-grid" aria-hidden="true">
        {Array.from({ length: count }, (_, i) => (
            <div key={i} className="glass-panel card skeleton-card">
                <div className="skeleton skeleton-line" style={{ width: '65%', height: '1.25rem' }} />
                <div className="skeleton skeleton-line" style={{ width: '40%', height: '0.85rem' }} />
            </div>
        ))}
    </div>
);

export const SkeletonRows = ({ count = 5 }) => (
    <div className="answer-list" aria-hidden="true">
        {Array.from({ length: count }, (_, i) => (
            <div key={i} className="answer-item">
                <div className="skeleton skeleton-line" style={{ width: '2rem', height: '1rem' }} />
                <div className="skeleton skeleton-line" style={{ flex: 1, height: '1rem', marginLeft: '1rem' }} />
            </div>
        ))}
    </div>
);

export default Spinner;
