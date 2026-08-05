import { useState } from 'react';
import { Vote, CheckCircle2, BarChart3 } from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

/*
 * Results were revealed only after the viewer personally voted, and the "voted" flag
 * lived in component state — so it reset on every reload and an admin reviewing a poll
 * saw no numbers at all.
 *
 * Now: admins always see results, a student's vote is remembered across reloads, and
 * the tallies stay visible afterwards.
 */

const votedKey = (pollId) => `nptel_poll_voted_${pollId}`;

const PollCard = ({ poll, forceResults = false }) => {
    const { isAdmin } = useAuth();
    const [selectedOption, setSelectedOption] = useState(null);
    const [voted, setVoted] = useState(() => Boolean(localStorage.getItem(votedKey(poll.id))));
    const [options, setOptions] = useState(poll.options || []);
    const [totalVotes, setTotalVotes] = useState(
        poll.totalVotes ?? (poll.options || []).reduce((sum, o) => sum + (o.votes || 0), 0)
    );
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const showResults = voted || isAdmin || forceResults;

    const handleVote = async () => {
        if (!selectedOption) return;
        setLoading(true);
        setError('');
        try {
            const res = await api.votePoll(poll.id, selectedOption);
            if (res.options) setOptions(res.options);
            if (typeof res.totalVotes === 'number') setTotalVotes(res.totalVotes);
            localStorage.setItem(votedKey(poll.id), selectedOption);
            setVoted(true);
        } catch (err) {
            setError(err.message || 'Could not submit your vote.');
        } finally {
            setLoading(false);
        }
    };

    const leader = showResults
        ? options.reduce((best, o) => ((o.votes || 0) > (best?.votes || 0) ? o : best), null)
        : null;

    return (
        <div className="glass-panel" style={{
            padding: '1.15rem',
            borderRadius: '16px',
            marginBottom: '1rem',
            border: '1px solid var(--clr-border)'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem', flexWrap: 'wrap' }}>
                <Vote size={17} color="#a855f7" />
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#c084fc', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                    Community Poll
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--clr-text-muted)' }}>
                    {totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}
                </span>
                {isAdmin && !voted && (
                    <span style={{
                        marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                        fontSize: '0.7rem', fontWeight: 700, color: '#fbbf24',
                        background: 'rgba(251,191,36,0.15)', padding: '0.15rem 0.5rem', borderRadius: '5px'
                    }}>
                        <BarChart3 size={11} /> ADMIN VIEW
                    </span>
                )}
            </div>

            <h4 style={{ margin: '0 0 0.9rem 0', fontSize: '1.02rem', overflowWrap: 'anywhere' }}>{poll.question}</h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {options.map((opt) => {
                    const percentage = totalVotes > 0 ? Math.round(((opt.votes || 0) / totalVotes) * 100) : 0;
                    const isSelected = selectedOption === opt.id;
                    const isLeader = showResults && leader && opt.id === leader.id && totalVotes > 0;

                    return (
                        <div
                            key={opt.id}
                            onClick={() => !showResults && setSelectedOption(opt.id)}
                            style={{
                                position: 'relative',
                                padding: '0.65rem 0.85rem',
                                borderRadius: '10px',
                                background: 'rgba(255,255,255,0.03)',
                                border: isSelected ? '1.5px solid #a855f7'
                                    : isLeader ? '1px solid rgba(168,85,247,0.5)'
                                    : '1px solid var(--clr-border)',
                                cursor: showResults ? 'default' : 'pointer',
                                overflow: 'hidden'
                            }}
                        >
                            {showResults && (
                                <div style={{
                                    position: 'absolute',
                                    inset: '0 auto 0 0',
                                    width: `${percentage}%`,
                                    background: isLeader ? 'rgba(168, 85, 247, 0.32)' : 'rgba(168, 85, 247, 0.16)',
                                    transition: 'width 0.6s ease'
                                }} />
                            )}

                            <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem' }}>
                                <span style={{ fontSize: '0.88rem', color: 'white', overflowWrap: 'anywhere' }}>{opt.text}</span>
                                {showResults ? (
                                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#c084fc', whiteSpace: 'nowrap' }}>
                                        {percentage}% <span style={{ fontWeight: 400, color: 'var(--clr-text-muted)' }}>({opt.votes || 0})</span>
                                    </span>
                                ) : (
                                    <input
                                        type="radio"
                                        name={`poll_${poll.id}`}
                                        checked={isSelected}
                                        onChange={() => setSelectedOption(opt.id)}
                                    />
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {error && <p style={{ color: '#f87171', fontSize: '0.8rem', margin: '0.75rem 0 0' }}>{error}</p>}

            {!showResults ? (
                <button
                    onClick={handleVote}
                    disabled={!selectedOption || loading}
                    className="btn-primary"
                    style={{ marginTop: '0.9rem', width: '100%', padding: '0.55rem', fontSize: '0.88rem' }}
                >
                    {loading ? 'Submitting…' : 'Submit Vote'}
                </button>
            ) : voted ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.75rem', color: '#10b981', fontSize: '0.82rem' }}>
                    <CheckCircle2 size={15} />
                    <span>Thanks for voting!</span>
                </div>
            ) : null}
        </div>
    );
};

export default PollCard;
