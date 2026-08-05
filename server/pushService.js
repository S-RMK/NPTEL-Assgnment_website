const webpush = require('web-push');
const db = require('./db');

// VAPID keys configuration
const vapidKeys = {
    publicKey: process.env.VAPID_PUBLIC_KEY || 'BEl62iUYgUivxIkv69yViEuiBIa1Fw8e5NUp8xW9aXwXW4d5p2p2kY5r-5r5r5r5r5r5r5r5r5r5r5r5r5r5r5r',
    privateKey: process.env.VAPID_PRIVATE_KEY || '3K5r5r5r5r5r5r5r5r5r5r5r5r5r5r5r5r5r5r5r5r5'
};

// Generate fresh VAPID keys if defaults are fallback placeholder
try {
    const keys = webpush.generateVAPIDKeys();
    if (!process.env.VAPID_PUBLIC_KEY) {
        vapidKeys.publicKey = keys.publicKey;
        vapidKeys.privateKey = keys.privateKey;
    }
} catch (e) {
    console.warn('VAPID key generator warning:', e.message);
}

webpush.setVapidDetails(
    'mailto:admin@nptel-answers.org',
    vapidKeys.publicKey,
    vapidKeys.privateKey
);

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
const sendPushNotification = async ({ title, body, icon = '/icons/icon-192x192.png', image, targetUrl = '/', courseId = 'all' }) => {
    if (!db) return { success: 0, failed: 0 };

    let query = db.collection('notification_subscriptions');
    const snapshot = await query.get();
    let subs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Filter by course subscription if courseId is specified and not 'all'
    if (courseId && courseId !== 'all') {
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
        data: { url: targetUrl }
    });

    let success = 0;
    let failed = 0;

    for (const subDoc of subs) {
        try {
            await webpush.sendNotification(subDoc.subscription, payload);
            success++;
        } catch (err) {
            failed++;
            // If subscription is expired/invalid (410, 404), clean up
            if (err.statusCode === 410 || err.statusCode === 404) {
                try {
                    await db.collection('notification_subscriptions').doc(subDoc.id).delete();
                } catch (e) {
                    // Ignore deletion error
                }
            }
        }
    }

    return { success, failed, total: subs.length };
};

module.exports = {
    vapidPublicKey: vapidKeys.publicKey,
    saveSubscription,
    sendPushNotification
};
