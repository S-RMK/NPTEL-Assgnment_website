const webpush = require('web-push');
const db = require('./db');

const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@nptel-answers.org';

/*
 * VAPID keys identify this server to the browser's push service. A subscription is
 * bound to the public key it was created with, so the pair MUST stay stable: the
 * previous implementation called generateVAPIDKeys() on every module load, which
 * silently invalidated every stored subscription on each restart — and on Vercel,
 * where each cold start is a fresh process, meant push could never work at all.
 *
 * Resolution order: environment variables, then a pair persisted in Firestore,
 * then generate once and persist it.
 */
let cachedKeys = null;
let keyPromise = null;

const resolveKeys = async () => {
    if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
        return { keys: {
            publicKey: process.env.VAPID_PUBLIC_KEY,
            privateKey: process.env.VAPID_PRIVATE_KEY
        }, source: 'environment' };
    }

    if (!db) {
        throw new Error('Push is unavailable: no VAPID env vars and no database to persist a key pair.');
    }

    const ref = db.collection('config').doc('vapid');
    const doc = await ref.get();

    if (doc.exists && doc.data().publicKey && doc.data().privateKey) {
        return { keys: doc.data(), source: 'firestore' };
    }

    const generated = webpush.generateVAPIDKeys();
    await ref.set({ ...generated, createdAt: new Date().toISOString() });
    return { keys: generated, source: 'generated+persisted' };
};

const getVapidKeys = async () => {
    if (cachedKeys) return cachedKeys;
    if (!keyPromise) {
        keyPromise = resolveKeys()
            .then(({ keys, source }) => {
                webpush.setVapidDetails(VAPID_SUBJECT, keys.publicKey, keys.privateKey);
                cachedKeys = keys;
                console.log(`Push: VAPID keys loaded from ${source}`);
                return keys;
            })
            .catch((err) => {
                keyPromise = null; // allow a later request to retry
                throw err;
            });
    }
    return keyPromise;
};

const getVapidPublicKey = async () => (await getVapidKeys()).publicKey;

/**
 * Save or update push subscription for a user
 */
const saveSubscription = async (userId, subscription, courseIds = ['all']) => {
    if (!db) return;
    const existing = await db.collection('notification_subscriptions')
        .where('endpoint', '==', subscription.endpoint)
        .get();

    if (!existing.empty) {
        // Update existing subscription
        const docRef = existing.docs[0].ref;
        await docRef.update({
            userId: userId || 'anonymous',
            courseSubscriptions: courseIds,
            subscription,
            updatedAt: new Date().toISOString()
        });
        return docRef.id;
    } else {
        // Create new
        const docRef = await db.collection('notification_subscriptions').add({
            userId: userId || 'anonymous',
            subscription,
            endpoint: subscription.endpoint,
            courseSubscriptions: courseIds,
            subscribedAt: new Date().toISOString()
        });
        return docRef.id;
    }
};

/**
 * Send push notification to target audience (subscribers of courseId or all)
 */
const sendPushNotification = async ({ title, body, icon = '/icons/icon-192x192.png', image, targetUrl = '/', courseId = 'all', tag, userIds }) => {
    if (!db) return { success: 0, failed: 0, total: 0 };

    // Ensures webpush.setVapidDetails has run before the first send.
    await getVapidKeys();

    const snapshot = await db.collection('notification_subscriptions').get();
    let subs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    if (Array.isArray(userIds)) {
        // Targeted send (e.g. only students who haven't answered a poll). Takes
        // precedence over course filtering — the caller has already picked the audience.
        const wanted = new Set(userIds);
        subs = subs.filter((s) => wanted.has(s.userId));
    } else if (courseId && courseId !== 'all') {
        subs = subs.filter(s =>
            !s.courseSubscriptions ||
            s.courseSubscriptions.includes('all') ||
            s.courseSubscriptions.includes(courseId)
        );
    }

    const payload = JSON.stringify({
        title,
        body,
        icon,
        image,
        tag,
        data: { url: targetUrl }
    });

    let success = 0;
    let failed = 0;
    const errors = [];

    for (const subDoc of subs) {
        try {
            await webpush.sendNotification(subDoc.subscription, payload);
            success++;
        } catch (err) {
            failed++;
            // 410/404 mean the browser dropped the subscription; 403 means it was created
            // with a different VAPID key. Both are permanently dead — remove them so the
            // subscriber list doesn't fill up with endpoints that can never receive again.
            if ([410, 404, 403].includes(err.statusCode)) {
                try {
                    await db.collection('notification_subscriptions').doc(subDoc.id).delete();
                } catch (e) {
                    // Ignore deletion error
                }
            }
            if (errors.length < 3) errors.push(`${err.statusCode || '?'}: ${err.body || err.message}`);
        }
    }

    return { success, failed, total: subs.length, errors };
};

module.exports = {
    getVapidKeys,
    getVapidPublicKey,
    saveSubscription,
    sendPushNotification
};
