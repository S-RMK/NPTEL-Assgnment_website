const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('./db');
const { generateToken, verifyToken, optionalAuth, requireRole } = require('./authMiddleware');
const { vapidPublicKey, saveSubscription, sendPushNotification } = require('./pushService');
const { logAudit } = require('./auditLogger');

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
router.get('/push/vapid-key', (req, res) => {
    res.json({ publicKey: vapidPublicKey });
});

// POST /api/subscriptions
router.post('/subscriptions', optionalAuth, async (req, res) => {
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

router.get('/dashboard', optionalAuth, async (req, res) => {
    try {
        let userCourses = [];
        if (req.user) {
            const userDoc = await db.collection('users').doc(req.user.id).get();
            if (userDoc.exists) {
                userCourses = userDoc.data().selectedCourses || [];
            }
        }

        // Fetch Courses
        const courses = await getCollection('courses', null, null, 'title');

        // Fetch Deadlines
        const deadlinesSnapshot = await db.collection('deadlines').get();
        let deadlines = deadlinesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Filter deadlines by user courses if user has preferences
        if (userCourses.length > 0 && !userCourses.includes('all')) {
            deadlines = deadlines.filter(d => !d.courseId || userCourses.includes(d.courseId));
        }

        // Fetch Active Polls
        const pollsSnapshot = await db.collection('polls').where('isActive', '==', true).get();
        let polls = pollsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Fetch Announcements
        const announcementsSnapshot = await db.collection('announcements').get();
        let announcements = announcementsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

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

router.get('/polls/active', async (req, res) => {
    try {
        const snapshot = await db.collection('polls').where('isActive', '==', true).get();
        const polls = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json(polls);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/polls/:id/vote', optionalAuth, async (req, res) => {
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
        const options = pollData.options.map(opt => {
            if (opt.id === optionId) {
                return { ...opt, votes: (opt.votes || 0) + 1 };
            }
            return opt;
        });

        await pollRef.update({
            options,
            totalVotes: (pollData.totalVotes || 0) + 1
        });

        // Record response
        await db.collection('poll_responses').add({
            pollId: id,
            optionId,
            userId: req.user ? req.user.id : 'anonymous',
            votedAt: new Date().toISOString()
        });

        res.json({ message: 'Vote recorded', options, totalVotes: (pollData.totalVotes || 0) + 1 });
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

router.get('/deadlines', async (req, res) => {
    try {
        const snapshot = await db.collection('deadlines').get();
        const deadlines = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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

    try {
        const newDeadline = {
            title,
            courseId: courseId || 'all',
            weekId: weekId || '',
            dueDate,
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

router.get('/announcements', async (req, res) => {
    try {
        const snapshot = await db.collection('announcements').get();
        const announcements = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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

router.get('/courses', async (req, res) => {
    try {
        const courses = await getCollection('courses', null, null, 'title');
        res.json(courses);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/courses', async (req, res) => {
    const { title, code } = req.body;
    try {
        const docRef = await db.collection('courses').add({ title, code });
        res.status(201).json({ id: docRef.id, title, code });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/courses/:courseId/weeks', async (req, res) => {
    const { courseId } = req.params;
    try {
        let weeks = await getCollection('weeks', 'courseId', courseId, 'number', 'asc');
        if (weeks.length === 0 && !isNaN(courseId)) {
            weeks = await getCollection('weeks', 'courseId', Number(courseId), 'number', 'asc');
        }
        res.json(weeks);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/courses/:courseId/weeks', async (req, res) => {
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
            logAudit({ actorId: 'ADMIN', actorRole: 'ADMIN', action: 'WEEK_PUBLISHED', details: `Published ${weekName} for course ${courseId}` });
        } catch (pushErr) {
            console.warn('Auto push notification warning:', pushErr.message);
        }

        res.status(201).json({ id: docRef.id, courseId, title, number });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/weeks/:weekId/answers', async (req, res) => {
    const { weekId } = req.params;
    try {
        let answers = await getCollection('answers', 'weekId', weekId, 'questionNo', 'asc');
        if (answers.length === 0 && !isNaN(weekId)) {
            answers = await getCollection('answers', 'weekId', Number(weekId), 'questionNo', 'asc');
        }
        res.json(answers);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/weeks/:weekId/answers', async (req, res) => {
    const { weekId } = req.params;
    const { questionNo, text } = req.body;
    try {
        const docRef = await db.collection('answers').add({
            weekId: weekId,
            questionNo: Number(questionNo),
            text
        });
        res.status(201).json({ id: docRef.id, weekId, questionNo, text });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const deleteRecursive = async (collection, id) => {
    await db.collection(collection).doc(id).delete();
};

router.delete('/courses/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await deleteRecursive('courses', id);
        res.json({ message: 'Course deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/weeks/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await deleteRecursive('weeks', id);
        res.json({ message: 'Week deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/answers/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await deleteRecursive('answers', id);
        res.json({ message: 'Answer deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
