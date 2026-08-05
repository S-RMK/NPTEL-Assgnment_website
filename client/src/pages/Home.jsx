import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { Plus, Trash2, Search, BookOpen, Settings } from 'lucide-react';
import Modal from '../components/Modal';
import { SkeletonCards } from '../components/Spinner';

const Home = () => {
    const { isEditMode } = useApp();
    const { user } = useAuth();
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newCourseName, setNewCourseName] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const enrolled = useMemo(() => user?.selectedCourses || [], [user]);
    const hasEnrolment = enrolled.length > 0;

    const loadCourses = async () => {
        setLoading(true);
        try {
            const data = await api.getCourses();
            setCourses(Array.isArray(data) ? data : []);
            setError('');
        } catch (err) {
            console.error('Error loading courses:', err);
            setError(err.message || 'Could not load courses.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadCourses();
    }, []);

    // The server already returns only what this account may see — enrolled courses for a
    // student, everything for an admin — so this filters by search text alone.
    const visible = useMemo(() => {
        const q = searchQuery.toLowerCase();
        return courses.filter((c) =>
            (c.title || '').toLowerCase().includes(q) || (c.code || '').toLowerCase().includes(q)
        );
    }, [courses, searchQuery]);

    const handleAddCourse = async (e) => {
        e.preventDefault();
        if (!newCourseName.trim()) return;
        setSubmitting(true);
        try {
            await api.addCourse({ title: newCourseName.trim(), code: 'NEW' });
            setNewCourseName('');
            setIsModalOpen(false);
            loadCourses();
        } catch (err) {
            alert(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (e, id) => {
        e.preventDefault();
        e.stopPropagation();
        if (!window.confirm('Delete this course? Its weeks and answers will be removed too.')) return;
        try {
            await api.deleteCourse(id);
            loadCourses();
        } catch (err) {
            alert(err.message);
        }
    };

    return (
        <div style={{ paddingBottom: '3rem' }}>
            <div className="page-head">
                <h1 className="page-title">
                    My <span className="page-title-accent">Courses</span>
                </h1>
                <Link to="/settings" className="chip-toggle" style={{ textDecoration: 'none' }}>
                    Change my courses
                </Link>
            </div>

            <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
                <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--clr-text-muted)' }} size={18} />
                <input
                    type="text"
                    placeholder="Search courses..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                        width: '100%',
                        padding: '0.8rem 1rem 0.8rem 2.75rem',
                        borderRadius: 'var(--radius-full)',
                        background: 'var(--clr-bg-card)',
                        border: '1px solid var(--clr-border)',
                        color: 'white',
                        fontSize: '0.95rem'
                    }}
                />
            </div>

            {loading ? (
                <SkeletonCards count={4} />
            ) : error ? (
                <div className="empty-state">
                    <p style={{ color: '#f87171' }}>{error}</p>
                    <button className="btn-primary" style={{ padding: '0.5rem 1.2rem' }} onClick={loadCourses}>Retry</button>
                </div>
            ) : visible.length === 0 ? (
                <div className="empty-state">
                    <BookOpen size={34} color="#6366f1" />
                    {searchQuery ? (
                        <p>No courses match “{searchQuery}”.</p>
                    ) : hasEnrolment ? (
                        <p>Your enrolled courses haven't been published yet.</p>
                    ) : (
                        <>
                            <p>You haven't chosen any courses yet.</p>
                            <Link to="/settings" className="btn-primary" style={{ padding: '0.5rem 1.2rem', textDecoration: 'none' }}>
                                <Settings size={15} style={{ verticalAlign: '-2px', marginRight: '0.35rem' }} />
                                Choose your courses
                            </Link>
                        </>
                    )}
                </div>
            ) : (
                <div className="card-grid">
                    {visible.map((course) => (
                        <Link key={course.id} to={`/course/${course.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                            <div className="glass-panel card">
                                <h3>{course.title}</h3>
                                <p>{course.code}</p>
                                {enrolled.includes(course.id) && <span className="badge-enrolled">Enrolled</span>}
                                {isEditMode && (
                                    <button onClick={(e) => handleDelete(e, course.id)} className="card-delete" aria-label="Delete course">
                                        <Trash2 size={16} />
                                    </button>
                                )}
                            </div>
                        </Link>
                    ))}
                </div>
            )}

            {isEditMode && (
                <button className="fab" onClick={() => setIsModalOpen(true)} aria-label="Add course">
                    <Plus size={28} />
                </button>
            )}

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add New Course">
                <form onSubmit={handleAddCourse}>
                    <div className="answer-input-group" style={{ flexDirection: 'column' }}>
                        <label>Course Name</label>
                        <input
                            type="text"
                            value={newCourseName}
                            onChange={(e) => setNewCourseName(e.target.value)}
                            placeholder="e.g. Data Structures"
                            autoFocus
                        />
                    </div>
                    <button type="submit" disabled={submitting} className="btn-primary" style={{ width: '100%' }}>
                        {submitting ? 'Adding…' : 'Add Course'}
                    </button>
                </form>
            </Modal>
        </div>
    );
};

export default Home;
