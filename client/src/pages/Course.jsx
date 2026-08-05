import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { api } from '../api';
import { Plus, ArrowLeft, Trash2, CalendarDays } from 'lucide-react';
import Modal from '../components/Modal';
import { SkeletonCards } from '../components/Spinner';

const Course = () => {
    const { courseId } = useParams();
    const { isEditMode } = useApp();
    const navigate = useNavigate();
    const [weeks, setWeeks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [weekTitle, setWeekTitle] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const loadWeeks = async () => {
        setLoading(true);
        try {
            const data = await api.getWeeks(courseId);
            setWeeks(Array.isArray(data) ? data : []);
            setError('');
        } catch (err) {
            console.error('Error loading weeks:', err);
            setError(err.message || 'Could not load weeks.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadWeeks();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [courseId]);

    const handleAddWeek = async (e) => {
        e.preventDefault();
        if (!weekTitle.trim()) return;
        setSubmitting(true);
        try {
            await api.addWeek(courseId, { title: weekTitle.trim(), number: weeks.length + 1 });
            setWeekTitle('');
            setIsModalOpen(false);
            await loadWeeks();
        } catch (err) {
            alert(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (e, id) => {
        e.preventDefault();
        e.stopPropagation();
        if (!window.confirm('Delete this week? Its answers will be removed too.')) return;
        try {
            await api.deleteWeek(id);
            await loadWeeks();
        } catch (err) {
            alert(err.message);
        }
    };

    return (
        <div style={{ paddingBottom: '3rem' }}>
            <div className="page-head">
                <button onClick={() => navigate('/courses')} className="btn-icon" aria-label="Back to courses">
                    <ArrowLeft size={19} />
                </button>
                <h1 className="page-title" style={{ fontSize: '1.5rem' }}>Weekly Assignments</h1>
                {!loading && weeks.length > 0 && <span className="count-pill">{weeks.length} weeks</span>}
            </div>

            {loading ? (
                <SkeletonCards count={3} />
            ) : error ? (
                <div className="empty-state">
                    <p style={{ color: '#f87171' }}>{error}</p>
                    <button className="btn-primary" style={{ padding: '0.5rem 1.2rem' }} onClick={loadWeeks}>Retry</button>
                </div>
            ) : weeks.length === 0 ? (
                <div className="empty-state">
                    <CalendarDays size={34} color="#6366f1" />
                    <p>No weeks have been published for this course yet.</p>
                    {isEditMode && <p style={{ fontSize: '0.85rem' }}>Use the + button to add the first one.</p>}
                </div>
            ) : (
                <div className="card-grid">
                    {weeks.map((week) => (
                        <Link key={week.id} to={`/week/${week.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                            <div className="glass-panel card">
                                <h3>{week.title}</h3>
                                <p>Assignment {week.number}</p>
                                {isEditMode && (
                                    <button onClick={(e) => handleDelete(e, week.id)} className="card-delete" aria-label="Delete week">
                                        <Trash2 size={16} />
                                    </button>
                                )}
                            </div>
                        </Link>
                    ))}
                </div>
            )}

            {isEditMode && (
                <button className="fab" onClick={() => setIsModalOpen(true)} aria-label="Add week">
                    <Plus size={28} />
                </button>
            )}

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add Week">
                <form onSubmit={handleAddWeek}>
                    <div className="answer-input-group" style={{ flexDirection: 'column' }}>
                        <label>Week Title</label>
                        <input
                            type="text"
                            value={weekTitle}
                            onChange={(e) => setWeekTitle(e.target.value)}
                            placeholder="e.g. Week 1"
                            autoFocus
                        />
                    </div>
                    <button type="submit" disabled={submitting} className="btn-primary" style={{ width: '100%' }}>
                        {submitting ? 'Publishing…' : 'Add Week'}
                    </button>
                </form>
            </Modal>
        </div>
    );
};

export default Course;
