const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('./db');
// optionalAuth is no longer imported: every content route now requires a real token.
const { generateToken, verifyToken, requireRole } = require('./authMiddleware');
const { getVapidPublicKey, saveSubscription, sendPushNotification } = require('./pushService');
const { logAudit } = require('./auditLogger');

/*
 * Enrolment enforcement.
 *
 * Course content is private: a student may only read courses they are enrolled in,
 * and the weeks and answers belonging to them. This is checked on the server for every
 * read, because the browser no longer talks to Firestore directly — hiding items in the
 * UI alone would leave the data one hand-crafted request away.
 */
const isAdminRole = (user) => Boolean(user) && (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN');

const enrolmentOf = async (user) => {
    if (!user) return [];
    const doc = await db.collection('users').doc(user.id).get();
    return doc.exists ? (doc.data().selectedCourses || []) : [];
};

// Admins see everything. 'all' is the wildcard stored for admin/staff accounts.
const mayAccessCourse = (enrolled, courseId, user) =>
    isAdminRole(user) || enrolled.includes('all') || enrolled.includes(String(courseId));

const denyCourse = (res) =>
    res.status(403).json({ error: 'You are not enrolled in this course.' });

// Helper to query Firestore collections with in-memory sorting fallback
const getCollection = async (collectionName, field, value, orderByField, orderDir = 'asc') => {
    if (!db) return [];
    let ref = db.collection(collectionName);
    if (field && value) {
        ref = ref.where(field, '==', value);
    } else if (orderByField) {
        ref = ref.orderBy(orderByField, orderDir);
    }

    const snapshot = await ref.get();
    let results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    if (field && value && orderByField) {
        results.sort((a, b) => {
            let valA = a[orderByField];
            let valB = b[orderByField];
            if (!isNaN(valA) && !isNaN(valB)) {
                valA = Number(valA);
                valB = Number(valB);
            }
            if (valA < valB) return orderDir === 'asc' ? -1 : 1;
            if (valA > valB) return orderDir === 'asc' ? 1 : -1;
            return 0;
        });
    }
    return results;
};

// Seed initial default Admin user if none exists
const seedInitialAdmin = async () => {
    if (!db) return;
    try {
        const snapshot = await db.collection('users').where('username', '==', 'admin').get();
        if (snapshot.empty) {
            const passwordHash = await bcrypt.hash('admin123', 10);
            await db.collection('users').add({
                username: 'admin',
                passwordHash,
                displayName: 'Administrator',
                role: 'ADMIN',
                status: 'ACTIVE',
                selectedCourses: ['all'],
                createdAt: new Date().toISOString(),
                lastLogin: new Date().toISOString()
            });
            console.log('[Seed] Default Admin user created (username: admin, password: admin123)');
        }
    } catch (err) {
        console.error('[Seed] Error seeding admin user:', err.message);
    }
};
seedInitialAdmin();

// ==========================================
// 1. AUTHENTICATION ROUTES
// ==========================================

// POST /api/auth/register
router.post('/auth/register', async (req, res) => {
    const { username, password, displayName, selectedCourses } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required.' });
    }

    try {
        const existing = await db.collection('users').where('username', '==', username.trim()).get();
        if (!existing.empty) {
            return res.status(400).json({ error: 'Username is already taken.' });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const newUser = {
            username: username.trim(),
            passwordHash,
            displayName: displayName || username,
            role: 'STUDENT',
            status: 'ACTIVE',
            selectedCourses: selectedCourses || [],
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString()
        };

        const docRef = await db.collection('users').add(newUser);
        const token = generateToken({ id: docRef.id, username: newUser.username, role: newUser.role });

        await logAudit({ actorId: docRef.id, actorRole: 'STUDENT', action: 'USER_REGISTERED', details: `Student ${newUser.username} registered.` });

        res.status(201).json({
            token,
            user: {
                id: docRef.id,
                username: newUser.username,
                displayName: newUser.displayName,
                role: newUser.role,
                selectedCourses: newUser.selectedCourses
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/auth/login
router.post('/auth/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required.' });
    }

    try {
        const snapshot = await db.collection('users').where('username', '==', username.trim()).get();
        if (snapshot.empty) {
            return res.status(401).json({ error: 'Invalid username or password.' });
        }

        const userDoc = snapshot.docs[0];
        const userData = userDoc.data();

        if (userData.status === 'DISABLED') {
            return res.status(403).json({ error: 'Your account has been disabled. Contact admin.' });
        }

        const isMatch = await bcrypt.compare(password, userData.passwordHash);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid username or password.' });
        }

        // Update last login timestamp
        await userDoc.ref.update({ lastLogin: new Date().toISOString() });

        const token = generateToken({ id: userDoc.id, username: userData.username, role: userData.role });

        await logAudit({ actorId: userDoc.id, actorRole: userData.role, action: 'USER_LOGIN', details: `User ${userData.username} logged in.` });

        res.json({
            token,
            user: {
                id: userDoc.id,
                username: userData.username,
                displayName: userData.displayName || userData.username,
                role: userData.role,
                selectedCourses: userData.selectedCourses || []
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/auth/me
router.get('/auth/me', verifyToken, async (req, res) => {
    try {
        const userDoc = await db.collection('users').doc(req.user.id).get();
        if (!userDoc.exists) {
            return res.status(404).json({ error: 'User not found' });
        }
        const data = userDoc.data();
        res.json({
            id: userDoc.id,
            username: data.username,
            displayName: data.displayName || data.username,
            role: data.role,
            selectedCourses: data.selectedCourses || [],
            status: data.status
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// 2. USER PREFERENCES & MANAGEMENT
// ==========================================

// PUT /api/users/preferences
router.put('/users/preferences', verifyToken, async (req, res) => {
    const { selectedCourses } = req.body;
    try {
        await db.collection('users').doc(req.user.id).update({
            selectedCourses: selectedCourses || []
        });
        res.json({ message: 'Preferences updated successfully', selectedCourses });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/users (Admin Search / List)
router.get('/users', verifyToken, requireRole('ADMIN'), async (req, res) => {
    try {
        const snapshot = await db.collection('users').get();
        const users = snapshot.docs.map(doc => {
            const data = doc.data();
            delete data.passwordHash;
            return { id: doc.id, ...data };
        });
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PATCH /api/users/:id (Admin Update Role / Status / Password)
router.patch('/users/:id', verifyToken, requireRole('ADMIN'), async (req, res) => {
    const { id } = req.params;
    const { role, status, newPassword } = req.body;

    try {
        const updates = {};
        if (role) updates.role = role;
        if (status) updates.status = status;
        if (newPassword) {
            updates.passwordHash = await bcrypt.hash(newPassword, 10);
        }

        await db.collection('users').doc(id).update(updates);
        await logAudit({ actorId: req.user.id, actorRole: 'ADMIN', action: 'USER_UPDATED', target: id, details: `Updated user fields: ${Object.keys(updates).join(', ')}` });

        res.json({ message: 'User updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// 3. WEB PUSH NOTIFICATIONS
// ==========================================

// GET /api/push/vapid-key
router.get('/push/vapid-key', verifyToken, async (req, res) => {
    try {
        res.json({ publicKey: await getVapidPublicKey() });
    } catch (err) {
        res.status(503).json({ error: err.message });
    }
});

// POST /api/subscriptions
router.post('/subscriptions', verifyToken, async (req, res) => {
    const { subscription, courseIds } = req.body;
    if (!subscription) {
        return res.status(400).json({ error: 'Subscription object is required' });
    }

    try {
        const userId = req.user ? req.user.id : 'anonymous';
        await saveSubscription(userId, subscription, courseIds || ['all']);
        res.status(201).json({ message: 'Push subscription registered successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/admin/push/send
router.post('/admin/push/send', verifyToken, requireRole('ADMIN'), async (req, res) => {
    const { title, body, icon, image, targetUrl, courseId } = req.body;
    if (!title || !body) {
        return res.status(400).json({ error: 'Title and body are required' });
    }

    try {
        const result = await sendPushNotification({ title, body, icon, image, targetUrl, courseId });
        await logAudit({ actorId: req.user.id, actorRole: 'ADMIN', action: 'PUSH_SENT', details: `Sent push notification: "${title}" to course target: ${courseId || 'all'}` });
        res.json({ message: 'Push notification process complete', result });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// 4. PERSONALISED DASHBOARD API
// ==========================================

router.get('/dashboard', verifyToken, async (req, res) => {
    try {
        const userCourses = await enrolmentOf(req.user);

        // Only the student's own courses. A student with no selections sees an empty
        // dashboard that prompts them to choose — not everyone else's material.
        const allCourses = await getCollection('courses', null, null, 'title');
        const courses = allCourses.filter((c) => mayAccessCourse(userCourses, c.id, req.user));

        // A record targeted at 'all' (or with no course) reaches everyone; anything
        // course-specific must match the student's enrolment.
        const relevant = (item) =>
            !item.courseId || item.courseId === 'all' || mayAccessCourse(userCourses, item.courseId, req.user);

        // Fetch Deadlines
        const deadlinesSnapshot = await db.collection('deadlines').get();
        let deadlines = deadlinesSnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(relevant)
            // Drop deadlines that expired over a day ago; keep just-passed ones briefly so
            // a student who missed one still sees it. Soonest first.
            .filter(d => {
                const due = new Date(d.dueDate).getTime();
                return !Number.isNaN(due) && due > Date.now() - 24 * 60 * 60 * 1000;
            })
            .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

        // Fetch Active Polls — previously returned to everyone regardless of course.
        const pollsSnapshot = await db.collection('polls').where('isActive', '==', true).get();
        let polls = pollsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(relevant);

        // Fetch Announcements — pinned first, then newest.
        const announcementsSnapshot = await db.collection('announcements').get();
        let announcements = announcementsSnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(relevant)
            .sort((a, b) => (Number(b.isPinned) - Number(a.isPinned))
                || new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

        // Fetch Recent Weeks / Answers
        const recentWeeksSnapshot = await db.collection('weeks').limit(5).get();
        const recentWeeks = recentWeeksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        res.json({
            courses,
            deadlines,
            polls,
            announcements,
            recentWeeks,
            userCourses
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// 5. POLLS ENGINE
// ==========================================

router.get('/polls/active', verifyToken, async (req, res) => {
    try {
        const enrolled = await enrolmentOf(req.user);
        const snapshot = await db.collection('polls').where('isActive', '==', true).get();

        // Which of these has the caller already answered? Lets the UI show results
        // straight away instead of relying on a localStorage flag.
        const mine = await db.collection('poll_responses').where('userId', '==', req.user.id).get();
        const answered = new Set(mine.docs.map((d) => d.data().pollId));

        const polls = snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(p => !p.courseId || p.courseId === 'all' || mayAccessCourse(enrolled, p.courseId, req.user))
            .map(p => ({ ...p, hasVoted: answered.has(p.id) }));

        res.json(polls);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/polls/:id/vote', verifyToken, async (req, res) => {
    const { id } = req.params;
    const { optionId } = req.body;
    if (!optionId) {
        return res.status(400).json({ error: 'optionId is required' });
    }

    try {
        const pollRef = db.collection('polls').doc(id);
        const pollDoc = await pollRef.get();
        if (!pollDoc.exists) {
            return res.status(404).json({ error: 'Poll not found' });
        }

        const pollData = pollDoc.data();

        // One response per account. Previously anyone could vote repeatedly and skew
        // the tally, and votes from signed-out visitors were all filed as 'anonymous'.
        const existing = await db.collection('poll_responses')
            .where('pollId', '==', id)
            .where('userId', '==', req.user.id)
            .get();
        if (!existing.empty) {
            return res.status(409).json({
                error: 'You have already voted in this poll.',
                options: pollData.options,
                totalVotes: pollData.totalVotes || 0
            });
        }

        if (!pollData.options.some((opt) => opt.id === optionId)) {
            return res.status(400).json({ error: 'That option does not belong to this poll.' });
        }

        const enrolled = await enrolmentOf(req.user);
        if (pollData.courseId && pollData.courseId !== 'all'
            && !mayAccessCourse(enrolled, pollData.courseId, req.user)) {
            return denyCourse(res);
        }

        const options = pollData.options.map(opt =>
            opt.id === optionId ? { ...opt, votes: (opt.votes || 0) + 1 } : opt
        );
        const totalVotes = (pollData.totalVotes || 0) + 1;

        await pollRef.update({ options, totalVotes });

        await db.collection('poll_responses').add({
            pollId: id,
            optionId,
            userId: req.user.id,
            username: req.user.username,
            votedAt: new Date().toISOString()
        });

        res.json({ message: 'Vote recorded', options, totalVotes });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Who has responded, and who hasn't. Drives the reminder button below.
router.get('/admin/polls/:id/responses', verifyToken, requireRole('ADMIN'), async (req, res) => {
    const { id } = req.params;
    try {
        const pollDoc = await db.collection('polls').doc(id).get();
        if (!pollDoc.exists) return res.status(404).json({ error: 'Poll not found' });
        const poll = pollDoc.data();

        const responses = await db.collection('poll_responses').where('pollId', '==', id).get();
        const respondedIds = new Set(responses.docs.map((d) => d.data().userId));

        // The audience is every active student the poll targets.
        const users = await db.collection('users').get();
        const audience = users.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .filter((u) => u.role === 'STUDENT' && (u.status || 'ACTIVE') !== 'DISABLED')
            .filter((u) => !poll.courseId || poll.courseId === 'all'
                || (u.selectedCourses || []).includes(poll.courseId));

        const shape = (u) => ({ id: u.id, username: u.username, displayName: u.displayName });

        res.json({
            // Individual choices are deliberately not returned — the tallies already
            // give the distribution, and naming who picked what turns an opinion poll
            // into a record of each student's answer.
            responded: audience.filter((u) => respondedIds.has(u.id)).map(shape),
            pending: audience.filter((u) => !respondedIds.has(u.id)).map(shape),
            totalResponses: responses.size
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Nudge only the students who still owe a response.
router.post('/admin/polls/:id/remind', verifyToken, requireRole('ADMIN'), async (req, res) => {
    const { id } = req.params;
    try {
        const pollDoc = await db.collection('polls').doc(id).get();
        if (!pollDoc.exists) return res.status(404).json({ error: 'Poll not found' });
        const poll = pollDoc.data();

        const responses = await db.collection('poll_responses').where('pollId', '==', id).get();
        const respondedIds = new Set(responses.docs.map((d) => d.data().userId));

        const users = await db.collection('users').get();
        const pendingIds = users.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .filter((u) => u.role === 'STUDENT' && (u.status || 'ACTIVE') !== 'DISABLED')
            .filter((u) => !poll.courseId || poll.courseId === 'all'
                || (u.selectedCourses || []).includes(poll.courseId))
            .filter((u) => !respondedIds.has(u.id))
            .map((u) => u.id);

        if (pendingIds.length === 0) {
            return res.json({ message: 'Everyone has already responded.', success: 0, pending: 0 });
        }

        const result = await sendPushNotification({
            title: '📊 Reminder: your response is needed',
            body: `You haven't answered "${poll.question}" yet. Tap to vote.`,
            targetUrl: '/#polls',
            tag: `poll-reminder-${id}`,
            userIds: pendingIds
        });

        await logAudit({
            actorId: req.user.id, actorRole: req.user.role, action: 'POLL_REMINDER_SENT',
            details: `Reminded ${pendingIds.length} student(s) about poll "${poll.question}"`
        });

        res.json({ message: 'Reminder dispatched', pending: pendingIds.length, result });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/admin/polls/:id', verifyToken, requireRole('ADMIN'), async (req, res) => {
    const { id } = req.params;
    try {
        const pollDoc = await db.collection('polls').doc(id).get();
        if (!pollDoc.exists) return res.status(404).json({ error: 'Poll not found' });

        // Remove the responses too, otherwise they linger pointing at a poll that no
        // longer exists and quietly inflate future "already voted" checks.
        const responses = await db.collection('poll_responses').where('pollId', '==', id).get();
        await Promise.all(responses.docs.map((d) => d.ref.delete()));
        await db.collection('polls').doc(id).delete();

        await logAudit({
            actorId: req.user.id, actorRole: req.user.role, action: 'POLL_DELETED',
            details: `Deleted poll "${pollDoc.data().question}" (${responses.size} responses)`
        });

        res.json({ message: 'Poll deleted', responsesDeleted: responses.size });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/admin/polls', verifyToken, requireRole('ADMIN'), async (req, res) => {
    const { question, options, courseId } = req.body;
    if (!question || !options || !Array.isArray(options)) {
        return res.status(400).json({ error: 'Question and array of options required' });
    }

    try {
        const formattedOptions = options.map((optText, index) => ({
            id: `opt_${index + 1}`,
            text: optText,
            votes: 0
        }));

        const newPoll = {
            question,
            options: formattedOptions,
            courseId: courseId || 'all',
            totalVotes: 0,
            isActive: true,
            createdAt: new Date().toISOString()
        };

        const docRef = await db.collection('polls').add(newPoll);
        await logAudit({ actorId: req.user.id, actorRole: 'ADMIN', action: 'POLL_CREATED', details: `Created poll: "${question}"` });

        res.status(201).json({ id: docRef.id, ...newPoll });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// 6. DEADLINES ENGINE
// ==========================================

router.get('/deadlines', verifyToken, async (req, res) => {
    try {
        const enrolled = await enrolmentOf(req.user);
        const snapshot = await db.collection('deadlines').get();
        const deadlines = snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(d => !d.courseId || d.courseId === 'all' || mayAccessCourse(enrolled, d.courseId, req.user))
            .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
        res.json(deadlines);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/admin/deadlines', verifyToken, requireRole('ADMIN'), async (req, res) => {
    const { title, courseId, weekId, dueDate } = req.body;
    if (!title || !dueDate) {
        return res.status(400).json({ error: 'Title and dueDate are required' });
    }

    // A datetime-local input submits "2026-08-10T14:30" with no timezone, which different
    // clients interpret differently. Normalise to ISO/UTC once, at write time.
    const parsedDue = new Date(dueDate);
    if (Number.isNaN(parsedDue.getTime())) {
        return res.status(400).json({ error: `Could not understand the due date: "${dueDate}"` });
    }

    try {
        const newDeadline = {
            title,
            courseId: courseId || 'all',
            weekId: weekId || '',
            dueDate: parsedDue.toISOString(),
            reminderSent: { '24h': false, '12h': false, '1h': false },
            createdAt: new Date().toISOString()
        };

        const docRef = await db.collection('deadlines').add(newDeadline);
        await logAudit({ actorId: req.user.id, actorRole: 'ADMIN', action: 'DEADLINE_CREATED', details: `Created deadline: "${title}" due on ${dueDate}` });

        res.status(201).json({ id: docRef.id, ...newDeadline });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// 7. ANNOUNCEMENTS
// ==========================================

router.get('/announcements', verifyToken, async (req, res) => {
    try {
        const enrolled = await enrolmentOf(req.user);
        const snapshot = await db.collection('announcements').get();
        const announcements = snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(a => !a.courseId || a.courseId === 'all' || mayAccessCourse(enrolled, a.courseId, req.user));
        res.json(announcements);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/admin/announcements', verifyToken, requireRole('ADMIN'), async (req, res) => {
    const { title, content, isPinned, courseId } = req.body;
    if (!title || !content) {
        return res.status(400).json({ error: 'Title and content are required' });
    }

    try {
        const newAnnouncement = {
            title,
            content,
            isPinned: Boolean(isPinned),
            courseId: courseId || 'all',
            createdAt: new Date().toISOString()
        };

        const docRef = await db.collection('announcements').add(newAnnouncement);
        await logAudit({ actorId: req.user.id, actorRole: 'ADMIN', action: 'ANNOUNCEMENT_CREATED', details: `Created announcement: "${title}"` });

        res.status(201).json({ id: docRef.id, ...newAnnouncement });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// 8. AUDIT LOGS & SYSTEM ANALYTICS
// ==========================================

router.get('/admin/logs', verifyToken, requireRole('ADMIN'), async (req, res) => {
    try {
        const snapshot = await db.collection('audit_logs').limit(50).get();
        const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        res.json(logs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/admin/analytics', verifyToken, requireRole('ADMIN'), async (req, res) => {
    try {
        const usersCount = (await db.collection('users').get()).size;
        const coursesCount = (await db.collection('courses').get()).size;
        const subsCount = (await db.collection('notification_subscriptions').get()).size;
        const pollsCount = (await db.collection('polls').get()).size;

        res.json({
            totalUsers: usersCount,
            totalCourses: coursesCount,
            totalPushSubscribers: subsCount,
            totalPolls: pollsCount
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// 9. EXISTING COURSES / WEEKS / ANSWERS ROUTES (Preserved)
// ==========================================

// Students receive only the courses they are enrolled in; admins receive all.
router.get('/courses', verifyToken, async (req, res) => {
    try {
        const courses = await getCollection('courses', null, null, 'title');
        const enrolled = await enrolmentOf(req.user);
        res.json(courses.filter((c) => mayAccessCourse(enrolled, c.id, req.user)));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/*
 * The one deliberate exception to "nothing without a login": the registration form has
 * to offer a course list before an account exists. It returns names only — no weeks,
 * no answers — and is the sole unauthenticated content route.
 */
router.get('/courses/catalogue', async (req, res) => {
    try {
        const courses = await getCollection('courses', null, null, 'title');
        res.json(courses.map(({ id, title, code }) => ({ id, title, code })));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/courses', verifyToken, requireRole('ADMIN'), async (req, res) => {
    const { title, code } = req.body;
    if (!title || !String(title).trim()) {
        return res.status(400).json({ error: 'Course title is required' });
    }
    try {
        const docRef = await db.collection('courses').add({ title: String(title).trim(), code: code || 'NEW' });
        await logAudit({ actorId: req.user.id, actorRole: req.user.role, action: 'COURSE_CREATED', details: `Created course "${title}"` });
        res.status(201).json({ id: docRef.id, title, code });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/courses/:courseId/weeks', verifyToken, async (req, res) => {
    const { courseId } = req.params;
    try {
        const enrolled = await enrolmentOf(req.user);
        if (!mayAccessCourse(enrolled, courseId, req.user)) return denyCourse(res);

        let weeks = await getCollection('weeks', 'courseId', courseId, 'number', 'asc');
        if (weeks.length === 0 && !isNaN(courseId)) {
            weeks = await getCollection('weeks', 'courseId', Number(courseId), 'number', 'asc');
        }
        res.json(weeks);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/courses/:courseId/weeks', verifyToken, requireRole('ADMIN'), async (req, res) => {
    const { courseId } = req.params;
    const { title, number } = req.body;
    try {
        const docRef = await db.collection('weeks').add({
            courseId: courseId,
            title,
            number: Number(number)
        });

        // Automatically trigger push notification when a full week assignment is published
        try {
            const courseDoc = await db.collection('courses').doc(courseId).get();
            let courseName = 'Course';
            if (courseDoc && courseDoc.exists) {
                courseName = courseDoc.data().title || 'Course';
            }

            const weekName = title || `Week ${number}`;
            sendPushNotification({
                title: `🎉 ${courseName} - ${weekName} Answers Released!`,
                body: `Answers for ${courseName} ${weekName} are now live. Check them out!`,
                targetUrl: `/week/${docRef.id}`,
                courseId: courseId
            });
            logAudit({ actorId: req.user.id, actorRole: req.user.role, action: 'WEEK_PUBLISHED', details: `Published ${weekName} for course ${courseId}` });
        } catch (pushErr) {
            console.warn('Auto push notification warning:', pushErr.message);
        }

        res.status(201).json({ id: docRef.id, courseId, title, number });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/weeks/:weekId/answers', verifyToken, async (req, res) => {
    const { weekId } = req.params;
    try {
        // A week ID alone reveals nothing about enrolment, so resolve it to its course
        // before answering — otherwise /week/<id> would be an open back door.
        const weekDoc = await db.collection('weeks').doc(weekId).get();
        if (!weekDoc.exists) return res.status(404).json({ error: 'Week not found' });

        const enrolled = await enrolmentOf(req.user);
        if (!mayAccessCourse(enrolled, weekDoc.data().courseId, req.user)) return denyCourse(res);

        let answers = await getCollection('answers', 'weekId', weekId, 'questionNo', 'asc');
        if (answers.length === 0 && !isNaN(weekId)) {
            answers = await getCollection('answers', 'weekId', Number(weekId), 'questionNo', 'asc');
        }
        res.json(answers);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/weeks/:weekId/answers', verifyToken, requireRole('ADMIN'), async (req, res) => {
    const { weekId } = req.params;
    const { questionNo, text } = req.body;
    if (!text || !String(text).trim()) {
        return res.status(400).json({ error: 'Answer text is required' });
    }
    try {
        const docRef = await db.collection('answers').add({
            weekId: weekId,
            questionNo: Number(questionNo),
            text
        });
        await logAudit({ actorId: req.user.id, actorRole: req.user.role, action: 'ANSWER_ADDED', details: `Added answer Q${questionNo} to week ${weekId}` });
        res.status(201).json({ id: docRef.id, weekId, questionNo, text });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Deleting a parent leaves its children unreachable but still stored, so remove them
// too. Despite its name the previous helper only deleted the single document.
const deleteWhere = async (collection, field, value) => {
    const snapshot = await db.collection(collection).where(field, '==', value).get();
    await Promise.all(snapshot.docs.map((doc) => doc.ref.delete()));
    return snapshot.size;
};

router.delete('/courses/:id', verifyToken, requireRole('ADMIN'), async (req, res) => {
    const { id } = req.params;
    try {
        const weeks = await db.collection('weeks').where('courseId', '==', id).get();
        let answers = 0;
        for (const week of weeks.docs) {
            answers += await deleteWhere('answers', 'weekId', week.id);
            await week.ref.delete();
        }
        await db.collection('courses').doc(id).delete();

        await logAudit({ actorId: req.user.id, actorRole: req.user.role, action: 'COURSE_DELETED', details: `Deleted course ${id} (${weeks.size} weeks, ${answers} answers)` });
        res.json({ message: 'Course deleted', weeksDeleted: weeks.size, answersDeleted: answers });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/weeks/:id', verifyToken, requireRole('ADMIN'), async (req, res) => {
    const { id } = req.params;
    try {
        const answers = await deleteWhere('answers', 'weekId', id);
        await db.collection('weeks').doc(id).delete();

        await logAudit({ actorId: req.user.id, actorRole: req.user.role, action: 'WEEK_DELETED', details: `Deleted week ${id} (${answers} answers)` });
        res.json({ message: 'Week deleted', answersDeleted: answers });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/answers/:id', verifyToken, requireRole('ADMIN'), async (req, res) => {
    const { id } = req.params;
    try {
        await db.collection('answers').doc(id).delete();
        await logAudit({ actorId: req.user.id, actorRole: req.user.role, action: 'ANSWER_DELETED', details: `Deleted answer ${id}` });
        res.json({ message: 'Answer deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
