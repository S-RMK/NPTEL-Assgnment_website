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
    const [showAll, setShowAll] = useState(false);
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

    // Default to the courses the student actually takes; browsing everything is opt-in.
    // Signed-out visitors and admins in edit mode always see the full catalogue.
    const visible = useMemo(() => {
        const bySearch = courses.filter((c) => {
            const q = searchQuery.toLowerCase();
            return (c.title || '').toLowerCase().includes(q) || (c.code || '').toLowerCase().includes(q);
        });
        if (!hasEnrolment || showAll || isEditMode) return bySearch;
        return bySearch.filter((c) => enrolled.includes(c.id));
    }, [courses, searchQuery, hasEnrolment, showAll, isEditMode, enrolled]);

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
                    {hasEnrolment && !showAll ? 'My ' : 'All '}
                    <span className="page-title-accent">Courses</span>
                </h1>
                {hasEnrolment && (
                    <button className="chip-toggle" onClick={() => setShowAll((v) => !v)}>
                        {showAll ? `Show my ${enrolled.length}` : 'Browse all courses'}
                    </button>
                )}
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
                    {courses.length === 0 ? (
                        <p>No courses have been published yet.</p>
                    ) : hasEnrolment && !showAll ? (
                        <>
                            <p>None of your enrolled courses match.</p>
                            <button className="btn-primary" style={{ padding: '0.5rem 1.2rem' }} onClick={() => setShowAll(true)}>
                                Browse all courses
                            </button>
                        </>
                    ) : (
                        <p>No courses match “{searchQuery}”.</p>
                    )}
                    {user && !hasEnrolment && (
                        <Link to="/settings" className="nav-link" style={{ marginTop: '0.5rem' }}>
                            <Settings size={16} /> Choose your courses
                        </Link>
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
