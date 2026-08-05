import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';

// Previously any unknown path rendered a blank page under the navbar, because there was
// no catch-all route.
const NotFound = () => (
    <div className="glass-panel" style={{
        maxWidth: '30rem',
        margin: '3rem auto',
        padding: '2.5rem 2rem',
        borderRadius: '20px',
        textAlign: 'center'
    }}>
        <Compass size={40} color="#818cf8" style={{ marginBottom: '0.75rem' }} />
        <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.3rem' }}>Page not found</h2>
        <p style={{ margin: '0 0 1.5rem', color: 'var(--clr-text-muted)', fontSize: '0.9rem' }}>
            That link doesn't lead anywhere in NPTEL Answers.
        </p>
        <Link to="/" className="btn-primary" style={{ textDecoration: 'none', padding: '0.6rem 1.4rem' }}>
            Back to dashboard
        </Link>
    </div>
);

export default NotFound;
