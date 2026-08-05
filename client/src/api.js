import { db } from './firebase';
import {
    collection,
    addDoc,
    getDocs,
    query,
    where,
    orderBy,
    deleteDoc,
    doc
} from 'firebase/firestore';

const API_BASE = '/api';

const getAuthHeaders = () => {
    const token = localStorage.getItem('nptel_jwt_token');
    return token ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
};

// Reads the body as text first, so a hosting-level error page (Vercel's plain-text
// "The page could not be found", an HTML 502, ...) surfaces as a readable message
// instead of a raw "Unexpected token" JSON.parse crash.
const readJson = async (res, action) => {
    const body = await res.text();
    let data;

    try {
        data = body ? JSON.parse(body) : {};
    } catch {
        throw new Error(
            `${action} failed: the server returned a non-JSON response (HTTP ${res.status}). ` +
            `The /api backend is not reachable — check that the API is deployed. ` +
            `Response started with: ${body.slice(0, 80)}`
        );
    }

    if (!res.ok) throw new Error(data.error || `${action} failed (HTTP ${res.status})`);
    return data;
};

export const api = {
    // --- Auth APIs ---
    register: async (credentials) => {
        const res = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(credentials)
        });
        const data = await readJson(res, 'Registration');
        if (data.token) localStorage.setItem('nptel_jwt_token', data.token);
        return data;
    },

    login: async (credentials) => {
        const res = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(credentials)
        });
        const data = await readJson(res, 'Login');
        if (data.token) localStorage.setItem('nptel_jwt_token', data.token);
        return data;
    },

    getMe: async () => {
        const res = await fetch(`${API_BASE}/auth/me`, {
            headers: getAuthHeaders()
        });
        if (!res.ok) return null;
        return res.json();
    },

    logout: () => {
        localStorage.removeItem('nptel_jwt_token');
    },

    // --- Personalisation & Preferences ---
    updateCoursePreferences: async (selectedCourses) => {
        const res = await fetch(`${API_BASE}/users/preferences`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({ selectedCourses })
        });
        return res.json();
    },

    // --- Personalised Dashboard ---
    getDashboard: async () => {
        const res = await fetch(`${API_BASE}/dashboard`, {
            headers: getAuthHeaders()
        });
        if (!res.ok) throw new Error('Failed to fetch dashboard data');
        return res.json();
    },

    // --- Push Notifications ---
    getVapidPublicKey: async () => {
        const res = await fetch(`${API_BASE}/push/vapid-key`);
        const data = await res.json();
        return data.publicKey;
    },

    savePushSubscription: async (subscription, courseIds) => {
        const res = await fetch(`${API_BASE}/subscriptions`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ subscription, courseIds })
        });
        return res.json();
    },

    // --- Polls ---
    getActivePolls: async () => {
        const res = await fetch(`${API_BASE}/polls/active`);
        return res.json();
    },

    votePoll: async (pollId, optionId) => {
        const res = await fetch(`${API_BASE}/polls/${pollId}/vote`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ optionId })
        });
        return res.json();
    },

    // --- Admin APIs ---
    sendPushNotification: async (payload) => {
        const res = await fetch(`${API_BASE}/admin/push/send`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to send notification');
        return data;
    },

    createPoll: async (pollData) => {
        const res = await fetch(`${API_BASE}/admin/polls`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(pollData)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to create poll');
        return data;
    },

    createDeadline: async (deadlineData) => {
        const res = await fetch(`${API_BASE}/admin/deadlines`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(deadlineData)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to create deadline');
        return data;
    },

    createAnnouncement: async (announcementData) => {
        const res = await fetch(`${API_BASE}/admin/announcements`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(announcementData)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to create announcement');
        return data;
    },

    getAdminUsers: async () => {
        const res = await fetch(`${API_BASE}/users`, { headers: getAuthHeaders() });
        return res.json();
    },

    updateUser: async (userId, updates) => {
        const res = await fetch(`${API_BASE}/users/${userId}`, {
            method: 'PATCH',
            headers: getAuthHeaders(),
            body: JSON.stringify(updates)
        });
        return res.json();
    },

    getAuditLogs: async () => {
        const res = await fetch(`${API_BASE}/admin/logs`, { headers: getAuthHeaders() });
        return res.json();
    },

    getAdminAnalytics: async () => {
        const res = await fetch(`${API_BASE}/admin/analytics`, { headers: getAuthHeaders() });
        return res.json();
    },

    // --- Courses (Direct Firestore & API fallback) ---
    getCourses: async () => {
        try {
            const q = query(collection(db, 'courses'), orderBy('title'));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            }
        } catch (e) {
            console.warn('Firestore direct fetch failed, falling back to express API:', e.message);
        }
        const res = await fetch(`${API_BASE}/courses`);
        return res.json();
    },

    addCourse: async (course) => {
        try {
            const docRef = await addDoc(collection(db, 'courses'), course);
            return { id: docRef.id, ...course };
        } catch (e) {
            const res = await fetch(`${API_BASE}/courses`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(course)
            });
            return res.json();
        }
    },

    deleteCourse: async (id) => {
        try {
            await deleteDoc(doc(db, 'courses', id));
        } catch (e) {
            await fetch(`${API_BASE}/courses/${id}`, { method: 'DELETE' });
        }
    },

    // --- Weeks ---
    getWeeks: async (courseId) => {
        try {
            let q = query(
                collection(db, 'weeks'),
                where('courseId', '==', String(courseId)),
                orderBy('number', 'asc')
            );
            let querySnapshot = await getDocs(q);
            let weeks = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            if (weeks.length === 0 && !isNaN(courseId)) {
                q = query(
                    collection(db, 'weeks'),
                    where('courseId', '==', Number(courseId)),
                    orderBy('number', 'asc')
                );
                querySnapshot = await getDocs(q);
                weeks = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            }
            if (weeks.length > 0) return weeks;
        } catch (e) {
            console.warn('Firestore weeks fetch fallback');
        }
        const res = await fetch(`${API_BASE}/courses/${courseId}/weeks`);
        return res.json();
    },

    addWeek: async (courseId, week) => {
        const newWeek = {
            ...week,
            courseId: String(courseId),
            number: Number(week.number)
        };
        try {
            const docRef = await addDoc(collection(db, 'weeks'), newWeek);
            return { id: docRef.id, ...newWeek };
        } catch (e) {
            const res = await fetch(`${API_BASE}/courses/${courseId}/weeks`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newWeek)
            });
            return res.json();
        }
    },

    deleteWeek: async (id) => {
        try {
            await deleteDoc(doc(db, 'weeks', id));
        } catch (e) {
            await fetch(`${API_BASE}/weeks/${id}`, { method: 'DELETE' });
        }
    },

    // --- Answers ---
    getAnswers: async (weekId) => {
        try {
            let q = query(
                collection(db, 'answers'),
                where('weekId', '==', String(weekId)),
                orderBy('questionNo', 'asc')
            );
            let querySnapshot = await getDocs(q);
            let answers = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            if (answers.length === 0 && !isNaN(weekId)) {
                q = query(
                    collection(db, 'answers'),
                    where('weekId', '==', Number(weekId)),
                    orderBy('questionNo', 'asc')
                );
                querySnapshot = await getDocs(q);
                answers = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            }
            if (answers.length > 0) return answers;
        } catch (e) {
            console.warn('Firestore answers fetch fallback');
        }
        const res = await fetch(`${API_BASE}/weeks/${weekId}/answers`);
        return res.json();
    },

    addAnswer: async (weekId, answer) => {
        const newAnswer = {
            ...answer,
            weekId: String(weekId),
            questionNo: Number(answer.questionNo)
        };
        try {
            const docRef = await addDoc(collection(db, 'answers'), newAnswer);
            return { id: docRef.id, ...newAnswer };
        } catch (e) {
            const res = await fetch(`${API_BASE}/weeks/${weekId}/answers`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newAnswer)
            });
            return res.json();
        }
    },

    deleteAnswer: async (id) => {
        try {
            await deleteDoc(doc(db, 'answers', id));
        } catch (e) {
            await fetch(`${API_BASE}/answers/${id}`, { method: 'DELETE' });
        }
    }
};
