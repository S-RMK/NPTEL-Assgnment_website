import { useEffect, useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { api } from '../api';
import { Plus, ArrowLeft, Trash2, FileQuestion } from 'lucide-react';
import { SkeletonRows } from '../components/Spinner';

const Week = () => {
    const { weekId } = useParams();
    const { isEditMode } = useApp();
    const navigate = useNavigate();
    const [answers, setAnswers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);

    const [newQuestionNo, setNewQuestionNo] = useState('');
    const [newAnswerText, setNewAnswerText] = useState('');

    const loadAnswers = async () => {
        setLoading(true);
        try {
            const data = await api.getAnswers(weekId);
            setAnswers(Array.isArray(data) ? data : []);
            setError('');
        } catch (err) {
            console.error('Error loading answers:', err);
            setError(err.message || 'Could not load answers.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAnswers();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [weekId]);

    // Sort once per data change instead of mutating `answers` in place during render,
    // which is what the previous inline .sort() did.
    const sorted = useMemo(
        () => [...answers].sort((a, b) => Number(a.questionNo) - Number(b.questionNo)),
        [answers]
    );

    // Suggest the next question number without an effect + setState round-trip.
    const nextQuestionNo = useMemo(
        () => (answers.length ? Math.max(...answers.map((a) => Number(a.questionNo || 0))) + 1 : 1),
        [answers]
    );
    const questionNoValue = newQuestionNo === '' ? nextQuestionNo : newQuestionNo;

    const handleAddAnswer = async (e) => {
        e.preventDefault();
        if (!questionNoValue || !newAnswerText.trim()) return;
        setSaving(true);
        try {
            await api.addAnswer(weekId, {
                questionNo: parseInt(questionNoValue, 10),
                text: newAnswerText.trim()
            });
            setNewAnswerText('');
            setNewQuestionNo('');
            await loadAnswers();
        } catch (err) {
            alert(err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this answer?')) return;
        try {
            await api.deleteAnswer(id);
            await loadAnswers();
        } catch (err) {
            alert(err.message);
        }
    };

    return (
        <div style={{ paddingBottom: '3rem' }}>
            <div className="page-head">
                {/* Goes back to the course rather than always jumping to the dashboard. */}
                <button onClick={() => navigate(-1)} className="btn-icon" aria-label="Go back">
                    <ArrowLeft size={19} />
                </button>
                <h1 className="page-title" style={{ fontSize: '1.5rem' }}>Answers</h1>
                {!loading && sorted.length > 0 && (
                    <span className="count-pill">{sorted.length} questions</span>
                )}
            </div>

            <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: 'var(--radius-md)' }}>
                {loading ? (
                    <SkeletonRows count={6} />
                ) : error ? (
                    <div className="empty-state">
                        <p style={{ color: '#f87171' }}>{error}</p>
                        <button className="btn-primary" style={{ padding: '0.5rem 1.2rem' }} onClick={loadAnswers}>Retry</button>
                    </div>
                ) : sorted.length === 0 ? (
                    <div className="empty-state">
                        <FileQuestion size={32} color="#6366f1" />
                        <p>No answers have been posted for this week yet.</p>
                        {!isEditMode && (
                            <Link to="/" style={{ color: '#818cf8', fontSize: '0.85rem' }}>
                                Enable deadline alerts to hear when they land
                            </Link>
                        )}
                    </div>
                ) : (
                    <div className="answer-list">
                        {sorted.map((answer) => (
                            <div key={answer.id} className="answer-item">
                                <div style={{ display: 'flex', flex: 1, alignItems: 'baseline', gap: '0.5rem', minWidth: 0 }}>
                                    <span className="answer-key">{answer.questionNo}.</span>
                                    <span className="answer-text">{answer.text}</span>
                                </div>
                                {isEditMode && (
                                    <button
                                        onClick={() => handleDelete(answer.id)}
                                        aria-label={`Delete answer ${answer.questionNo}`}
                                        style={{ background: 'transparent', border: 'none', color: '#ff6b6b', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                    >
                                        <Trash2 size={17} />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {isEditMode && (
                    <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--clr-border)', paddingTop: '1rem' }}>
                        <h3 style={{ marginBottom: '0.75rem', fontSize: '1rem' }}>Add Answer</h3>
                        <form onSubmit={handleAddAnswer} className="answer-add-form">
                            <input
                                type="number"
                                placeholder="#"
                                value={questionNoValue}
                                onChange={(e) => setNewQuestionNo(e.target.value)}
                                className="answer-no-input"
                                required
                            />
                            <input
                                type="text"
                                placeholder="Answer text (e.g. Option B)"
                                value={newAnswerText}
                                onChange={(e) => setNewAnswerText(e.target.value)}
                                style={{ flex: 1, minWidth: 0 }}
                                required
                            />
                            <button type="submit" disabled={saving} className="btn-primary" style={{ padding: '0.7rem', display: 'flex' }}>
                                <Plus size={19} />
                            </button>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Week;
