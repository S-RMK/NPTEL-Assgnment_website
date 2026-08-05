import { useState } from 'react';
import { Vote, CheckCircle2 } from 'lucide-react';
import { api } from '../api';

const PollCard = ({ poll }) => {
    const [selectedOption, setSelectedOption] = useState(null);
    const [voted, setVoted] = useState(false);
    const [options, setOptions] = useState(poll.options || []);
    const [totalVotes, setTotalVotes] = useState(poll.totalVotes || 0);
    const [loading, setLoading] = useState(false);

    const handleVote = async () => {
        if (!selectedOption) return;
        setLoading(true);
        try {
            const res = await api.votePoll(poll.id, selectedOption);
            setOptions(res.options);
            setTotalVotes(res.totalVotes);
            setVoted(true);
        } catch (err) {
            alert('Failed to submit vote: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="glass-panel" style={{
            padding: '1.25rem',
            borderRadius: '16px',
            marginBottom: '1rem',
            border: '1px solid var(--clr-border)'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <Vote size={18} color="#a855f7" />
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#c084fc', textTransform: 'uppercase' }}>
                    Community Poll ({totalVotes} votes)
                </span>
            </div>

            <h4 style={{ margin: '0 0 1rem 0', fontSize: '1.05rem' }}>{poll.question}</h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {options.map((opt) => {
                    const percentage = totalVotes > 0 ? Math.round(((opt.votes || 0) / totalVotes) * 100) : 0;
                    const isSelected = selectedOption === opt.id;

                    return (
                        <div
                            key={opt.id}
                            onClick={() => !voted && setSelectedOption(opt.id)}
                            style={{
                                position: 'relative',
                                padding: '0.75rem 1rem',
                                borderRadius: '10px',
                                background: 'rgba(255,255,255,0.03)',
                                border: isSelected ? '1.5px solid #a855f7' : '1px solid var(--clr-border)',
                                cursor: voted ? 'default' : 'pointer',
                                overflow: 'hidden',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            {/* Percentage fill bar after voting */}
                            {voted && (
                                <div style={{
                                    position: 'absolute',
                                    left: 0,
                                    top: 0,
                                    bottom: 0,
                                    width: `${percentage}%`,
                                    background: 'rgba(168, 85, 247, 0.2)',
                                    transition: 'width 0.6s ease'
                                }} />
                            )}

                            <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.9rem', color: 'white' }}>{opt.text}</span>
                                {voted ? (
                                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#c084fc' }}>{percentage}%</span>
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

            {!voted ? (
                <button
                    onClick={handleVote}
                    disabled={!selectedOption || loading}
                    className="btn-primary"
                    style={{ marginTop: '1rem', width: '100%', padding: '0.55rem', fontSize: '0.9rem' }}
                >
                    {loading ? 'Submitting...' : 'Submit Vote'}
                </button>
            ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.8rem', color: '#10b981', fontSize: '0.85rem' }}>
                    <CheckCircle2 size={16} />
                    <span>Thanks for voting!</span>
                </div>
            )}
        </div>
    );
};

export default PollCard;
