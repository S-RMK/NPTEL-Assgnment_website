const cron = require('node-cron');
const db = require('./db');
const { sendPushNotification } = require('./pushService');

/**
 * Initialize deadline reminder CRON engine
 * Runs every 15 minutes to check upcoming deadlines and dispatch push alerts.
 */
const initScheduler = () => {
    cron.schedule('*/15 * * * *', async () => {
        console.log('[Scheduler] Running deadline reminder check...');
        if (!db) return;

        try {
            const now = new Date();
            const snapshot = await db.collection('deadlines').get();

            for (const doc of snapshot.docs) {
                const deadline = { id: doc.id, ...doc.data() };
                if (!deadline.dueDate) continue;

                const due = new Date(deadline.dueDate);
                const diffMs = due - now;
                const diffHours = diffMs / (1000 * 60 * 60);

                const reminderSent = deadline.reminderSent || {};

                // 24 Hours Reminder
                if (diffHours > 23 && diffHours <= 24 && !reminderSent['24h']) {
                    await sendPushNotification({
                        title: `⏰ Deadline Tomorrow: ${deadline.title}`,
                        body: `Submission deadline is in 24 hours. Check your answers!`,
                        targetUrl: deadline.weekId ? `/week/${deadline.weekId}` : '/',
                        courseId: deadline.courseId
                    });
                    await doc.ref.update({ 'reminderSent.24h': true });
                    console.log(`[Scheduler] Sent 24h reminder for ${deadline.title}`);
                }

                // 12 Hours Reminder
                if (diffHours > 11 && diffHours <= 12 && !reminderSent['12h']) {
                    await sendPushNotification({
                        title: `⏰ 12 Hours Left: ${deadline.title}`,
                        body: `Only 12 hours left until deadline!`,
                        targetUrl: deadline.weekId ? `/week/${deadline.weekId}` : '/',
                        courseId: deadline.courseId
                    });
                    await doc.ref.update({ 'reminderSent.12h': true });
                    console.log(`[Scheduler] Sent 12h reminder for ${deadline.title}`);
                }

                // 1 Hour Reminder
                if (diffHours > 0.5 && diffHours <= 1 && !reminderSent['1h']) {
                    await sendPushNotification({
                        title: `🚨 Final Hour Alert: ${deadline.title}`,
                        body: `Deadline expires in 1 hour! Submit now.`,
                        targetUrl: deadline.weekId ? `/week/${deadline.weekId}` : '/',
                        courseId: deadline.courseId
                    });
                    await doc.ref.update({ 'reminderSent.1h': true });
                    console.log(`[Scheduler] Sent 1h reminder for ${deadline.title}`);
                }
            }
        } catch (err) {
            console.error('[Scheduler] Error processing deadline reminders:', err.message);
        }
    });

    console.log('[Scheduler] Deadline reminder engine initialized.');
};

module.exports = { initScheduler };
