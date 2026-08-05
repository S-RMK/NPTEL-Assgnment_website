/*
 * Every request goes through the Express API, which authenticates the caller and
 * enforces course enrolment. The browser no longer talks to Firestore directly: with
 * rules denying all client access, hiding content in the UI alone would have left it
 * one hand-written query away. Dropping the Firestore SDK also removes ~300 kB from
 * the bundle.
 */
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
        return readJson(res, 'Saving your courses');
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
        // Requires a token: the endpoint is authenticated along with the rest of the API.
        const res = await fetch(`${API_BASE}/push/vapid-key`, { headers: getAuthHeaders() });
        const data = await readJson(res, 'Preparing notifications');
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
        const res = await fetch(`${API_BASE}/polls/active`, { headers: getAuthHeaders() });
        return readJson(res, 'Loading polls');
    },

    getDeadlines: async () => {
        const res = await fetch(`${API_BASE}/deadlines`, { headers: getAuthHeaders() });
        return readJson(res, 'Loading deadlines');
    },

    votePoll: async (pollId, optionId) => {
        const res = await fetch(`${API_BASE}/polls/${pollId}/vote`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ optionId })
        });
        return readJson(res, 'Submitting your vote');
    },

    // --- Admin: poll management ---
    getPollResponses: async (pollId) => {
        const res = await fetch(`${API_BASE}/admin/polls/${pollId}/responses`, { headers: getAuthHeaders() });
        return readJson(res, 'Loading poll responses');
    },

    remindPollNonResponders: async (pollId) => {
        const res = await fetch(`${API_BASE}/admin/polls/${pollId}/remind`, {
            method: 'POST',
            headers: getAuthHeaders()
        });
        return readJson(res, 'Sending reminders');
    },

    deletePoll: async (pollId) => {
        const res = await fetch(`${API_BASE}/admin/polls/${pollId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        return readJson(res, 'Deleting the poll');
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

    // --- Courses ---
    // Returns only the signed-in user's enrolled courses (all of them, for an admin).
    getCourses: async () => {
        const res = await fetch(`${API_BASE}/courses`, { headers: getAuthHeaders() });
        return readJson(res, 'Loading courses');
    },

    // Names only, and the one endpoint that works without a token — the registration
    // form needs to offer course choices before an account exists.
    getCourseCatalogue: async () => {
        const res = await fetch(`${API_BASE}/courses/catalogue`);
        return readJson(res, 'Loading the course list');
    },

    addCourse: async (course) => {
        const res = await fetch(`${API_BASE}/courses`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(course)
        });
        return readJson(res, 'Creating the course');
    },

    deleteCourse: async (id) => {
        const res = await fetch(`${API_BASE}/courses/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        return readJson(res, 'Deleting the course');
    },

    // --- Weeks ---
    getWeeks: async (courseId) => {
        const res = await fetch(`${API_BASE}/courses/${courseId}/weeks`, { headers: getAuthHeaders() });
        return readJson(res, 'Loading weeks');
    },

    addWeek: async (courseId, week) => {
        const newWeek = {
            ...week,
            courseId: String(courseId),
            number: Number(week.number)
        };
        const res = await fetch(`${API_BASE}/courses/${courseId}/weeks`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(newWeek)
        });
        return readJson(res, 'Publishing the week');
    },

    deleteWeek: async (id) => {
        const res = await fetch(`${API_BASE}/weeks/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        return readJson(res, 'Deleting the week');
    },

    // --- Answers ---
    getAnswers: async (weekId) => {
        const res = await fetch(`${API_BASE}/weeks/${weekId}/answers`, { headers: getAuthHeaders() });
        return readJson(res, 'Loading answers');
    },

    addAnswer: async (weekId, answer) => {
        const newAnswer = {
            ...answer,
            weekId: String(weekId),
            questionNo: Number(answer.questionNo)
        };
        const res = await fetch(`${API_BASE}/weeks/${weekId}/answers`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(newAnswer)
        });
        return readJson(res, 'Saving the answer');
    },

    deleteAnswer: async (id) => {
        const res = await fetch(`${API_BASE}/answers/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        return readJson(res, 'Deleting the answer');
    }
};
